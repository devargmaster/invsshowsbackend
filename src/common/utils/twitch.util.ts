/** Extrae el nombre de canal de Twitch de una URL común, o lo toma tal
 * cual si el admin pegó directamente el nombre de canal (sin URL). */
export function extractTwitchChannel(input: string): string | null {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(/twitch\.tv\/([a-zA-Z0-9_]{3,25})(?:[/?#].*)?$/i);
  if (urlMatch) return urlMatch[1];

  if (/^[a-zA-Z0-9_]{3,25}$/.test(trimmed)) return trimmed;

  return null;
}
