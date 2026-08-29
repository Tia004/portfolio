import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';
import {
  isR2Configured,
  listR2Objects,
  deleteFromR2,
  CLOUDFLARE_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} from '@/lib/r2';

export interface MediaAsset {
  filename: string;
  key?: string;
  url: string;
  folder: string;
  size: number;
  ext: string;
  type: 'image' | 'pdf' | 'video' | 'other';
  updatedAt: string;
  storage: 'r2' | 'local';
}

// Recursively find files in local public/uploads directory (fallback / local dev)
async function getLocalFilesRecursively(dir: string, baseDir: string): Promise<MediaAsset[]> {
  let results: MediaAsset[] = [];
  try {
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const file of list) {
      if (file.name.startsWith('.')) continue; // ignore hidden files
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        const subFiles = await getLocalFilesRecursively(fullPath, baseDir);
        results = results.concat(subFiles);
      } else {
        const stat = await fs.stat(fullPath);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        const ext = path.extname(file.name).toLowerCase().replace('.', '');

        let type: 'image' | 'pdf' | 'video' | 'other' = 'other';
        if (['webp', 'png', 'jpg', 'jpeg', 'svg', 'gif', 'avif', 'bmp'].includes(ext)) {
          type = 'image';
        } else if (ext === 'pdf') {
          type = 'pdf';
        } else if (['mp4', 'webm', 'mov'].includes(ext)) {
          type = 'video';
        }

        const folder = path.dirname(relativePath) === '.' ? 'Principale' : path.dirname(relativePath);

        results.push({
          filename: file.name,
          key: relativePath,
          url: `/uploads/${relativePath}`,
          folder,
          size: stat.size,
          ext,
          type,
          updatedAt: stat.mtime.toISOString(),
          storage: 'local',
        });
      }
    }
  } catch {
    // Directory might not exist or empty
  }
  return results;
}

// GET /api/master/media - List all uploaded media assets from Cloudflare R2 or local disk
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const r2Ready = isR2Configured();
    let assets: MediaAsset[] = [];

    if (r2Ready) {
      try {
        const r2Assets = await listR2Objects();
        assets = r2Assets;
      } catch (r2Err: any) {
        console.error('Error fetching from Cloudflare R2:', r2Err);
      }
    }

    // If R2 is empty or not configured, also load local files as fallback
    if (assets.length === 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const localAssets = await getLocalFilesRecursively(uploadDir, uploadDir);
      assets = localAssets;
    }

    // Sort by most recently updated first
    assets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Compute stats
    const totalBytes = assets.reduce((acc, a) => acc + a.size, 0);
    const imageCount = assets.filter((a) => a.type === 'image').length;
    const pdfCount = assets.filter((a) => a.type === 'pdf').length;
    const webpCount = assets.filter((a) => a.ext === 'webp').length;

    return NextResponse.json({
      r2Configured: r2Ready,
      r2Bucket: R2_BUCKET_NAME,
      r2AccountId: CLOUDFLARE_ACCOUNT_ID,
      r2PublicUrl: R2_PUBLIC_URL,
      assets,
      stats: {
        totalFiles: assets.length,
        totalBytes,
        imageCount,
        pdfCount,
        webpCount,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/master/media:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/master/media - Delete a media asset from Cloudflare R2 or local disk
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    const key = searchParams.get('key');

    if (!fileUrl && !key) {
      return NextResponse.json({ error: 'URL o Key mancante' }, { status: 400 });
    }

    // 1. If key is provided and R2 is configured, try deleting from Cloudflare R2
    if (isR2Configured() && (key || fileUrl?.startsWith('http') || fileUrl?.includes('r2.dev') || fileUrl?.includes('tiadesigns.it'))) {
      const r2Key = key || fileUrl?.replace(R2_PUBLIC_URL, '').replace(/^\/+/, '') || '';
      if (r2Key) {
        await deleteFromR2(r2Key);
        return NextResponse.json({ success: true, message: 'File eliminato da Cloudflare R2' });
      }
    }

    // 2. Fallback: Local filesystem delete
    if (fileUrl && fileUrl.startsWith('/uploads/')) {
      const relative = fileUrl.replace('/uploads/', '');
      const safeTarget = path.join(process.cwd(), 'public', 'uploads', relative);
      const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');

      if (!safeTarget.startsWith(uploadsRoot)) {
        return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
      }

      await fs.unlink(safeTarget);
      return NextResponse.json({ success: true, message: 'File locale eliminato con successo' });
    }

    return NextResponse.json({ error: 'Impossibile determinare la sorgente del file' }, { status: 400 });
  } catch (error: any) {
    console.error('Error deleting media file:', error);
    return NextResponse.json({ error: 'Errore durante l\'eliminazione del file' }, { status: 500 });
  }
}
