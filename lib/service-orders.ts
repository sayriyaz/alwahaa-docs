import { supabase } from '@/lib/supabase'

export type ServiceOrderInsert = {
  invoice_id: string
  description: string
  amount: number
}

export type ServiceOrderRecord = {
  id: string
  invoice_id: string
  description: string
  amount: number | null
}

export type ServiceOrderMutation = {
  id?: string | null
  invoice_id: string
  description: string
  amount: number
}

type SupabaseErrorLike = {
  code?: string | null
}

function isMissingTable(error: SupabaseErrorLike | null) {
  return error?.code === 'PGRST205'
}

type QueryClient = Pick<typeof supabase, 'from'>

async function selectServiceOrdersFromTable(
  invoiceId: string,
  table: 'service_orders' | 'invoice_lines',
  queryClient: QueryClient
) {
  return queryClient
    .from(table)
    .select('id, invoice_id, description, amount')
    .eq('invoice_id', invoiceId)
}

async function selectServiceOrdersByInvoiceIdsFromTable(
  invoiceIds: string[],
  table: 'service_orders' | 'invoice_lines',
  queryClient: QueryClient
) {
  return queryClient
    .from(table)
    .select('id, invoice_id, description, amount')
    .in('invoice_id', invoiceIds)
}

export async function selectServiceOrders(invoiceId: string, queryClient: QueryClient = supabase) {
  const primaryResult = await selectServiceOrdersFromTable(invoiceId, 'service_orders', queryClient)

  if (!primaryResult.error || !isMissingTable(primaryResult.error)) {
    return primaryResult
  }

  return selectServiceOrdersFromTable(invoiceId, 'invoice_lines', queryClient)
}

export async function selectServiceOrdersByInvoiceIds(
  invoiceIds: string[],
  queryClient: QueryClient = supabase
) {
  if (invoiceIds.length === 0) {
    return {
      data: [] as ServiceOrderRecord[],
      error: null,
    }
  }

  const primaryResult = await selectServiceOrdersByInvoiceIdsFromTable(
    invoiceIds,
    'service_orders',
    queryClient
  )

  if (!primaryResult.error || !isMissingTable(primaryResult.error)) {
    return primaryResult
  }

  return selectServiceOrdersByInvoiceIdsFromTable(invoiceIds, 'invoice_lines', queryClient)
}

export async function insertServiceOrders(serviceOrders: ServiceOrderInsert[], queryClient: QueryClient = supabase) {
  const primaryResult = await queryClient.from('service_orders').insert(serviceOrders)

  if (!primaryResult.error || !isMissingTable(primaryResult.error)) {
    return primaryResult
  }

  return queryClient.from('invoice_lines').insert(serviceOrders)
}

export async function replaceServiceOrders(invoiceId: string, serviceOrders: ServiceOrderInsert[], queryClient: QueryClient = supabase) {
  const primaryDeleteResult = await queryClient
    .from('service_orders')
    .delete()
    .eq('invoice_id', invoiceId)

  if (!primaryDeleteResult.error || !isMissingTable(primaryDeleteResult.error)) {
    if (primaryDeleteResult.error || serviceOrders.length === 0) {
      return primaryDeleteResult
    }

    return queryClient.from('service_orders').insert(serviceOrders)
  }

  const legacyDeleteResult = await queryClient
    .from('invoice_lines')
    .delete()
    .eq('invoice_id', invoiceId)

  if (legacyDeleteResult.error || serviceOrders.length === 0) {
    return legacyDeleteResult
  }

  return queryClient.from('invoice_lines').insert(serviceOrders)
}

async function syncServiceOrdersInTable(
  table: 'service_orders' | 'invoice_lines',
  invoiceId: string,
  serviceOrders: ServiceOrderMutation[],
  options: { allowDelete?: boolean },
  queryClient: QueryClient
) {
  const { data: existingRows, error: selectError } = await queryClient
    .from(table)
    .select('id')
    .eq('invoice_id', invoiceId)

  if (selectError) {
    return { error: selectError }
  }

  const existingIds = new Set(
    ((existingRows ?? []) as Array<{ id: string | null }>).map((row) => row.id).filter(Boolean) as string[]
  )
  const keptIds = new Set<string>()

  for (const serviceOrder of serviceOrders) {
    const payload = {
      invoice_id: invoiceId,
      description: serviceOrder.description,
      amount: serviceOrder.amount,
    }

    if (serviceOrder.id && existingIds.has(serviceOrder.id)) {
      keptIds.add(serviceOrder.id)

      const { error } = await queryClient
        .from(table)
        .update(payload)
        .eq('id', serviceOrder.id)

      if (error) {
        return { error }
      }

      continue
    }

    const { error } = await queryClient.from(table).insert(payload)

    if (error) {
      return { error }
    }
  }

  if (!options.allowDelete) {
    return { error: null }
  }

  for (const existingId of existingIds) {
    if (keptIds.has(existingId)) {
      continue
    }

    const { error } = await queryClient
      .from(table)
      .delete()
      .eq('id', existingId)

    if (error) {
      return { error }
    }
  }

  return { error: null }
}

export async function syncServiceOrders(
  invoiceId: string,
  serviceOrders: ServiceOrderMutation[],
  options: { allowDelete?: boolean } = {},
  queryClient: QueryClient = supabase
) {
  const primaryResult = await syncServiceOrdersInTable('service_orders', invoiceId, serviceOrders, options, queryClient)

  if (!primaryResult.error || !isMissingTable(primaryResult.error)) {
    return primaryResult
  }

  return syncServiceOrdersInTable('invoice_lines', invoiceId, serviceOrders, options, queryClient)
}
