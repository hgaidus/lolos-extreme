import { NextResponse } from 'next/server';
import { commitAndPush } from '@/lib/adminData';
import { createPage } from '@/lib/adminPages';
import { validateNewPageFields } from '@/lib/adminValidate';

// Create a standalone page. Born as a DRAFT: 404 for the public until
// published from its editor.
export async function POST(request) {
  try {
    const body = await request.json();
    const fields = {};
    for (const key of ['title', 'type', 'body']) {
      if (key in body) fields[key] = body[key];
    }

    const { ok, errors, values } = validateNewPageFields(fields);
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const page = createPage(values);
    const gitResult = await commitAndPush(`Add page (draft): ${page.title} (nid ${page.nid})`);

    return NextResponse.json({ page, git: gitResult });
  } catch (err) {
    console.error('Error creating page:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
