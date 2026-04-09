import { z } from 'zod'

// Common schemas
export const uuidSchema = z.string().uuid()

export const emailSchema = z.string().email()

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')

export const currencySchema = z.number().nonnegative().max(999999999.99)

// Client schemas
export const clientSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1, 'Name is required').max(200),
  contact_person: z.string().max(100).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(100).email().nullable().optional(),
  trn: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  emirate: z.enum(['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'RAK', 'Fujairah', 'UAQ']).default('Dubai'),
})

export type ClientInput = z.infer<typeof clientSchema>

// Invoice schemas
export const invoiceSchema = z.object({
  id: uuidSchema.optional(),
  invoice_no: z.string().min(1).max(50),
  client_id: uuidSchema,
  beneficiary_name: z.string().max(200).nullable().optional(),
  date: dateSchema.nullable().optional(),
  assigned_to: z.string().max(100).nullable().optional(),
  processing_fee: currencySchema.default(0),
  vat_amount: currencySchema.default(0),
  total_amount: currencySchema.default(0),
  status: z.enum(['Draft', 'Pending', 'Active', 'Partial', 'Completed', 'Cancelled']).default('Active'),
  notes: z.string().max(1000).nullable().optional(),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>

// Service Order schemas
export const serviceOrderSchema = z.object({
  id: uuidSchema.optional(),
  invoice_id: uuidSchema,
  description: z.string().min(1).max(500),
  amount: currencySchema.default(0),
})

export type ServiceOrderInput = z.infer<typeof serviceOrderSchema>

// Invoice Task schemas
export const invoiceTaskSchema = z.object({
  id: uuidSchema.optional(),
  invoice_id: uuidSchema,
  dept: z.string().max(50).nullable().optional(),
  particulars: z.string().max(500).nullable().optional(),
  assigned_to: z.string().max(100).nullable().optional(),
  charged: currencySchema.nullable().optional(),
  paid: currencySchema.nullable().optional(),
  payment_mode: z.string().max(50).nullable().optional(),
  ref_no: z.string().max(100).nullable().optional(),
  status: z.enum(['Pending', 'On Account', 'Paid', 'Done']).default('Pending'),
  notes: z.string().max(1000).nullable().optional(),
  task_date: dateSchema.nullable().optional(),
})

export type InvoiceTaskInput = z.infer<typeof invoiceTaskSchema>

// Invoice Receipt schemas
export const invoiceReceiptSchema = z.object({
  id: uuidSchema.optional(),
  invoice_id: uuidSchema,
  amount: currencySchema,
  receipt_no: z.string().max(50).nullable().optional(),
  date: dateSchema.nullable().optional(),
  payment_mode: z.string().max(50).nullable().optional(),
})

export type InvoiceReceiptInput = z.infer<typeof invoiceReceiptSchema>

// Attendance schemas
export const attendanceQuerySchema = z.object({
  view: z.enum(['daily', 'monthly']).default('daily'),
  date: dateSchema.optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format, expected YYYY-MM').optional(),
})

export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>

// Search params schema
export const searchParamsSchema = z.object({
  query: z.string().max(200).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  filter: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

export type SearchParams = z.infer<typeof searchParamsSchema>
