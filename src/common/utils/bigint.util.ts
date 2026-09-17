export const bigintToNumber = {
  to: (value: number | null | undefined) => value ?? 0,
  from: (value: string | number | null | undefined) => {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value);
  },
};
