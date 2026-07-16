import { NextResponse } from 'next/server';
import { commitAndPush } from '@/lib/adminData';
import { getPage, updatePage } from '@/lib/adminPages';
import { validatePageFields } from '@/lib/adminValidate';

// PATCH only — pages are never deletable from the CMS; unpublish instead.
// Slug and type are immutable (public URLs; changing one is a git-level
// operation with a redirect decision attached).
export async function PATCH(request, { params }) {
  try {
    const { nid } = await params;
    if (!getPage(nid)) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields = {};
    for (const key of ['title', 'body', 'published']) {
      if (key in body) fields[key] = body[key];
    }

    const { ok, errors, values } = validatePageFields(fields, { partial: true });
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const updated = updatePage(nid, values);
    const gitResult = await commitAndPush(`Edit page: ${updated.title} (nid ${nid})`);

    return NextResponse.json({ page: updated, git: gitResult });
  } catch (err) {
    console.error('Error updating page:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
