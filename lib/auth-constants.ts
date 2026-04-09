export const ACCESS_TOKEN_COOKIE = 'alwahaa-access-token'
export const REFRESH_TOKEN_COOKIE = 'alwahaa-refresh-token'

export const APP_ROLES = ['admin', 'accountant', 'editor', 'viewer'] as const

export type AppRole = (typeof APP_ROLES)[number]

export type AppPermissions = {
  canManageUsers: boolean
  canManageClients: boolean
  canCreateInvoices: boolean
  canEditInvoiceDetails: boolean
  canManageInvoiceStatus: boolean
  canDeleteInvoices: boolean
  canManageReceipts: boolean
  canDeleteReceipts: boolean
  canManageTasks: boolean
  canDeleteTasks: boolean
  canManageServiceOrders: boolean
  canDeleteServiceOrders: boolean
}

export function getRolePermissions(role: AppRole): AppPermissions {
  switch (role) {
    case 'admin':
      return {
        canManageUsers: true,
        canManageClients: true,
        canCreateInvoices: true,
        canEditInvoiceDetails: true,
        canManageInvoiceStatus: true,
        canDeleteInvoices: true,
        canManageReceipts: true,
        canDeleteReceipts: true,
        canManageTasks: true,
        canDeleteTasks: true,
        canManageServiceOrders: true,
        canDeleteServiceOrders: true,
      }
    case 'accountant':
      return {
        canManageUsers: false,
        canManageClients: true,
        canCreateInvoices: true,
        canEditInvoiceDetails: true,
        canManageInvoiceStatus: true,
        canDeleteInvoices: false,
        canManageReceipts: true,
        canDeleteReceipts: false,
        canManageTasks: true,
        canDeleteTasks: false,
        canManageServiceOrders: true,
        canDeleteServiceOrders: false,
      }
    case 'editor':
      return {
        canManageUsers: false,
        canManageClients: false,
        canCreateInvoices: false,
        canEditInvoiceDetails: false,
        canManageInvoiceStatus: true,
        canDeleteInvoices: false,
        canManageReceipts: false,
        canDeleteReceipts: false,
        canManageTasks: true,
        canDeleteTasks: false,
        canManageServiceOrders: true,
        canDeleteServiceOrders: false,
      }
    case 'viewer':
    default:
      return {
        canManageUsers: false,
        canManageClients: false,
        canCreateInvoices: false,
        canEditInvoiceDetails: false,
        canManageInvoiceStatus: false,
        canDeleteInvoices: false,
        canManageReceipts: false,
        canDeleteReceipts: false,
        canManageTasks: false,
        canDeleteTasks: false,
        canManageServiceOrders: false,
        canDeleteServiceOrders: false,
      }
  }
}

export function canEditRole(role: AppRole) {
  const permissions = getRolePermissions(role)
  return (
    permissions.canEditInvoiceDetails ||
    permissions.canManageInvoiceStatus ||
    permissions.canManageReceipts ||
    permissions.canManageTasks ||
    permissions.canManageServiceOrders
  )
}
