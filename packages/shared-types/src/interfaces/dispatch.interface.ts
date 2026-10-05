export interface ClaimJobInput {
  bookingId: string;
  taskerId: string;
  tenantId?: string;
  lockExpiryMs?: number;
}

export type ClaimJobCode = 'CLAIMED' | 'ALREADY_TAKEN' | 'TASKER_BUSY' | 'ERROR';

export interface ClaimJobResult {
  success: boolean;
  code: ClaimJobCode;
  bookingId: string;
  taskerId?: string;
  claimedAt?: Date;
  message?: string;
}
