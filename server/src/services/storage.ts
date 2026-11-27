import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../env.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export type MediaKind = 'AVATAR' | 'COVER';

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

const detectImageType = (buffer: Buffer): 'jpeg' | 'png' | 'webp' | null => {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
};

const processImage = async (input: Buffer, kind: MediaKind): Promise<ProcessedImage> => {
  if (!detectImageType(input)) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Підтримуються лише зображення JPEG, PNG або WebP.');
  }

  try {
    const pipeline = sharp(input, {
      failOn: 'error',
      limitInputPixels: 25_000_000,
      animated: false,
    }).rotate();

    if (kind === 'AVATAR') {
      pipeline.resize(512, 512, { fit: 'cover', position: 'attention' });
    } else {
      pipeline.resize(1200, 675, { fit: 'cover', position: 'centre' });
    }

    const { data, info } = await pipeline
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return { buffer: data, width: info.width, height: info.height };
  } catch (error) {
    throw new AppError(422, 'IMAGE_PROCESSING_FAILED', 'Не вдалося обробити зображення.', { cause: error });
  }
};

const uploadToSupabase = async (key: string, buffer: Buffer): Promise<string> => {
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const objectUrl = `${baseUrl}/storage/v1/object/${encodeURIComponent(env.SUPABASE_STORAGE_BUCKET)}/${key}`;

  const response = await fetch(objectUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'image/webp',
      'Cache-Control': '31536000',
      'x-upsert': 'false',
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    logger.error(
      { status: response.status, details: details.slice(0, 500) },
      'storage:supabase-upload-failed',
    );

    throw new AppError(502, 'STORAGE_UPLOAD_FAILED', 'Не вдалося зберегти зображення.', {
      details: details.slice(0, 500),
    });
  }

  return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(env.SUPABASE_STORAGE_BUCKET)}/${key}`;
};

const uploadToLocalDisk = async (key: string, buffer: Buffer): Promise<string> => {
  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  const destination = path.resolve(uploadRoot, key);
  if (!destination.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new AppError(400, 'INVALID_PATH', 'Некоректний шлях збереження.');
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, buffer, { flag: 'wx' });
  // Relative URL keeps uploads same-origin: Next.js rewrites /uploads to the API.
  return `/uploads/${key}`;
};

export interface StoredMedia {
  publicUrl: string;
  storageKey: string;
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export const storeUploadedImage = async (
  ownerId: string,
  kind: MediaKind,
  input: Buffer,
): Promise<StoredMedia> => {
  const processed = await processImage(input, kind);
  const key = `${kind === 'AVATAR' ? 'avatars' : 'covers'}/${ownerId}/${randomUUID()}.webp`;
  const useSupabase = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

  const publicUrl = useSupabase
    ? await uploadToSupabase(key, processed.buffer)
    : await uploadToLocalDisk(key, processed.buffer);

  return {
    publicUrl,
    storageKey: key,
    mime: 'image/webp',
    sizeBytes: processed.buffer.length,
    width: processed.width,
    height: processed.height,
  };
};
