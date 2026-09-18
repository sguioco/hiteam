export function validateOrganizationSetup(
  draft: { companyName: string; locationName: string; address: string; latitude: string; longitude: string },
  mode: string,
  confirmationPending: boolean,
  locale: string,
): { field: 'companyName' | 'locationName' | 'map'; message: string } | null {
  const ru = locale === 'ru';
  if (!draft.companyName.trim()) return { field: 'companyName', message: ru ? 'Укажи название организации.' : 'Enter the organization name.' };
  if (mode === 'create-location' && !draft.locationName.trim()) return { field: 'locationName', message: ru ? 'Укажи название локации.' : 'Enter the location name.' };
  if (confirmationPending) return { field: 'map', message: ru ? 'Подтверди выбранную точку на карте перед сохранением.' : 'Confirm the selected map point before saving.' };
  if (!draft.address.trim()) return { field: 'map', message: ru ? 'Укажи адрес организации.' : 'Enter the organization address.' };
  const lat = Number(draft.latitude), lng = Number(draft.longitude);
  if (!draft.latitude.trim() || !draft.longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { field: 'map', message: ru ? 'Поставь точку на карте или выбери адрес из подсказок.' : 'Place a point on the map or choose an address from suggestions.' };
  return null;
}
