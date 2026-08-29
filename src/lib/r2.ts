import { S3Client, ListObjectsV2Command, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export const CLOUDFLARE_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID || '86fdf5e2f4d450ad3d3644d9937eb0b8';
export const R2_BUCKET_NAME =
  process.env.R2_BUCKET_NAME || 'portfolio-assets';

export const R2_PUBLIC_URL = (
  process.env.R2_PUBLIC_URL ||
  process.env.ASSETS_CDN_URL ||
  `https://assets.tiadesigns.it`
).replace(/\/+$/, '');

export function isR2Configured(): boolean {
  const key = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  return Boolean(key && secret && key.trim().length > 0 && secret.trim().length > 0);
}

export function getR2Client(): S3Client | null {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export interface R2Asset {
  filename: string;
  key: string;
  url: string;
  folder: string;
  size: number;
  ext: string;
  type: 'image' | 'pdf' | 'video' | 'other';
  updatedAt: string;
  storage: 'r2' | 'local';
}

/**
 * Lists all objects from the Cloudflare R2 bucket.
 */
export async function listR2Objects(): Promise<R2Asset[]> {
  const client = getR2Client();
  if (!client) return [];

  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    MaxKeys: 1000,
  });

  const response = await client.send(command);
  const contents = response.Contents || [];

  return contents.map((item) => {
    const key = item.Key || '';
    const parts = key.split('/');
    const filename = parts[parts.length - 1] || key;
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Principale';
    const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() || '' : '';

    let type: 'image' | 'pdf' | 'video' | 'other' = 'other';
    if (['webp', 'png', 'jpg', 'jpeg', 'svg', 'gif', 'avif', 'bmp'].includes(ext)) {
      type = 'image';
    } else if (ext === 'pdf') {
      type = 'pdf';
    } else if (['mp4', 'webm', 'mov'].includes(ext)) {
      type = 'video';
    }

    const publicUrl = key.startsWith('http')
      ? key
      : `${R2_PUBLIC_URL}/${key.replace(/^\/+/, '')}`;

    return {
      filename,
      key,
      url: publicUrl,
      folder,
      size: item.Size || 0,
      ext,
      type,
      updatedAt: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
      storage: 'r2',
    };
  });
}

/**
 * Upload a buffer to Cloudflare R2 bucket.
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getR2Client();
  if (!client) {
    throw new Error('Cloudflare R2 credentials are not configured');
  }

  const cleanKey = key.replace(/^\/+/, '');
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanKey,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);

  return `${R2_PUBLIC_URL}/${cleanKey}`;
}

/**
 * Delete an object from Cloudflare R2 bucket.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  if (!client) {
    throw new Error('Cloudflare R2 credentials are not configured');
  }

  const cleanKey = key.replace(/^\/+/, '');
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanKey,
  });

  await client.send(command);
}
