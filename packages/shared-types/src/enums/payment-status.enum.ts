/**
 * Escrow, payment and settlement transaction states
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  ESCROW_HOLD = 'ESCROW_HOLD',
  RELEASED_TO_TASKER = 'RELEASED_TO_TASKER',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}
