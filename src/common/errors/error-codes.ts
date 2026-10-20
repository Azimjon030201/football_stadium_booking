
export const ErrorCode = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
    FORBIDDEN_RESOURCE: 'FORBIDDEN_RESOURCE',
    BOOKING_INVALID_STATE: 'BOOKING_INVALID_STATE',
  } as const;
  
  export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];