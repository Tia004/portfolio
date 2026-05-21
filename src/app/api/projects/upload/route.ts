import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';

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

    // 4. Set directory inside next project 'public/uploads'
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    // Create the directory if it does not exist
    await fs.mkdir(uploadDir, { recursive: true });

    // 5. Generate a unique name
    const ext = path.extname(file.name) || '.png';
    const uniqueFilename = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, uniqueFilename);

    // 6. Write the file to disk
    await fs.writeFile(filepath, buffer);

    // 7. Return the relative public path URL
    const fileUrl = `/uploads/${uniqueFilename}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
