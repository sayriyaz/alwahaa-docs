'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  trn: string | null
  address: string | null
  emirate: string | null
}

type ClientForm = {
  name: string
  contact_person: string
  phone: string
  email: string
  trn: string
  address: string
  emirate: string
}

const EMPTY_FORM: ClientForm = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  trn: '',
  address: '',
  emirate: 'Dubai',
}

function sortClients(clients: Client[]) {
  return [...clients].sort((left, right) => left.name.localeCompare(right.name))
}

export default function ClientsPageClient({
  initialClients,
  initiallyOpenForm,
  canManage,
  returnTo,
}: {
  initialClients: Client[]
  initiallyOpenForm: boolean
  canManage: boolean
  returnTo: string | null
}) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>(() => sortClients(initialClients))
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(initiallyOpenForm)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM)

  async function handleAdd() {
    if (!canManage) {
      alert('Your account has view-only access.')
      return
    }

    if (!form.name.trim()) {
      alert('Client name is required')
      return
    }

    setSaving(true)
    const { data: createdClient, error } = await supabase.from('clients').insert({
      name: form.name.trim(),
      contact_person: form.contact_person,
      phone: form.phone,
      email: form.email,
      trn: form.trn,
      address: form.address,
      emirate: form.emirate,
    })
      .select('*')
      .single()

    setSaving(false)

    if (error || !createdClient) {
      alert('Unable to save the client right now. Please try again.')
      return
    }

    setForm(EMPTY_FORM)
    setShowForm(false)
    setClients((currentClients) => sortClients([...currentClients, createdClient as Client]))

    if (returnTo) {
      const separator = returnTo.includes('?') ? '&' : '?'
      router.push(`${returnTo}${separator}clientId=${encodeURIComponent(createdClient.id)}`)
    }
  }

  const filtered = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    (client.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
    (client.phone || '').includes(search)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Clients</h1>
            <p className="text-sm text-slate-500">
              {clients.length} clients total
              {canManage ? '' : ' · View only access'}
            </p>
          </div>
          {canManage ? (
            <button
              onClick={() => setShowForm((open) => !open)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Add Client
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {showForm && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-700">New Client</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Company Name *</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Aalborg Mechanical Services"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-500">Contact Person</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Arfan"
                  value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+971..."
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@company.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-500">License / TRN No</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 941872"
                  value={form.trn} onChange={e => setForm({ ...form, trn: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-500">Emirate</label>
                <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.emirate} onChange={e => setForm({ ...form, emirate: e.target.value })}>
                  {['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'RAK', 'Fujairah', 'UAQ'].map(emirate => (
                    <option key={emirate} value={emirate}>{emirate}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-500">Address</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Office address"
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Client'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border">
          <div className="px-4 py-3 border-b">
            <input
              className="w-full text-sm focus:outline-none"
              placeholder="Search by name, contact, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No clients found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Company Name</th>
                  <th className="px-4 py-3 text-left">Contact Person</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">License No</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{client.name}</td>
                    <td className="px-4 py-3 text-gray-600">{client.contact_person || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{client.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{client.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{client.trn || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
