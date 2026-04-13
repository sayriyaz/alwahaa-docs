export const previewAppUser = {
  id: 'preview-admin-user',
  email: 'admin@alwahaagroup.com',
  full_name: 'Riyaz Ur Rahman',
  role: 'admin' as const,
}

export const previewAssignableUsers = [
  {
    id: 'preview-admin-user',
    email: 'admin@alwahaagroup.com',
    full_name: 'Riyaz Ur Rahman',
    role: 'admin' as const,
    label: 'Riyaz Ur Rahman',
  },
  {
    id: 'preview-editor-1',
    email: 'ops1@alwahaagroup.com',
    full_name: 'Mohammed',
    role: 'editor' as const,
    label: 'Mohammed',
  },
  {
    id: 'preview-accountant-1',
    email: 'accounts@alwahaagroup.com',
    full_name: 'Priya',
    role: 'accountant' as const,
    label: 'Priya',
  },
]

export const previewManagedUsers = [
  {
    id: 'preview-admin-user',
    email: 'admin@alwahaagroup.com',
    full_name: 'Riyaz Ur Rahman',
    role: 'admin' as const,
    created_at: '2026-03-01T08:10:00.000Z',
  },
  {
    id: 'preview-editor-1',
    email: 'ops1@alwahaagroup.com',
    full_name: 'Mohammed',
    role: 'editor' as const,
    created_at: '2026-03-03T09:45:00.000Z',
  },
  {
    id: 'preview-accountant-1',
    email: 'accounts@alwahaagroup.com',
    full_name: 'Priya',
    role: 'accountant' as const,
    created_at: '2026-03-04T10:30:00.000Z',
  },
  {
    id: 'preview-editor-2',
    email: 'ops2@alwahaagroup.com',
    full_name: 'Meeran',
    role: 'editor' as const,
    created_at: '2026-03-05T07:15:00.000Z',
  },
]

export const previewClients = [
  {
    id: 'client-aalborg',
    name: 'Aalborg Mechanical Services',
    contact_person: 'Arfan',
    phone: '+971 50 112 3344',
    email: 'admin@aalborg.ae',
    trn: '100245778800003',
    address: 'Al Qusais Industrial Area, Dubai',
    emirate: 'Dubai',
  },
  {
    id: 'client-nordic',
    name: 'Nordic Facilities Management',
    contact_person: 'Rashid',
    phone: '+971 52 991 8844',
    email: 'ops@nordicfm.ae',
    trn: '100998777400006',
    address: 'Musaffah M-12, Abu Dhabi',
    emirate: 'Abu Dhabi',
  },
  {
    id: 'client-skyline',
    name: 'Skyline Technical Works',
    contact_person: 'Nasar',
    phone: '+971 56 221 6600',
    email: 'info@skylinetech.ae',
    trn: '100557712300009',
    address: 'Al Nahda, Sharjah',
    emirate: 'Sharjah',
  },
]

export const previewInvoices = [
  {
    id: 'inv-preview-001',
    invoice_no: 'AWD/INV/14956/2026',
    client_id: 'client-aalborg',
    date: '2026-03-25',
    beneficiary_name: 'Lovely Melbin',
    assigned_to: 'Shahul Hameed',
    processing_fee: 300,
    vat_amount: 15,
    total_amount: 4215,
    status: 'Partial',
    notes: 'Lovely Melbin visa stamping process',
    created_at: '2026-03-25T09:00:00.000Z',
  },
  {
    id: 'inv-preview-002',
    invoice_no: 'AWD/INV/14957/2026',
    client_id: 'client-nordic',
    date: '2026-03-26',
    beneficiary_name: 'Ameer Ali',
    assigned_to: 'Faseela K',
    processing_fee: 300,
    vat_amount: 15,
    total_amount: 2815,
    status: 'Active',
    notes: 'New work permit and insurance',
    created_at: '2026-03-26T10:30:00.000Z',
  },
  {
    id: 'inv-preview-003',
    invoice_no: 'AWD/INV/14958/2026',
    client_id: 'client-skyline',
    date: '2026-03-28',
    beneficiary_name: 'Sajid P',
    assigned_to: 'Riyaz Ur Rahman',
    processing_fee: 300,
    vat_amount: 15,
    total_amount: 1815,
    status: 'Completed',
    notes: 'License renewal support',
    created_at: '2026-03-28T12:00:00.000Z',
  },
]

export const previewServiceOrders = {
  'inv-preview-001': [
    { description: 'Job Offer + WP Typing', amount: 850 },
    { description: 'Work Permit Payment', amount: 1200 },
    { description: 'Worker Insurance', amount: 650 },
    { description: 'Visa Stamping / Visa Renewal', amount: 1200 },
  ],
  'inv-preview-002': [
    { description: 'Medical + EID', amount: 850 },
    { description: 'ILOE Insurance', amount: 450 },
    { description: 'Visa Inside', amount: 1200 },
  ],
  'inv-preview-003': [
    { description: 'License Renewal', amount: 1500 },
  ],
} as const

export const previewTasks = {
  'inv-preview-001': [
    {
      id: 'task-001',
      invoice_id: 'inv-preview-001',
      service_order_id: null,
      dept: 'MOHRE',
      particulars: 'Job offer approval',
      assigned_to: 'Shahul Hameed',
      charged: 850,
      paid: 850,
      payment_mode: 'RAK Debit',
      ref_no: 'MOHRE-20492',
      status: 'Done',
      notes: 'Completed successfully',
      task_date: '2026-03-25',
      created_at: '2026-03-25T09:20:00.000Z',
    },
    {
      id: 'task-002',
      invoice_id: 'inv-preview-001',
      service_order_id: null,
      dept: 'MEDICAL',
      particulars: 'Medical and Emirates ID',
      assigned_to: 'Faseela K',
      charged: 650,
      paid: 400,
      payment_mode: 'Online',
      ref_no: 'MED-88302',
      status: 'On Account',
      notes: 'Balance pending',
      task_date: '2026-03-26',
      created_at: '2026-03-25T10:10:00.000Z',
    },
    {
      id: 'task-003',
      invoice_id: 'inv-preview-001',
      service_order_id: null,
      dept: 'GDRFA',
      particulars: 'Visa stamping',
      assigned_to: 'Shahul Hameed',
      charged: 1200,
      paid: 0,
      payment_mode: 'Noqodi',
      ref_no: 'GDRFA-1102',
      status: 'Pending',
      notes: 'Awaiting final approval',
      task_date: '2026-03-27',
      created_at: '2026-03-25T11:05:00.000Z',
    },
  ],
  'inv-preview-002': [
    {
      id: 'task-004',
      invoice_id: 'inv-preview-002',
      service_order_id: null,
      dept: 'ILOE',
      particulars: 'Insurance enrollment',
      assigned_to: 'Faseela K',
      charged: 450,
      paid: 450,
      payment_mode: 'RAK Debit',
      ref_no: 'ILOE-0911',
      status: 'Done',
      notes: null,
      task_date: '2026-03-26',
      created_at: '2026-03-26T10:45:00.000Z',
    },
    {
      id: 'task-005',
      invoice_id: 'inv-preview-002',
      service_order_id: null,
      dept: 'ICP',
      particulars: 'Visa inside process',
      assigned_to: 'Riyaz Ur Rahman',
      charged: 1200,
      paid: 900,
      payment_mode: 'Online',
      ref_no: 'ICP-1194',
      status: 'Paid',
      notes: 'Final posting in progress',
      task_date: '2026-03-27',
      created_at: '2026-03-26T11:15:00.000Z',
    },
  ],
  'inv-preview-003': [
    {
      id: 'task-006',
      invoice_id: 'inv-preview-003',
      service_order_id: null,
      dept: 'DET',
      particulars: 'License renewal filing',
      assigned_to: 'Riyaz Ur Rahman',
      charged: 1500,
      paid: 1500,
      payment_mode: 'RAK Debit',
      ref_no: 'DET-4509',
      status: 'Done',
      notes: 'Completed and delivered',
      task_date: '2026-03-28',
      created_at: '2026-03-28T12:15:00.000Z',
    },
  ],
} as const

export const previewReceipts = {
  'inv-preview-001': [
    {
      id: 'receipt-001',
      invoice_id: 'inv-preview-001',
      receipt_no: '10533',
      amount: 2500,
      payment_mode: 'Bank Transfer',
      date: '2026-03-25',
      notes: 'Advance payment',
      created_at: '2026-03-25T14:00:00.000Z',
    },
    {
      id: 'receipt-002',
      invoice_id: 'inv-preview-001',
      receipt_no: '10547',
      amount: 1000,
      payment_mode: 'Cash Deposit ATM',
      date: '2026-03-27',
      notes: 'Part payment',
      created_at: '2026-03-27T09:30:00.000Z',
    },
  ],
  'inv-preview-002': [
    {
      id: 'receipt-003',
      invoice_id: 'inv-preview-002',
      receipt_no: '10551',
      amount: 1500,
      payment_mode: 'Cash',
      date: '2026-03-26',
      notes: 'Counter payment',
      created_at: '2026-03-26T16:10:00.000Z',
    },
  ],
  'inv-preview-003': [
    {
      id: 'receipt-004',
      invoice_id: 'inv-preview-003',
      receipt_no: '10564',
      amount: 1815,
      payment_mode: 'Cheque',
      date: '2026-03-29',
      notes: 'Full settlement',
      created_at: '2026-03-29T10:05:00.000Z',
    },
  ],
} as const

export function getPreviewInvoice(invoiceId?: string) {
  return previewInvoices.find((invoice) => invoice.id === invoiceId) ?? previewInvoices[0]
}

export function getPreviewClient(clientId?: string | null) {
  if (!clientId) {
    return null
  }

  return previewClients.find((client) => client.id === clientId) ?? null
}

export function getPreviewServiceOrders(invoiceId?: string) {
  return [...(previewServiceOrders[invoiceId as keyof typeof previewServiceOrders] ?? previewServiceOrders['inv-preview-001'])]
}

export function getPreviewTasks(invoiceId?: string) {
  return [...(previewTasks[invoiceId as keyof typeof previewTasks] ?? previewTasks['inv-preview-001'])]
}

export function getPreviewReceipts(invoiceId?: string) {
  return [...(previewReceipts[invoiceId as keyof typeof previewReceipts] ?? previewReceipts['inv-preview-001'])]
}
