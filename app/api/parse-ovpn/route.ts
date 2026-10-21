import { NextRequest, NextResponse } from 'next/server';
import { parseOvpnContent } from '@/lib/ovpn-parser';
import { getServers } from '@/lib/storage';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let content = '';
    let fileName = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      fileName = file.name;
      content = await file.text();
    } else {
      const body = await req.json();
      content = body.content || '';
      fileName = body.fileName || '';
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'Empty file or configuration content' }, { status: 400 });
    }

    const existingServers = await getServers();
    const result = await parseOvpnContent(content, fileName, existingServers);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error parsing OVPN:', error);
    return NextResponse.json({ error: 'Failed to parse .ovpn file' }, { status: 500 });
  }
}
