import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

// En memoria, no disco: el archivo se reenvía tal cual a Supabase Storage,
// nunca se escribe al filesystem efímero de Railway.
export const eventPhotoMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) {
      cb(new BadRequestException('Solo se permiten imágenes (png/jpg/webp/gif).'), false);
      return;
    }
    cb(null, true);
  },
};
