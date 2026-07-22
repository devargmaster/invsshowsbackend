import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const EVENT_COVERS_BUCKET = 'event-covers';

@Injectable()
export class SupabaseStorageService {
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }

  async uploadEventPhoto(eventId: string, file: Express.Multer.File): Promise<string> {
    const path = `${eventId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${extensionFor(file.mimetype)}`;

    const { error } = await this.client.storage
      .from(EVENT_COVERS_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (error) throw new Error(`No se pudo subir la imagen a Supabase Storage: ${error.message}`);

    return this.client.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async deleteEventPhoto(publicUrl: string): Promise<void> {
    const marker = `/object/public/${EVENT_COVERS_BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return; // no era un objeto de este bucket (ej. imagen default), nada que borrar

    const path = publicUrl.slice(idx + marker.length);
    await this.client.storage.from(EVENT_COVERS_BUCKET).remove([path]);
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
