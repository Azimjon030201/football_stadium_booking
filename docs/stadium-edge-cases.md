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

## 3. Field Archiving Validation (FieldsService.archive)
- Behavior: Before a field can be archived or soft-deleted, the system checks for active or future reservations.
- Rules: If a field has any associated bookings with status PENDING, PAYMENT_PENDING, or CONFIRMED and a start time in the future, the archive request is rejected.
- Error Response: Throws a ConflictException with the error code/message 'FIELD_HAS_ACTIVE_BOOKINGS'.
- Purpose: Protects users from booking a field that is being shut down and ensures data integrity.

## 4. Unauthorized Access Protection (JwtAuthGuard)
- Behavior: Intercepts incoming requests to protected routes (e.g., stadium or field modification endpoints).
- Rules: If the Authorization header is missing, malformed, or the JWT token is expired/invalid, access is denied.
- Error Response: Returns 401 Unauthorized.
- Purpose: Secures administrative and owner endpoints from unauthorized users.

## 5. Ownership & Role Verification (OwnershipGuard / RolesGuard)
- Behavior: Validates whether the authenticated user has the appropriate role (e.g., OWNER, ADMIN) and owns the target resource.
- Rules: If a regular OWNER tries to modify a stadium/field belonging to another owner, access is blocked.
- Error Response: Returns 403 Forbidden.
- Purpose: Enforces data isolation and strict role-based access control.

## 6. Pagination Limit Validation
- Behavior: Validates query parameters on list endpoints (e.g., GET /api/stadiums).
- Rules: If the limit or page parameters exceed predefined boundaries or contain invalid data types, the global validation pipe intercepts the request.
- Error Response: Returns 400 Bad Request.
- Purpose: Prevents server overload and database performance degradation from excessively large queries.

## 7. Non-Existent Resource Handling
- Behavior: Queries the database for entities (stadiums or fields) using provided UUID parameters.
- Rules: If no matching record is found in the database, the service throws a NotFoundException.
- Error Response: Returns 404 Not Found.
- Purpose: Handles invalid identifiers gracefully and informs the client correctly.

## 8. Duplicate Moderation Submission Prevention
- Behavior: Checks the status of a stadium before submitting it for review.
- Rules: A stadium that is already in PENDING or APPROVED status cannot be submitted again.
- Error Response: Returns 400 Bad Request with an appropriate message.
- Purpose: Prevents redundant moderation cycles and conflicting status transitions.