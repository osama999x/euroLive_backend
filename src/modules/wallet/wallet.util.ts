import { LedgerDirection } from '../../common/enums';

export function assertPositiveAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Amount must be a positive integer');
  }
}

export function availableBalance(balance: number, creditLimit = 0): number {
  return balance + Math.max(0, creditLimit);
}

export function nextBalance(
  current: number,
  direction: LedgerDirection,
  amount: number,
  creditLimit = 0,
): number {
  assertPositiveAmount(amount);

  if (direction === LedgerDirection.CREDIT) {
    return current + amount;
  }

  const next = current - amount;
  if (next < -Math.max(0, creditLimit)) {
    throw new Error('Insufficient balance');
  }

  return next;
}
