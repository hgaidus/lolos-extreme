import { NextResponse } from 'next/server';
import { renderContentPreview } from '@/lib/adminPreview';

// Renders a draft travelogue/description to the same cleaned HTML the public
// page shows. Read-only: no file writes, no git — purely a rendering helper for
// the editor's live preview pane. Gated by src/proxy.js (/api/admin/*).
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, travelogue, description } = body || {};
    const html = renderContentPreview({ type, travelogue, description });
    return NextResponse.json({ html });
  } catch (err) {
    console.error('Error rendering preview:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
