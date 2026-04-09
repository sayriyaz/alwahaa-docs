'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { insertServiceOrders } from '@/lib/service-orders'
import AppBrandLink from '@/components/app-brand-link'
import type { AssignableUser } from '@/lib/app-users'

const DEFAULT_SERVICES = [
  'Job Offer + WP Typing',
  'Work Permit Payment',
  'Worker Insurance',
  'Visa Inside',
  'Change Status',
  'Medical + EID',
  'Visa Stamping / Visa Renewal',
  'New Agreement Submission',
  'Visit Visa',
  'Visa Cancellation',
  'License Renewal',
  'Emirates ID',
  'ILOE Insurance',
  'Other',
]

type ClientSummary = {
  id: string
  name: string
}

type InvoiceForm = {
  client_id: string
  client_name: string
  invoice_no: string
  date: string
  beneficiary_name: string
  assigned_to: string
  processing_fee: string
  notes: string
}

type InvoiceLine = {
  description: string
  amount: string
}

type SupabaseErrorLike = {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

function findClient(clients: ClientSummary[], clientId: string | null) {
  if (!clientId) {
    return null
  }

  return clients.find((client) => client.id === clientId) ?? null
}

function formatSupabaseError(
  error: SupabaseErrorLike | null,
  fallbackMessage: string
) {
  if (!error) {
    return fallbackMessage
  }

  if (error.code === 'PGRST205') {
    return 'Supabase setup is incomplete. Create the invoices and service_orders tables first, then try again.'
  }

  if (error.message) {
    const extraDetails = [error.details, error.hint].filter(Boolean).join(' ')
    return extraDetails ? `${error.message} ${extraDetails}` : error.message
  }

  return fallbackMessage
}

export default function NewInvoicePageClient({
  initialClients,
  preselectedClientId,
  assignableUsers,
  currentAssigneeLabel,
}: {
  initialClients: ClientSummary[]
  preselectedClientId: string | null
  assignableUsers: AssignableUser[]
  currentAssigneeLabel: string
}) {
  const router = useRouter()
  const selectedClient = findClient(initialClients, preselectedClientId)
  const [clients] = useState<ClientSummary[]>(initialClients)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [clientSearch, setClientSearch] = useState(selectedClient?.name ?? '')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [form, setForm] = useState<InvoiceForm>({
    client_id: selectedClient?.id ?? '',
    client_name: selectedClient?.name ?? '',
    invoice_no: '',
    date: new Date().toISOString().split('T')[0],
    beneficiary_name: '',
    assigned_to: currentAssigneeLabel,
    processing_fee: '300',
    notes: '',
  })
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', amount: '' },
  ])

  function selectClient(client: ClientSummary) {
    setForm((currentForm) => ({
      ...currentForm,
      client_id: client.id,
      client_name: client.name,
    }))
    setClientSearch(client.name)
    setShowClientDropdown(false)
  }

  function addLine() {
    setLines((currentLines) => [...currentLines, { description: '', amount: '' }])
  }

  function removeLine(index: number) {
    setLines((currentLines) => currentLines.filter((_, currentIndex) => currentIndex !== index))
  }

  function updateLine(index: number, field: keyof InvoiceLine, value: string) {
    setLines((currentLines) =>
      currentLines.map((line, currentIndex) =>
        currentIndex === index ? { ...line, [field]: value } : line
      )
    )
  }

  function addPreset(description: string) {
    setLines((currentLines) => [...currentLines, { description, amount: '' }])
  }

  async function handleSubmit() {
    if (!form.client_id) {
      alert('Please select a client')
      return
    }

    if (!form.invoice_no.trim()) {
      alert('Invoice number is required')
      return
    }

    const validLines = lines.filter((line) => line.description.trim() && line.amount)
    if (validLines.length === 0) {
      alert('Add at least one service line')
      return
    }

    setLoading(true)
    setSubmitError('')

    const serviceTotal = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0)
    const processingFee = parseFloat(form.processing_fee) || 0
    const vatAmount = processingFee * 0.05
    const totalAmount = serviceTotal + processingFee + vatAmount

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_no: form.invoice_no.trim(),
        client_id: form.client_id,
        beneficiary_name: form.beneficiary_name,
        date: form.date,
        assigned_to: form.assigned_to,
        processing_fee: processingFee,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        status: 'Active',
        notes: form.notes,
      })
      .select('id')
      .single()

    if (invoiceError || !invoice) {
      setLoading(false)
      setSubmitError(
        formatSupabaseError(
          invoiceError,
          'Unable to create the invoice right now. Please try again.'
        )
      )
      return
    }

    const { error: linesError } = await insertServiceOrders(
      validLines.map((line) => ({
        invoice_id: invoice.id,
        description: line.description.trim(),
        amount: parseFloat(line.amount) || 0,
      }))
    )

    if (linesError) {
      setLoading(false)
      setSubmitError(
        formatSupabaseError(
          linesError,
          'The invoice was created, but the service lines could not be saved completely.'
        )
      )
      router.push('/invoices/' + invoice.id)
      return
    }

    setLoading(false)
    router.push('/invoices/' + invoice.id)
  }

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  )
  const serviceTotal = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0)
  const processingFee = parseFloat(form.processing_fee) || 0
  const vatAmount = processingFee * 0.05
  const totalAmount = serviceTotal + processingFee + vatAmount

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <AppBrandLink compact />
          <div className="hidden h-10 w-px bg-gray-200 md:block" />
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Invoice</h1>
            <p className="text-sm text-gray-500">Create a new service invoice</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Invoice No *</label>
              <input
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. AWD/INV/14956/2025"
                value={form.invoice_no}
                onChange={e => setForm({ ...form, invoice_no: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Date</label>
              <input
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-sm text-gray-500">Client *</label>
            <input
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search client..."
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true) }}
              onFocus={() => setShowClientDropdown(true)}
            />
            {showClientDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      onClick={() => selectClient(client)}
                    >
                      {client.name}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-400">No matching clients</div>
                )}
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-green-50 cursor-pointer text-sm text-green-600 border-t"
                  onClick={() => { router.push('/clients?new=1&returnTo=%2Finvoices%2Fnew') }}
                >
                  + Add new client
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Beneficiary Name</label>
              <input
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Lovely Melbin"
                value={form.beneficiary_name}
                onChange={e => setForm({ ...form, beneficiary_name: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">The employee whose visa/work is being processed</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Assigned To</label>
              <select
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.assigned_to}
                onChange={e => setForm({ ...form, assigned_to: e.target.value })}
              >
                <option value="">Select staff</option>
                {assignableUsers.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.label}>
                    {staffMember.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Service Orders</h2>
            <button onClick={addLine} className="text-blue-600 text-sm hover:underline">+ Add Line</button>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SERVICES.map((service) => (
                <button
                  key={service}
                  onClick={() => addPreset(service)}
                  className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded-lg transition-colors"
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="flex gap-2 items-center">
                <span className="text-xs text-gray-400 w-5">{index + 1}</span>
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Service description"
                  value={line.description}
                  onChange={e => updateLine(index, 'description', e.target.value)}
                />
                <input
                  className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  placeholder="AED"
                  type="number"
                  value={line.amount}
                  onChange={e => updateLine(index, 'amount', e.target.value)}
                />
                <button onClick={() => removeLine(index)} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Services Subtotal</span>
              <span>AED {serviceTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-500">Processing Fee</span>
              <input
                className="w-32 border rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="number"
                value={form.processing_fee}
                onChange={e => setForm({ ...form, processing_fee: e.target.value })}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>VAT 5% (on processing fee)</span>
              <span>AED {vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span className="text-blue-600">AED {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <label className="text-sm text-gray-500">Notes / Remarks</label>
          <textarea
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="e.g. Lovely Melbin visa stamping process"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 text-base"
        >
          {loading ? 'Creating Invoice...' : 'Create Invoice'}
        </button>
      </div>
    </div>
  )
}
