import { Injectable } from '@nestjs/common';

const EVENT_COVERS_BUCKET = 'event-covers';

// Llama directo a la REST API de Supabase Storage en vez de usar
// @supabase/supabase-js: ese paquete inicializa un cliente de Realtime que
// requiere WebSocket nativo (Node 22+) aunque nunca lo usemos — en Railway
// (Node 20) eso tira "Node.js detected but native WebSocket not found" y
// tumba el arranque de toda la app. Acá solo necesitamos Storage, así que
// evitamos la dependencia por completo.
@Injectable()
export class SupabaseStorageService {
  private readonly baseUrl = `${process.env.SUPABASE_URL}/storage/v1`;
  private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  async uploadEventPhoto(eventId: string, file: Express.Multer.File): Promise<string> {
    const path = `${eventId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${extensionFor(file.mimetype)}`;

    const res = await fetch(`${this.baseUrl}/object/${EVENT_COVERS_BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': file.mimetype,
      },
      body: new Uint8Array(file.buffer),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`No se pudo subir la imagen a Supabase Storage (${res.status}): ${body}`);
    }

    return `${process.env.SUPABASE_URL}/storage/v1/object/public/${EVENT_COVERS_BUCKET}/${path}`;
  }

  async deleteEventPhoto(publicUrl: string): Promise<void> {
    const marker = `/object/public/${EVENT_COVERS_BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return; // no era un objeto de este bucket (ej. imagen default), nada que borrar

    const path = publicUrl.slice(idx + marker.length);
    await fetch(`${this.baseUrl}/object/${EVENT_COVERS_BUCKET}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [path] }),
    });
  }
}

function extensionFor(mimetype: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimetype] ?? 'bin';
}
