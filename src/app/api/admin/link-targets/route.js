import { NextResponse } from 'next/server';
import { searchLinkTargets } from '@/lib/adminLinkTargets';

// Lookup for the editor's link dialog: ?q= a title, a nid, or a site address.
// Read-only; signed-in only, like everything under /api/admin (proxy.js).
export async function GET(request) {
  try {
    const q = new URL(request.url).searchParams.get('q') || '';
    return NextResponse.json(searchLinkTargets(q));
  } catch (err) {
    console.error('Error searching link targets:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
