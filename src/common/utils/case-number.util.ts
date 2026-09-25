export function formatCaseNumber(prefix: string, seq: number, at = new Date()): string {
  const ymd = at.toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${ymd}-${String(seq).padStart(4, '0')}`;
}
