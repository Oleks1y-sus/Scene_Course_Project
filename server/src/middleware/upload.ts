import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../lib/errors.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
    fields: 5,
    parts: 8,
  },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      callback(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Підтримуються лише JPEG, PNG або WebP.'));
      return;
    }
    callback(null, true);
  },
});

const singleImage = upload.single('image');

export const uploadSingleImage = (req: Request, res: Response, next: NextFunction): void => {
  singleImage(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(413, 'FILE_TOO_LARGE', 'Максимальний розмір зображення — 2 МБ.'));
        return;
      }
      next(new AppError(400, 'UPLOAD_ERROR', 'Не вдалося завантажити файл.'));
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
};
