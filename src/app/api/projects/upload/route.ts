import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';
import { isR2Configured, uploadToR2 } from '@/lib/r2';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 3. Convert file into a Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Generate a unique name
    const ext = path.extname(file.name) || '.png';
    const uniqueFilename = `${crypto.randomUUID()}${ext}`;

    // 5. If Cloudflare R2 is configured, upload directly to R2 bucket
    if (isR2Configured()) {
      try {
        const r2Key = `projects/${uniqueFilename}`;
        const publicUrl = await uploadToR2(r2Key, buffer, file.type || 'application/octet-stream');
        return NextResponse.json({ url: publicUrl, storage: 'r2' });
      } catch (r2Err: any) {
        console.error('R2 upload failed, falling back to local storage:', r2Err);
      }
    }

    // 6. Fallback: Write file to local disk 'public/uploads'
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, uniqueFilename);
    await fs.writeFile(filepath, buffer);

    const fileUrl = `/uploads/${uniqueFilename}`;
    return NextResponse.json({ url: fileUrl, storage: 'local' });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
