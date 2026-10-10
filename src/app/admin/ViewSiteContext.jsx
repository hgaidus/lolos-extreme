'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';

// The "View site" link in the admin header, made to point at the thing being
// edited. From a trip's editor it goes to that trip; from a stop's, to that
// stop — rather than always dumping you on the home page to find your way
// back to what you were working on.
//
// The header lives in the layout, which cannot know which record a page is
// about. So each edit page drops a <ViewSiteTarget> saying where its record
// lives, and the header link reads it. Pages that are not about one record
// (the trip list, Photos, Accounts) say nothing and get the home page.
const HOME = { href: '/', label: 'View site' };
const Ctx = createContext({ target: HOME, setTarget: () => {} });

export function ViewSiteProvider({ children }) {
  const [target, setTarget] = useState(HOME);
  return <Ctx.Provider value={{ target, setTarget }}>{children}</Ctx.Provider>;
}

export function ViewSiteLink({ className }) {
  const { target } = useContext(Ctx);
  return <Link href={target.href} className={className}>{target.label} &rarr;</Link>;
}

/** Rendered by an edit page: "the public page for what you are editing is here". */
export function ViewSiteTarget({ href, label }) {
  const { setTarget } = useContext(Ctx);
  useEffect(() => {
    if (!href) return undefined;
    setTarget({ href, label });
    // Leaving the page puts the link back, so it never points at a record you
    // have navigated away from.
    return () => setTarget(HOME);
  }, [href, label, setTarget]);
  return null;
}
