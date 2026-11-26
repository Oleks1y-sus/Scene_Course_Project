import { Router } from 'express';
import { asyncRoute } from '../../lib/http.js';
import { badRequest } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { uploadSingleImage } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimit.js';
import { db } from '../../db/client.js';
import { media } from '../../db/schema.js';
import { storeUploadedImage, type MediaKind } from '../../services/storage.js';

export const uploadRouter = Router();

const handleUpload = (kind: MediaKind) =>
  asyncRoute(async (req, res) => {
    if (!req.file) throw badRequest('Оберіть файл зображення.');
    if (!req.user) throw badRequest('Потрібно увійти в акаунт.');

    const stored = await storeUploadedImage(req.user.id, kind, req.file.buffer);

    const [created] = await db
      .insert(media)
      .values({
        ownerId: req.user.id,
        kind,
        storageKey: stored.storageKey,
        publicUrl: stored.publicUrl,
        mime: stored.mime,
        sizeBytes: stored.sizeBytes,
        width: stored.width,
        height: stored.height,
      })
      .returning();

    if (!created) throw new Error('Failed to persist media metadata.');

    res.status(201).json({
      data: {
        id: created.id,
        url: created.publicUrl,
        width: created.width,
        height: created.height,
        kind: created.kind,
      },
    });
  });

uploadRouter.post('/avatar', requireAuth, uploadLimiter, uploadSingleImage, handleUpload('AVATAR'));
uploadRouter.post('/cover', requireAuth, uploadLimiter, uploadSingleImage, handleUpload('COVER'));
