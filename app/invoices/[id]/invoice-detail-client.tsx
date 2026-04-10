'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateInvoiceTotalAmount, calculateServiceSubtotal, calculateVatAmount } from '@/lib/invoice-calculations'
import type { AppPermissions } from '@/lib/auth-constants'
import { saveInvoiceTask, syncInvoiceTasksFromServiceOrders } from '@/lib/invoice-tasks'
import { selectServiceOrders, syncServiceOrders } from '@/lib/service-orders'
import type { AssignableUser } from '@/lib/app-users'

export type Invoice = {
  id: string
  client_id: string | null
  invoice_no: string
  date: string | null
  beneficiary_name: string | null
  assigned_to: string | null
  processing_fee: number | null
  vat_amount: number | null
  total_amount: number | null
  status: string | null
  notes: string | null
}

export type ClientDetails = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
}

export type ClientOption = ClientDetails

export type ServiceOrder = {
  id?: string | null
  invoice_id?: string | null
  description: string
  amount: number | null
}

export type InvoiceTask = {
  id: string
  invoice_id: string
  service_order_id: string | null
  dept: string | null
  particulars: string | null
  assigned_to: string | null
  charged: number | null
  paid: number | null
  payment_mode: string | null
  ref_no: string | null
  status: string | null
  notes: string | null
  task_date: string | null
  created_at: string | null
}

export type InvoiceReceipt = {
  id: string
  invoice_id: string
  receipt_no: string | null
  amount: number | null
  payment_mode: string | null
  date: string | null
  notes: string | null
  created_at: string | null
}

type InvoiceForm = {
  client_id: string
  invoice_no: string
  date: string
  beneficiary_name: string
  assigned_to: string
  processing_fee: string
  notes: string
}

type ServiceOrderFormLine = {
  id: string | null
  description: string
  amount: string
}

type TaskForm = {
  dept: string
  particulars: string
  assigned_to: string
  task_date: string
  charged: string
  paid: string
  payment_mode: string
  ref_no: string
  notes: string
}

type ReceiptForm = {
  receipt_no: string
  amount: string
  payment_mode: string
  date: string
  notes: string
}

type SupabaseErrorLike = {
  message?: string
  details?: string | null
  hint?: string | null
}

const EMPTY_TASK: TaskForm = {
  dept: '',
  particulars: '',
  assigned_to: '',
  task_date: '',
  charged: '',
  paid: '',
  payment_mode: '',
  ref_no: '',
  notes: '',
}

const EMPTY_RECEIPT: ReceiptForm = {
  receipt_no: '',
  amount: '',
  payment_mode: '',
  date: '',
  notes: '',
}

const DEPT_PAYMENT_MODE: Record<string, string> = {
  MOHRE: 'RAK Debit',
  GDRFA: 'Noqodi',
  AMER: 'Online',
  DUBINS: 'RAK Debit',
  ILOE: 'RAK Debit',
  MEDICAL: 'Online',
  ICP: 'Online',
  NOTARY: 'RAK Debit',
  DET: 'RAK Debit',
  OTHER: 'Cash',
}

const DEPARTMENTS = ['MOHRE', 'GDRFA', 'AMER', 'DUBINS', 'ILOE', 'MEDICAL', 'ICP', 'NOTARY', 'DET', 'OTHER']
const VENDOR_PAYMENT_MODES = ['RAK Debit', 'Noqodi', 'Online', 'Cash', 'Cheque']
const CLIENT_PAYMENT_MODES = ['Bank Transfer', 'Cash', 'Card (POS)', 'Cash Deposit ATM', 'Cheque']
const INVOICE_STATUSES = ['Pending', 'Active', 'Partial', 'Completed', 'Cancelled']
const TASK_STATUSES = ['Pending', 'On Account', 'Paid', 'Done']

function getInvoiceStatusLabel(status: string | null) {
  if (status === 'Draft' || status === 'Pending') {
    return 'Pending'
  }

  return status || 'Pending'
}

function formatCurrency(amount: number | null) {
  return `AED ${(amount ?? 0).toFixed(2)}`
}

function getStatusClasses(status: string | null) {
  switch (getInvoiceStatusLabel(status)) {
    case 'Pending':
      return 'bg-gray-100 text-gray-600'
    case 'Active':
      return 'bg-blue-100 text-blue-700'
    case 'Partial':
      return 'bg-yellow-100 text-yellow-700'
    case 'Completed':
      return 'bg-green-100 text-green-700'
    case 'Cancelled':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function formatSupabaseError(error: SupabaseErrorLike | null, fallbackMessage: string) {
  if (!error) {
    return fallbackMessage
  }

  const extra = [error.details, error.hint].filter(Boolean).join(' ')
  return extra ? `${error.message ?? fallbackMessage} ${extra}` : (error.message ?? fallbackMessage)
}

function sortReceipts(receipts: InvoiceReceipt[]) {
  return [...receipts].sort((left, right) => (left.date ?? '').localeCompare(right.date ?? ''))
}

function sortTasks(tasks: InvoiceTask[]) {
  return [...tasks].sort((left, right) => {
    const leftValue = left.task_date ?? left.created_at ?? ''
    const rightValue = right.task_date ?? right.created_at ?? ''
    return leftValue.localeCompare(rightValue)
  })
}

function getTodayDateValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60_000))
  return localTime.toISOString().slice(0, 10)
}

function buildInvoiceForm(currentInvoice: Invoice): InvoiceForm {
  return {
    client_id: currentInvoice.client_id ?? '',
    invoice_no: currentInvoice.invoice_no,
    date: currentInvoice.date ?? '',
    beneficiary_name: currentInvoice.beneficiary_name ?? '',
    assigned_to: currentInvoice.assigned_to ?? '',
    processing_fee: currentInvoice.processing_fee?.toString() ?? '0',
    notes: currentInvoice.notes ?? '',
  }
}

function buildServiceOrderFormLines(currentServiceOrders: ServiceOrder[]): ServiceOrderFormLine[] {
  if (currentServiceOrders.length === 0) {
    return [{ id: null, description: '', amount: '' }]
  }

  return currentServiceOrders.map((currentServiceOrder) => ({
    id: currentServiceOrder.id ?? null,
    description: currentServiceOrder.description,
    amount: currentServiceOrder.amount?.toString() ?? '',
  }))
}

function buildTaskForm(currentTask: InvoiceTask): TaskForm {
  return {
    dept: currentTask.dept ?? '',
    particulars: currentTask.particulars ?? '',
    assigned_to: currentTask.assigned_to ?? '',
    task_date: currentTask.task_date ?? '',
    charged: currentTask.charged?.toString() ?? '',
    paid: currentTask.paid?.toString() ?? '',
    payment_mode: currentTask.payment_mode ?? '',
    ref_no: currentTask.ref_no ?? '',
    notes: currentTask.notes ?? '',
  }
}

function buildReceiptForm(currentReceipt: InvoiceReceipt): ReceiptForm {
  return {
    receipt_no: currentReceipt.receipt_no ?? '',
    amount: currentReceipt.amount?.toString() ?? '',
    payment_mode: currentReceipt.payment_mode ?? '',
    date: currentReceipt.date ?? '',
    notes: currentReceipt.notes ?? '',
  }
}

export default function InvoiceDetailClient({
  invoice: initialInvoice,
  client,
  clients,
  serviceOrders: initialServiceOrders,
  tasks: initialTasks,
  receipts: initialReceipts,
  permissions,
  roleLabel,
  assignableUsers,
}: {
  invoice: Invoice
  client: ClientDetails | null
  clients: ClientOption[]
  serviceOrders: ServiceOrder[]
  tasks: InvoiceTask[]
  receipts: InvoiceReceipt[]
  permissions: AppPermissions
  roleLabel: string
  assignableUsers: AssignableUser[]
}) {
  const [invoice, setInvoice] = useState(initialInvoice)
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(initialServiceOrders)
  const [tasks, setTasks] = useState<InvoiceTask[]>(() => sortTasks(initialTasks))
  const [receipts, setReceipts] = useState<InvoiceReceipt[]>(() => sortReceipts(initialReceipts))
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null)
  const [invoiceSaving, setInvoiceSaving] = useState(false)
  const [taskSaving, setTaskSaving] = useState(false)
  const [receiptSaving, setReceiptSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(() => buildInvoiceForm(initialInvoice))
  const [serviceOrderFormLines, setServiceOrderFormLines] = useState<ServiceOrderFormLine[]>(() => buildServiceOrderFormLines(initialServiceOrders))
  const [task, setTask] = useState<TaskForm>(EMPTY_TASK)
  const [receipt, setReceipt] = useState<ReceiptForm>(EMPTY_RECEIPT)
  const [pageError, setPageError] = useState('')
  const clientLookup = new Map(clients.map((currentClient) => [currentClient.id, currentClient] as const))
  const currentClient = (invoice.client_id ? clientLookup.get(invoice.client_id) ?? null : null) ?? client
  const invoiceDraftServiceSubtotal = calculateServiceSubtotal(
    serviceOrderFormLines.map((currentLine) => ({ amount: parseFloat(currentLine.amount) || 0 }))
  )
  const draftProcessingFee = permissions.canEditInvoiceDetails
    ? (parseFloat(invoiceForm.processing_fee) || 0)
    : (invoice.processing_fee ?? 0)
  const effectiveVatAmount = calculateVatAmount(invoice.processing_fee)
  const effectiveTotalAmount = calculateInvoiceTotalAmount(serviceOrders, invoice.processing_fee)
  const canOpenInvoiceEditor = permissions.canEditInvoiceDetails || permissions.canManageServiceOrders

  function openInvoiceForm() {
    setInvoiceForm(buildInvoiceForm(invoice))
    setServiceOrderFormLines(buildServiceOrderFormLines(serviceOrders))
    setShowInvoiceForm(true)
  }

  function cancelInvoiceForm() {
    setInvoiceForm(buildInvoiceForm(invoice))
    setServiceOrderFormLines(buildServiceOrderFormLines(serviceOrders))
    setShowInvoiceForm(false)
  }

  function updateServiceOrderLine(index: number, field: keyof ServiceOrderFormLine, value: string) {
    setServiceOrderFormLines((currentLines) =>
      currentLines.map((currentLine, currentIndex) =>
        currentIndex === index ? { ...currentLine, [field]: value } : currentLine
      )
    )
  }

  function addServiceOrderLine() {
    setServiceOrderFormLines((currentLines) => [...currentLines, { id: null, description: '', amount: '' }])
  }

  function removeServiceOrderLine(index: number) {
    setServiceOrderFormLines((currentLines) => {
      const lineToRemove = currentLines[index]

      if (lineToRemove?.id && !permissions.canDeleteServiceOrders) {
        alert('Only admins can remove saved service lines.')
        return currentLines
      }

      if (currentLines.length === 1) {
        return [{ id: null, description: '', amount: '' }]
      }

      return currentLines.filter((_, currentIndex) => currentIndex !== index)
    })
  }

  async function saveInvoiceDetails() {
    if (!permissions.canEditInvoiceDetails && !permissions.canManageServiceOrders) {
      return
    }

    if (permissions.canEditInvoiceDetails && !invoiceForm.client_id) {
      alert('Please select a client.')
      return
    }

    if (permissions.canEditInvoiceDetails && !invoiceForm.invoice_no.trim()) {
      alert('Invoice number is required.')
      return
    }

    setInvoiceSaving(true)
    setPageError('')

    const invalidLine = serviceOrderFormLines.find((currentLine) => {
      const hasDescription = currentLine.description.trim().length > 0
      const hasAmount = currentLine.amount.trim().length > 0
      if (currentLine.id && !permissions.canDeleteServiceOrders && !hasDescription && !hasAmount) {
        return true
      }
      return hasDescription !== hasAmount
    })

    if (invalidLine) {
      setInvoiceSaving(false)
      alert(
        permissions.canDeleteServiceOrders
          ? 'Complete both description and amount for each service order, or remove the incomplete line.'
          : 'Complete both description and amount for each service order. Saved lines can only be removed by an admin.'
      )
      return
    }

    const normalizedServiceOrders = serviceOrderFormLines
      .map((currentLine) => ({
        id: currentLine.id,
        description: currentLine.description.trim(),
        amount: parseFloat(currentLine.amount) || 0,
      }))
      .filter((currentLine) => currentLine.description.length > 0)

    if (normalizedServiceOrders.length === 0) {
      setInvoiceSaving(false)
      alert('Add at least one service order line.')
      return
    }

    const processingFee = permissions.canEditInvoiceDetails
      ? (parseFloat(invoiceForm.processing_fee) || 0)
      : (invoice.processing_fee ?? 0)
    const vatAmount = calculateVatAmount(processingFee)
    const totalAmount = calculateInvoiceTotalAmount(normalizedServiceOrders, processingFee)

    const serviceOrderResult = await syncServiceOrders(
      invoice.id,
      normalizedServiceOrders.map((currentLine) => ({
        id: currentLine.id,
        invoice_id: invoice.id,
        description: currentLine.description,
        amount: currentLine.amount,
      })),
      { allowDelete: permissions.canDeleteServiceOrders },
      supabase
    )

    if (serviceOrderResult.error) {
      setInvoiceSaving(false)
      setPageError(formatSupabaseError(serviceOrderResult.error, 'Unable to update the service order lines right now.'))
      return
    }

    const refreshedServiceOrders = await selectServiceOrders(invoice.id, supabase)
    const nextServiceOrders = ((refreshedServiceOrders.data ?? normalizedServiceOrders) as ServiceOrder[]).map((currentLine) => ({
      id: currentLine.id ?? null,
      invoice_id: currentLine.invoice_id ?? invoice.id,
      description: currentLine.description,
      amount: currentLine.amount,
    }))
    const linkedServiceOrders = nextServiceOrders.flatMap((currentLine) =>
      typeof currentLine.id === 'string'
        ? [{
            id: currentLine.id,
            invoice_id: currentLine.invoice_id ?? invoice.id,
            description: currentLine.description,
            amount: currentLine.amount,
          }]
        : []
    )
    const taskSyncResult = await syncInvoiceTasksFromServiceOrders(
      invoice.id,
      linkedServiceOrders,
      supabase
    )

    if (permissions.canEditInvoiceDetails) {
      const payload = {
        client_id: invoiceForm.client_id,
        invoice_no: invoiceForm.invoice_no.trim(),
        date: invoiceForm.date || getTodayDateValue(),
        beneficiary_name: invoiceForm.beneficiary_name.trim() || null,
        assigned_to: invoiceForm.assigned_to || null,
        processing_fee: processingFee,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        notes: invoiceForm.notes.trim() || null,
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(payload)
        .eq('id', invoice.id)
        .select('id, client_id, invoice_no, date, beneficiary_name, assigned_to, processing_fee, vat_amount, total_amount, status, notes')
        .single()

      setInvoiceSaving(false)

      if (error || !data) {
        setServiceOrders(nextServiceOrders)
        if (taskSyncResult.data) {
          setTasks(sortTasks(taskSyncResult.data as InvoiceTask[]))
        }
        setPageError(formatSupabaseError(error, 'Service order lines may have been updated, but the invoice totals could not be saved. Please try again.'))
        return
      }

      setInvoice(data as Invoice)
    } else {
      setInvoiceSaving(false)
      setInvoice((currentInvoice) => ({
        ...currentInvoice,
        vat_amount: calculateVatAmount(currentInvoice.processing_fee),
        total_amount: calculateInvoiceTotalAmount(nextServiceOrders, currentInvoice.processing_fee),
      }))
    }

    setServiceOrders(nextServiceOrders)
    if (taskSyncResult.data) {
      setTasks(sortTasks(taskSyncResult.data as InvoiceTask[]))
    }
    setServiceOrderFormLines(buildServiceOrderFormLines(nextServiceOrders))
    setShowInvoiceForm(false)

    if (taskSyncResult.error) {
      setPageError(formatSupabaseError(taskSyncResult.error, 'Invoice saved, but tasks could not be synced automatically.'))
    }
  }

  async function updateInvoiceStatus(status: string) {
    if (!permissions.canManageInvoiceStatus) {
      return
    }

    setStatusSaving(true)
    setPageError('')

    const { error } = await supabase.from('invoices').update({ status }).eq('id', invoice.id)

    setStatusSaving(false)

    if (error) {
      setPageError(formatSupabaseError(error, 'Unable to update invoice status right now.'))
      return
    }

    setInvoice((currentInvoice) => ({ ...currentInvoice, status }))
  }

  function cancelTaskForm() {
    setEditingTaskId(null)
    setTask(EMPTY_TASK)
    setShowTaskForm(false)
  }

  function openNewTaskForm() {
    setEditingTaskId(null)
    setTask(EMPTY_TASK)
    setShowTaskForm(true)
  }

  function startTaskEdit(currentTask: InvoiceTask) {
    setEditingTaskId(currentTask.id)
    setTask(buildTaskForm(currentTask))
    setShowTaskForm(true)
  }

  function handleDeptChange(value: string) {
    setTask((currentTask) => ({
      ...currentTask,
      dept: value,
      payment_mode: currentTask.payment_mode || DEPT_PAYMENT_MODE[value] || '',
    }))
  }

  function openNewReceiptForm(overrides?: Partial<ReceiptForm>) {
    setEditingReceiptId(null)
    setReceipt({
      ...EMPTY_RECEIPT,
      date: getTodayDateValue(),
      ...overrides,
    })
    setShowReceiptForm(true)
  }

  function cancelReceiptForm() {
    setEditingReceiptId(null)
    setReceipt(EMPTY_RECEIPT)
    setShowReceiptForm(false)
  }

  function startReceiptEdit(currentReceipt: InvoiceReceipt) {
    setEditingReceiptId(currentReceipt.id)
    setReceipt(buildReceiptForm(currentReceipt))
    setShowReceiptForm(true)
  }

  async function addTask() {
    if (!permissions.canManageTasks) {
      return
    }

    setTaskSaving(true)
    setPageError('')

    try {
      const currentTask = editingTaskId
        ? tasks.find((currentTaskRow) => currentTaskRow.id === editingTaskId)
        : null

      if (editingTaskId && !currentTask) {
        setPageError('Unable to find the selected task right now.')
        return
      }

      const particulars = currentTask?.service_order_id
        ? task.particulars.trim()
        : task.particulars.trim()
      const charged = currentTask?.service_order_id
        ? (parseFloat(task.charged) || 0)
        : (parseFloat(task.charged) || 0)

      if (!particulars) {
        alert('Task particulars are required.')
        return
      }

      const taskPayload = {
        invoice_id: invoice.id,
        service_order_id: currentTask?.service_order_id ?? null,
        dept: task.dept,
        particulars,
        assigned_to: task.assigned_to || null,
        task_date: task.task_date || null,
        charged,
        paid: parseFloat(task.paid) || 0,
        payment_mode: task.payment_mode || null,
        ref_no: task.ref_no || null,
        notes: task.notes || null,
      }

      const { data, error } = await saveInvoiceTask(taskPayload, supabase, editingTaskId)

      if (error || !data) {
        setPageError(formatSupabaseError(error, 'Unable to save the task right now.'))
        return
      }

      setTasks((currentTasks) =>
        sortTasks(
          editingTaskId
            ? currentTasks.map((currentTaskRow) => currentTaskRow.id === editingTaskId ? (data as InvoiceTask) : currentTaskRow)
            : [...currentTasks, data as InvoiceTask]
        )
      )
      cancelTaskForm()
    } catch {
      setPageError('Unable to save the task right now.')
    } finally {
      setTaskSaving(false)
    }
  }

  async function addReceipt() {
    if (!permissions.canManageReceipts) {
      return
    }

    if (!receipt.amount || !receipt.payment_mode) {
      alert('Amount and payment mode are required.')
      return
    }

    setReceiptSaving(true)
    setPageError('')

    try {
      const receiptDate = receipt.date || getTodayDateValue()
      const amount = parseFloat(receipt.amount) || 0

      const receiptPayload = {
        invoice_id: invoice.id,
        receipt_no: receipt.receipt_no || null,
        amount,
        payment_mode: receipt.payment_mode,
        date: receiptDate,
        notes: receipt.notes || null,
      }

      const receiptQuery = editingReceiptId
        ? supabase
          .from('invoice_receipts')
          .update(receiptPayload)
          .eq('id', editingReceiptId)
        : supabase
          .from('invoice_receipts')
          .insert(receiptPayload)

      const { data, error } = await receiptQuery
        .select('id, invoice_id, receipt_no, amount, payment_mode, date, notes, created_at')
        .single()

      if (error || !data) {
        setPageError(formatSupabaseError(error, 'Unable to save the receipt right now.'))
        return
      }

      setReceipts((currentReceipts) =>
        sortReceipts(
          editingReceiptId
            ? currentReceipts.map((currentReceipt) => currentReceipt.id === editingReceiptId ? (data as InvoiceReceipt) : currentReceipt)
            : [...currentReceipts, data as InvoiceReceipt]
        )
      )

      if (editingReceiptId) {
        cancelReceiptForm()
        return
      }

      openNewReceiptForm({
        payment_mode: receipt.payment_mode,
        date: receiptDate,
      })
    } catch {
      setPageError('Unable to save the receipt right now.')
    } finally {
      setReceiptSaving(false)
    }
  }

  function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void addTask()
  }

  function handleInvoiceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveInvoiceDetails()
  }

  function handleReceiptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void addReceipt()
  }

  async function updateTaskStatus(taskId: string, status: string) {
    if (!permissions.canManageTasks) {
      return
    }

    setPageError('')

    const { error } = await supabase
      .from('invoice_tasks')
      .update({ status })
      .eq('id', taskId)

    if (error) {
      setPageError(formatSupabaseError(error, 'Unable to update task status right now.'))
      return
    }

    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === taskId ? { ...currentTask, status } : currentTask
      )
    )
  }

  const [taskSyncing, setTaskSyncing] = useState(false)

  async function syncTasksFromServiceOrders() {
    if (!permissions.canManageTasks) return
    setTaskSyncing(true)
    setPageError('')

    try {
      const existingParticulars = new Set(
        tasks.map((t) => (t.particulars ?? '').trim().toLowerCase())
      )
      const newTasks: InvoiceTask[] = []

      for (const so of serviceOrders) {
        const key = so.description.trim().toLowerCase()
        if (existingParticulars.has(key)) continue

        const { data, error } = await supabase
          .from('invoice_tasks')
          .insert({
            invoice_id: invoice.id,
            particulars: so.description,
            charged: so.amount ?? 0,
            paid: 0,
            status: 'Pending',
          })
          .select('id, invoice_id, service_order_id, dept, particulars, assigned_to, charged, paid, payment_mode, ref_no, status, notes, task_date, created_at')
          .single()

        if (error || !data) {
          setPageError(formatSupabaseError(error, `Unable to create task for: ${so.description}`))
          setTaskSyncing(false)
          return
        }

        newTasks.push(data as unknown as InvoiceTask)
        existingParticulars.add(key)
      }

      if (newTasks.length > 0) {
        setTasks(sortTasks([...tasks, ...newTasks]))
      } else {
        setPageError('All service orders already have tasks.')
        setTimeout(() => setPageError(''), 3000)
      }
    } catch {
      setPageError('Unable to sync tasks from service orders.')
    } finally {
      setTaskSyncing(false)
    }
  }

  const totalReceived = receipts.reduce((sum, currentReceipt) => sum + (currentReceipt.amount ?? 0), 0)
  const totalVendorPaid = tasks.reduce((sum, currentTask) => sum + (currentTask.paid ?? 0), 0)
  const totalVendorCharged = tasks.reduce((sum, currentTask) => sum + (currentTask.charged ?? 0), 0)
  const vendorOutstanding = totalVendorCharged - totalVendorPaid
  const balanceDue = effectiveTotalAmount - totalReceived
  const profit = totalReceived - totalVendorPaid
  const hasBalanceDue = balanceDue > 0
  const latestReceipt = receipts[receipts.length - 1] ?? null

  function openRemainingReceiptForm() {
    openNewReceiptForm({
      amount: balanceDue.toFixed(2),
      payment_mode: latestReceipt?.payment_mode ?? '',
      notes: 'Balance payment',
    })
  }

  const accessNotice = !permissions.canEditInvoiceDetails && !permissions.canManageReceipts
    ? permissions.canManageInvoiceStatus || permissions.canManageServiceOrders || permissions.canManageTasks
      ? permissions.canManageInvoiceStatus
        ? 'Your role can update invoice status, service orders, and tasks, but invoice details and client receipts are read only.'
        : 'Your role can update service orders and tasks, but invoice details and client receipts are read only.'
      : 'Your role is view only. You can view and print this invoice, but editing is disabled.'
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Back to invoices</Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Invoice {invoice.invoice_no}</h1>
              <p className="text-sm text-gray-500">
                {currentClient?.name ?? 'Unknown client'}
                {invoice.beneficiary_name ? ` · ${invoice.beneficiary_name}` : ''}
                {!accessNotice ? '' : ` · ${roleLabel} access`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canOpenInvoiceEditor ? (
              <button
                type="button"
                onClick={openInvoiceForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {permissions.canEditInvoiceDetails ? 'Edit Invoice' : 'Edit Services'}
              </button>
            ) : null}
            {permissions.canManageInvoiceStatus ? (
              <select
                className={`rounded-lg border-0 px-3 py-1.5 text-sm font-medium cursor-pointer ${getStatusClasses(invoice.status)}`}
                value={getInvoiceStatusLabel(invoice.status)}
                onChange={(event) => void updateInvoiceStatus(event.target.value)}
                disabled={statusSaving}
              >
                {INVOICE_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            ) : (
              <span className={`inline-flex rounded-lg px-3 py-1.5 text-sm font-medium ${getStatusClasses(invoice.status)}`}>
                {getInvoiceStatusLabel(invoice.status)}
              </span>
            )}
            <Link
              href={`/invoices/${invoice.id}/print`}
              target="_blank"
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              🖨️ Print Invoice
            </Link>
            <Link
              href={`/invoices/${invoice.id}/receipt`}
              target="_blank"
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              🧾 Print Receipt
            </Link>
            {permissions.canCreateInvoices ? (
              <Link href="/invoices/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                + New Invoice
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {accessNotice ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {accessNotice}
          </div>
        ) : null}

        {pageError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        {showInvoiceForm ? (
          <form className="rounded-xl border bg-white p-6 space-y-4" onSubmit={handleInvoiceSubmit}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {permissions.canEditInvoiceDetails ? 'Edit Invoice' : 'Edit Services'}
                </h2>
                <p className="text-sm text-gray-500">
                  {permissions.canEditInvoiceDetails
                    ? 'Update the main invoice details, service lines, and assignment.'
                    : 'Update the service lines for this invoice. Totals recalculate automatically.'}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Service subtotal {formatCurrency(invoiceDraftServiceSubtotal)} · VAT recalculates automatically
              </div>
            </div>

            {permissions.canEditInvoiceDetails ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-gray-500">Client *</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={invoiceForm.client_id}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, client_id: event.target.value })}
                >
                  <option value="">Select client</option>
                  {clients.map((currentOption) => (
                    <option key={currentOption.id} value={currentOption.id}>
                      {currentOption.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500">Invoice No *</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={invoiceForm.invoice_no}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, invoice_no: event.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-gray-500">Date</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  type="date"
                  value={invoiceForm.date}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, date: event.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-gray-500">Beneficiary Name</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={invoiceForm.beneficiary_name}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, beneficiary_name: event.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-gray-500">Assigned To</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={invoiceForm.assigned_to}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, assigned_to: event.target.value })}
                >
                  <option value="">Select staff</option>
                  {assignableUsers.map((staffMember) => (
                    <option key={staffMember.id} value={staffMember.label}>
                      {staffMember.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500">Processing Fee (AED)</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  type="number"
                  value={invoiceForm.processing_fee}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, processing_fee: event.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-500">Notes</label>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  rows={3}
                  value={invoiceForm.notes}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, notes: event.target.value })}
                />
              </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Service Orders</h3>
                  <p className="text-sm text-gray-500">
                    {permissions.canDeleteServiceOrders
                      ? 'Edit, add, or remove service lines for this invoice.'
                      : 'Edit and add service lines. Only admins can remove saved lines.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addServiceOrderLine}
                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  + Add Line
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {serviceOrderFormLines.map((currentLine, index) => (
                  <div key={`service-line-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,180px,auto]">
                    <input
                      className="rounded-lg border px-3 py-2 text-sm"
                      placeholder="Service description"
                      value={currentLine.description}
                      onChange={(event) => updateServiceOrderLine(index, 'description', event.target.value)}
                    />
                    <input
                      className="rounded-lg border px-3 py-2 text-sm text-right"
                      type="number"
                      placeholder="Amount"
                      value={currentLine.amount}
                      onChange={(event) => updateServiceOrderLine(index, 'amount', event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeServiceOrderLine(index)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                      disabled={Boolean(currentLine.id) && !permissions.canDeleteServiceOrders}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-3">
              <div className="flex items-center justify-between">
                <span>Service Subtotal</span>
                <span>{formatCurrency(invoiceDraftServiceSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Processing Fee</span>
                <span>{formatCurrency(draftProcessingFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>VAT 5%</span>
                <span>{formatCurrency(calculateVatAmount(draftProcessingFee))}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span>New Total</span>
                <span>{formatCurrency(calculateInvoiceTotalAmount(
                  serviceOrderFormLines.map((currentLine) => ({ amount: parseFloat(currentLine.amount) || 0 })),
                  draftProcessingFee
                ))}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={invoiceSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {invoiceSaving ? 'Saving...' : permissions.canEditInvoiceDetails ? 'Save Invoice' : 'Save Services'}
              </button>
              <button
                type="button"
                onClick={cancelInvoiceForm}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 uppercase">Invoice Amount</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(effectiveTotalAmount)}</p>
            {balanceDue > 0 ? (
              <p className="text-xs text-red-400 mt-1">{formatCurrency(balanceDue)} still due</p>
            ) : (
              <p className="text-xs text-green-500 mt-1">Fully received</p>
            )}
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 uppercase">Client Received</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalReceived)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 uppercase">Vendor Paid</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{formatCurrency(totalVendorPaid)}</p>
            {vendorOutstanding > 0 ? (
              <p className="text-xs text-red-400 mt-1">{formatCurrency(vendorOutstanding)} outstanding</p>
            ) : null}
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 uppercase">Profit</p>
            <p className={`text-2xl font-bold mt-1 ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {formatCurrency(profit)}
            </p>
            {totalReceived === 0 ? (
              <p className="text-xs text-gray-400 mt-1">Awaiting payment</p>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase">Client</p>
              <p className="text-sm font-medium mt-1">{currentClient?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Beneficiary</p>
              <p className="text-sm font-medium mt-1">{invoice.beneficiary_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Assigned To</p>
              <p className="text-sm font-medium mt-1">{invoice.assigned_to || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Date</p>
              <p className="text-sm font-medium mt-1">{invoice.date || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Contact</p>
              <p className="text-sm font-medium mt-1">{currentClient?.contact_person || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Phone</p>
              <p className="text-sm font-medium mt-1">{currentClient?.phone || '—'}</p>
            </div>
          </div>
          {invoice.notes ? (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-400 uppercase">Notes</p>
              <p className="text-sm text-gray-600 mt-1">{invoice.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700">Service Orders</h2>
          </div>
          {serviceOrders.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No service orders found for this invoice.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {serviceOrders.map((serviceOrder, index) => (
                  <tr key={`${serviceOrder.description}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className="mr-2 text-gray-400">{index + 1}.</span>
                      {serviceOrder.description}
                    </td>
                    <td className="px-4 py-2 text-right">{formatCurrency(serviceOrder.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t">
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-500">Processing Fee</td>
                  <td className="px-4 py-2 text-right text-sm">{formatCurrency(invoice.processing_fee)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-500">VAT 5%</td>
                  <td className="px-4 py-2 text-right text-sm">{formatCurrency(effectiveVatAmount)}</td>
                </tr>
                <tr className="text-base font-bold">
                  <td className="px-4 py-3 border-t">Total</td>
                  <td className="px-4 py-3 border-t text-right text-blue-600">{formatCurrency(effectiveTotalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-700">Client Receipts</h2>
              {hasBalanceDue ? (
                <p className="mt-1 text-xs text-amber-700">
                  Remaining due: {formatCurrency(balanceDue)}. Add another receipt when the client pays the balance.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {permissions.canManageReceipts && hasBalanceDue ? (
                <button
                  type="button"
                  onClick={openRemainingReceiptForm}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                >
                  + Record {formatCurrency(balanceDue)}
                </button>
              ) : null}
              {permissions.canManageReceipts ? (
                <button
                  type="button"
                  onClick={() => openNewReceiptForm()}
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"
                >
                  {showReceiptForm ? '+ New Receipt' : '+ Add Receipt'}
                </button>
              ) : null}
            </div>
          </div>

          {showReceiptForm ? (
            <form className="border-b bg-green-50 p-4 space-y-3" onSubmit={handleReceiptSubmit}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {editingReceiptId ? 'Edit Receipt' : 'Add Receipt'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Split payments are supported. Save one receipt, then keep adding the next one.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <label className="text-xs text-gray-500">Receipt No</label>
                  <input
                    className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                    placeholder="e.g. 10533"
                    value={receipt.receipt_no}
                    onChange={(event) => setReceipt({ ...receipt, receipt_no: event.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Amount (AED) *</label>
                  <input
                    className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                    type="number"
                    placeholder="0.00"
                    value={receipt.amount}
                    onChange={(event) => setReceipt({ ...receipt, amount: event.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Payment Mode *</label>
                  <select
                    className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                    value={receipt.payment_mode}
                    onChange={(event) => setReceipt({ ...receipt, payment_mode: event.target.value })}
                  >
                    <option value="">Select mode</option>
                    {CLIENT_PAYMENT_MODES.map((paymentMode) => (
                      <option key={paymentMode} value={paymentMode}>{paymentMode}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date</label>
                  <input
                    className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                    type="date"
                    value={receipt.date}
                    onChange={(event) => setReceipt({ ...receipt, date: event.target.value })}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-xs text-gray-500">Notes</label>
                  <input
                    className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                    placeholder="Optional"
                    value={receipt.notes}
                    onChange={(event) => setReceipt({ ...receipt, notes: event.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={receiptSaving}
                  aria-busy={receiptSaving}
                  className="inline-flex min-w-32 items-center justify-center rounded-lg border border-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-95 disabled:cursor-wait"
                  style={{ backgroundColor: receiptSaving ? '#86efac' : '#16a34a' }}
                >
                  {receiptSaving ? 'Saving...' : editingReceiptId ? 'Save Changes' : 'Save Receipt'}
                </button>
                <button
                  type="button"
                  onClick={cancelReceiptForm}
                  className="text-gray-500 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {receipts.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No receipts yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Receipt No</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Mode</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Notes</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {receipts.map((currentReceipt) => (
                  <tr key={currentReceipt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{currentReceipt.receipt_no || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{currentReceipt.date || '—'}</td>
                    <td className="px-4 py-2">
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {currentReceipt.payment_mode || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-green-600">{formatCurrency(currentReceipt.amount)}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{currentReceipt.notes || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      {permissions.canManageReceipts ? (
                        <button
                          type="button"
                          onClick={() => startReceiptEdit(currentReceipt)}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-sm">Total Received</td>
                  <td className="px-4 py-2 text-right text-green-600">{formatCurrency(totalReceived)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-700">Tasks</h2>
              <p className="text-xs text-slate-400 mt-0.5">Auto-created from service orders · Edit to fill date, paid & mode</p>
            </div>
            {permissions.canManageTasks ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void syncTasksFromServiceOrders()}
                  disabled={taskSyncing}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  {taskSyncing ? 'Syncing...' : '↻ Sync Tasks'}
                </button>
                <button
                  type="button"
                  onClick={openNewTaskForm}
                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  + Add Task
                </button>
              </div>
            ) : null}
          </div>

          {showTaskForm ? (
            <form className="border-b bg-blue-50 p-4 space-y-3" onSubmit={handleTaskSubmit}>
              {(() => {
                const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) ?? null : null
                const serviceOrderDescriptions = new Set(serviceOrders.map((so) => so.description.trim().toLowerCase()))
                const isAutoTask = editingTask
                  ? Boolean(editingTask.service_order_id) || serviceOrderDescriptions.has((editingTask.particulars ?? '').trim().toLowerCase())
                  : false

                return (
                  <>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        {editingTaskId ? 'Update Task' : 'Add Task'}
                      </p>
                      {isAutoTask ? (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {editingTask?.particulars} · {formatCurrency(editingTask?.charged ?? null)}
                        </p>
                      ) : null}
                    </div>

                    {isAutoTask ? (
                      /* Simplified form for auto-generated tasks — just the 4 fields you need */
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div>
                          <label className="text-xs text-gray-500">Date</label>
                          <input
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            type="date"
                            value={task.task_date}
                            onChange={(event) => setTask({ ...task, task_date: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Assigned To</label>
                          <select
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            value={task.assigned_to}
                            onChange={(event) => setTask({ ...task, assigned_to: event.target.value })}
                          >
                            <option value="">Select staff</option>
                            {assignableUsers.map((staffMember) => (
                              <option key={staffMember.id} value={staffMember.label}>{staffMember.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Paid (AED)</label>
                          <input
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            type="number"
                            placeholder="0.00"
                            value={task.paid}
                            onChange={(event) => setTask({ ...task, paid: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Payment Mode</label>
                          <select
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            value={task.payment_mode}
                            onChange={(event) => setTask({ ...task, payment_mode: event.target.value })}
                          >
                            <option value="">Select mode</option>
                            {VENDOR_PAYMENT_MODES.map((paymentMode) => (
                              <option key={paymentMode} value={paymentMode}>{paymentMode}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* Full form for manual tasks added via + Add Task */
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <label className="text-xs text-gray-500">Department</label>
                          <select
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            value={task.dept}
                            onChange={(event) => handleDeptChange(event.target.value)}
                          >
                            <option value="">Select dept</option>
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-500">Particulars *</label>
                          <input
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            placeholder="e.g. Work Permit payment"
                            value={task.particulars}
                            onChange={(event) => setTask({ ...task, particulars: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Assigned To</label>
                          <select
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            value={task.assigned_to}
                            onChange={(event) => setTask({ ...task, assigned_to: event.target.value })}
                          >
                            <option value="">Select staff</option>
                            {assignableUsers.map((staffMember) => (
                              <option key={staffMember.id} value={staffMember.label}>{staffMember.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Date</label>
                          <input
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            type="date"
                            value={task.task_date}
                            onChange={(event) => setTask({ ...task, task_date: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Charged (AED)</label>
                          <input
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            type="number"
                            value={task.charged}
                            onChange={(event) => setTask({ ...task, charged: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Paid (AED)</label>
                          <input
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            type="number"
                            value={task.paid}
                            onChange={(event) => setTask({ ...task, paid: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Payment Mode</label>
                          <select
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            value={task.payment_mode}
                            onChange={(event) => setTask({ ...task, payment_mode: event.target.value })}
                          >
                            <option value="">Select mode</option>
                            {VENDOR_PAYMENT_MODES.map((paymentMode) => (
                              <option key={paymentMode} value={paymentMode}>{paymentMode}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Payment Ref</label>
                          <input
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            value={task.ref_no}
                            onChange={(event) => setTask({ ...task, ref_no: event.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-500">Notes</label>
                          <input
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm"
                            value={task.notes}
                            onChange={(event) => setTask({ ...task, notes: event.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={taskSaving}
                        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {taskSaving ? 'Saving...' : 'Save Task'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelTaskForm}
                        className="text-gray-500 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )
              })()}
            </form>
          ) : null}

          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No tasks yet. Tasks are created automatically from service orders, and you can add manual tasks when needed.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Dept</th>
                  <th className="px-4 py-2 text-left">Particulars</th>
                  <th className="px-4 py-2 text-left">Assigned</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Charged</th>
                  <th className="px-4 py-2 text-right">Paid</th>
                  <th className="px-4 py-2 text-right">Diff</th>
                  <th className="px-4 py-2 text-left">Mode</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tasks.map((currentTask) => (
                  <tr key={currentTask.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{currentTask.dept || '—'}</td>
                    <td className="px-4 py-2">{currentTask.particulars || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{currentTask.assigned_to || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{currentTask.task_date || currentTask.created_at?.slice(0, 10) || '—'}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(currentTask.charged)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(currentTask.paid)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency((currentTask.charged ?? 0) - (currentTask.paid ?? 0))}</td>
                    <td className="px-4 py-2 text-gray-500">{currentTask.payment_mode || '—'}</td>
                    <td className="px-4 py-2">
                      {permissions.canManageTasks ? (
                        <select
                          className="text-xs border rounded px-1.5 py-1 cursor-pointer"
                          value={currentTask.status || 'Pending'}
                          onChange={(event) => void updateTaskStatus(currentTask.id, event.target.value)}
                        >
                          {TASK_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-600">{currentTask.status || 'Pending'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {permissions.canManageTasks ? (
                        <button
                          type="button"
                          onClick={() => startTaskEdit(currentTask)}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 font-semibold text-sm">
                <tr>
                  <td colSpan={4} className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(totalVendorCharged)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(totalVendorPaid)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(vendorOutstanding)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
