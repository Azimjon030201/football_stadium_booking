# Stadium Booking & Management Edge Cases

## 1. Automated Booking Expiry (BookingExpiryService)
- Behavior: A cron job runs every minute to check for stale bookings.
- Rules: Bookings with statuses PENDING and PAYMENT_PENDING whose creation time (createdAt) exceeds the configured threshold (PAYMENT_EXPIRATION_MINUTES) are automatically transitioned to EXPIRED.
- Purpose: Frees up time slots and prevents holding reservations indefinitely without payment.

## 2. Stadium Archiving Validation (StadiumsService.archive)
- Behavior: Before a stadium can be archived or soft-deleted, the system checks for active or future reservations.
- Rules: If a stadium has any associated bookings with status PENDING, PAYMENT_PENDING, or CONFIRMED and a startTime in the future (gte: new Date()), the archive request is rejected.
- Error Response: Throws a ConflictException with the error code/message 'STADIUM_HAS_ACTIVE_BOOKINGS'.
- Purpose: Protects users from booking a stadium that is being shut down and ensures data integrity.