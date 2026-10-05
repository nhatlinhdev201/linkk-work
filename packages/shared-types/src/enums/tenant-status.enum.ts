/**
 * Multi-tenant subscription grace period & active lifecycle statuses
 */
export enum TenantSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  RESTRICTED = 'RESTRICTED',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}
