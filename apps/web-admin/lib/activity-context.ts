export function readActivityContext(search: string, defaults: { dateFrom: string; dateTo: string }) {
  const params = new URLSearchParams(search);
  const validDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
  const from = params.get('dateFrom');
  const to = params.get('dateTo');
  const validRange = validDate(from) && validDate(to) && from <= to;
  return {
    dateFrom: validRange ? from : defaults.dateFrom,
    dateTo: validRange ? to : defaults.dateTo,
    preset: validRange ? 'custom' as const : '14d' as const,
    companyId: params.get('companyId') || 'all',
    locationId: params.get('locationId') || 'all',
  };
}
