import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';

export interface MediaAsset {
  filename: string;
  url: string;
  folder: string;
  size: number;
  ext: string;
  type: 'image' | 'pdf' | 'video' | 'other';
  updatedAt: string;
}

// Recursively find files in directory
async function getFilesRecursively(dir: string, baseDir: string): Promise<MediaAsset[]> {
  let results: MediaAsset[] = [];
  try {
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const file of list) {
      if (file.name.startsWith('.')) continue; // ignore hidden files
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        const subFiles = await getFilesRecursively(fullPath, baseDir);
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
          url: `/uploads/${relativePath}`,
          folder,
          size: stat.size,
          ext,
          type,
          updatedAt: stat.mtime.toISOString(),
        });
      }
    }
  } catch (e) {
    console.error('Error reading dir:', dir, e);
  }
  return results;
}

// GET /api/master/media - List all uploaded media assets
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const assets = await getFilesRecursively(uploadDir, uploadDir);

    // Sort by recent updated first
    assets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Compute stats
    const totalBytes = assets.reduce((acc, a) => acc + a.size, 0);
    const imageCount = assets.filter((a) => a.type === 'image').length;
    const pdfCount = assets.filter((a) => a.type === 'pdf').length;
    const webpCount = assets.filter((a) => a.ext === 'webp').length;

    return NextResponse.json({
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

// DELETE /api/master/media - Delete an uploaded media file
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL mancante' }, { status: 400 });
    }

    // Safety check: must be inside /uploads/
    if (!fileUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'Percorso non consentito' }, { status: 403 });
    }

    const relative = fileUrl.replace('/uploads/', '');
    const safeTarget = path.join(process.cwd(), 'public', 'uploads', relative);

    // Prevent directory traversal
    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    if (!safeTarget.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    await fs.unlink(safeTarget);
    return NextResponse.json({ success: true, message: 'File eliminato con successo' });
  } catch (error: any) {
    console.error('Error deleting media file:', error);
    return NextResponse.json({ error: 'Errore durante l\'eliminazione del file' }, { status: 500 });
  }
}
