import { AssignDuration } from '../enums';

export function expiryFromDuration(
  duration: AssignDuration,
  customDays?: number,
): Date | null {
  if (duration === AssignDuration.PERMANENT) {
    return null;
  }

  const days: Record<string, number> = {
    [AssignDuration.DAYS_1]: 1,
    [AssignDuration.DAYS_7]: 7,
    [AssignDuration.DAYS_30]: 30,
    [AssignDuration.CUSTOM]: customDays ?? 0,
  };

  const n = days[duration] ?? 0;
  if (!n || n < 1) {
    throw new Error('Invalid assignment duration');
  }

  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + n);
  return expires;
}
