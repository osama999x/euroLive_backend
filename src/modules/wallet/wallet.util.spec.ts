import { LedgerDirection } from '../../common/enums';
import { availableBalance, nextBalance } from './wallet.util';

describe('wallet.util', () => {
  it('credits increase the balance', () => {
    expect(nextBalance(100, LedgerDirection.CREDIT, 40)).toBe(140);
  });

  it('debits within credit limit', () => {
    expect(nextBalance(50, LedgerDirection.DEBIT, 80, 50)).toBe(-30);
  });

  it('rejects debit beyond credit limit', () => {
    expect(() => nextBalance(10, LedgerDirection.DEBIT, 20, 0)).toThrow(
      'Insufficient balance',
    );
  });

  it('rejects non-positive amounts', () => {
    expect(() => nextBalance(10, LedgerDirection.CREDIT, 0)).toThrow(
      'Amount must be a positive integer',
    );
  });

  it('availableBalance includes credit limit', () => {
    expect(availableBalance(100, 25)).toBe(125);
  });
});
