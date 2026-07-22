const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const DEFAULTS_PATH = 'storage/v1/object/public/event-covers/defaults';

const DEFAULT_EVENT_IMAGE_NAMES = [
  'default-01.svg',
  'default-02.svg',
  'default-03.svg',
  'default-04.svg',
  'default-05.svg',
];

// Selección determinística (no aleatoria en cada request) para que la
// portada de un evento sin fotos propias no "parpadee" cambiando de imagen
// en cada visita — se elige siempre la misma mientras no tenga fotos reales.
export function pickDefaultEventImage(eventId: string): string {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash * 31 + eventId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % DEFAULT_EVENT_IMAGE_NAMES.length;
  return `${SUPABASE_URL}/${DEFAULTS_PATH}/${DEFAULT_EVENT_IMAGE_NAMES[index]}`;
}
