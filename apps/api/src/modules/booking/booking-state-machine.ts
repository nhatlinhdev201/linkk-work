import { BookingStatus } from '@linkkwork/shared-types';

export const VALID_BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatus.DRAFT]: [
    BookingStatus.PENDING_DISPATCH,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.PENDING_DISPATCH]: [
    BookingStatus.BROADCASTING,
    BookingStatus.ASSIGNED,
    BookingStatus.OFFERED_TO_FAVORITE,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.OFFERED_TO_FAVORITE]: [
    BookingStatus.ASSIGNED,
    BookingStatus.BROADCASTING,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.BROADCASTING]: [
    BookingStatus.ASSIGNED,
    BookingStatus.DISPATCH_FAILED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.ASSIGNED]: [
    BookingStatus.ARRIVING,
    BookingStatus.EMERGENCY_REDISPATCH,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.EMERGENCY_REDISPATCH]: [
    BookingStatus.BROADCASTING,
    BookingStatus.ASSIGNED,
    BookingStatus.DISPATCH_FAILED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.ARRIVING]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.EMERGENCY_REDISPATCH,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.IN_PROGRESS]: [
    BookingStatus.PENDING_ACCEPTANCE,
    BookingStatus.COMPLETED,
    BookingStatus.EMERGENCY_REDISPATCH,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.PENDING_ACCEPTANCE]: [
    BookingStatus.COMPLETED,
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.COMPLETED]: [
    BookingStatus.REVIEWED,
  ],
  [BookingStatus.REVIEWED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.DISPATCH_FAILED]: [
    BookingStatus.BROADCASTING,
    BookingStatus.CANCELLED,
  ],
};

export function isValidBookingTransition(
  fromStatus: BookingStatus | string,
  toStatus: BookingStatus | string,
): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = VALID_BOOKING_TRANSITIONS[fromStatus as BookingStatus] || [];
  return (allowed as readonly string[]).includes(toStatus);
}
