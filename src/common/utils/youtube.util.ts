/** Extrae el ID de un video de YouTube de sus formatos de URL comunes,
 * incluyendo el link de gestión de YouTube Studio (que un admin copia
 * mientras configura un live, antes de tener el link público de watch). */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/|studio\.youtube\.com\/video\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}
