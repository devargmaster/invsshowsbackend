import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

const UPLOAD_DIR = './uploads/transfer-proofs';

// NOTA: guarda en disco local (./uploads). Railway usa filesystem efímero,
// asi que en produccion esto se pierde en cada redeploy — reemplazar por un
// storage real (S3/Cloudinary/etc) antes de depender de esto en serio.
export const transferProofMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      // diskStorage no crea el directorio solo; lo aseguramos en cada
      // request (barato: mkdir con directorio ya existente es no-op)
      mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    if (!/^image\/(png|jpe?g|webp)$|^application\/pdf$/.test(file.mimetype)) {
      cb(new BadRequestException('Solo se permiten imágenes (png/jpg/webp) o PDF.'), false);
      return;
    }
    cb(null, true);
  },
};
