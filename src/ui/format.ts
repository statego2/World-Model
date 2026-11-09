export function formatMeasure(value: number, unit?: string | null): string {
  if (!Number.isFinite(value)) return '—';
  const kind = unitKind(unit);
  const amount = kind === 'eur' ? value * 1_000_000 : value;
  if (kind === 'percent') {
    return `${new Intl.NumberFormat('el-GR', { maximumFractionDigits: 1 }).format(value)}%`;
  }
  const compact = compactGreek(amount);
  const mark = kind === 'usd' ? ' $' : kind === 'eur' ? ' €' : kind === 'people' ? '' : unit ? ` ${unit}` : '';
  return `${compact}${mark}`.trim();
}

function unitKind(unit?: string | null): 'usd' | 'eur' | 'people' | 'percent' | 'raw' {
  const text = (unit ?? '').toLowerCase();
  if (text === 'usd' || text === 'us$') return 'usd';
  if (text.includes('eur')) return 'eur';
  if (text === 'persons' || text === 'άτομα') return 'people';
  if (text === 'percent' || text === '%') return 'percent';
  return 'raw';
}

function compactGreek(amount: number): string {
  const abs = Math.abs(amount);
  const format = (scaled: number, digits: number) => new Intl.NumberFormat('el-GR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(scaled);
  if (abs >= 1e12) return `${format(amount / 1e12, 1)} τρισ.`;
  if (abs >= 1e9) return `${format(amount / 1e9, 1)} δισ.`;
  if (abs >= 1e6) return `${format(amount / 1e6, 1)} εκατ.`;
  if (abs >= 100) return format(amount, 0);
  return format(amount, 1);
}
