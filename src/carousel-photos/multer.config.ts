import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

const UPLOAD_DIR = './uploads/carousel-photos';

export const carouselPhotoMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
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
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) {
      cb(new BadRequestException('Solo se permiten imágenes (png/jpg/webp/gif).'), false);
      return;
    }
    cb(null, true);
  },
};
