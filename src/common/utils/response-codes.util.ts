export const ResponseCodes = {
  OK: 200 as const,
  CREATED: 201 as const,
  BAD: 400 as const,
  NOT_AUTHORIZED: 401 as const,
  FORBIDDEN: 403 as const,
  NOT_FOUND: 404 as const,
  SERVER_ERROR: 500 as const,
  TOO_MANY_REQUESTS: 429 as const,
};

