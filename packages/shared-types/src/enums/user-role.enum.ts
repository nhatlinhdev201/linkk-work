/**
 * System and tenant-level user authorization roles
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  TENANT_DISPATCHER = 'TENANT_DISPATCHER',
  TASKER = 'TASKER',
  CUSTOMER = 'CUSTOMER',
}
