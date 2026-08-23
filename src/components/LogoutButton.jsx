'use client';

// Shared by both signed-in bars: the CMS header and the one on public pages.
//
// redirectTo controls where you land afterwards. From inside the CMS that has
// to be the login page — the page you were on is about to stop being readable.
// From a public page the right answer is to stay put and reload, so you simply
// see what a visitor sees; being thrown to a login form for signing OUT would
// be backwards.
export default function LogoutButton({ redirectTo }) {
  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    if (redirectTo) {
      window.location.assign(redirectTo);
    } else {
      // Full reload, not router.refresh(): the session cookie changed, and
      // these pages are server-rendered per request. A soft refresh would
      // leave the stale signed-in markup in place.
      window.location.reload();
    }
  }

  // Muted rather than terracotta: signing out is not the thing you came here
  // to do, and it sits next to links that are.
  //
  // A step darker than the bar's hint colour: both clear AA now, but this is
  // an interactive control sitting among static text, so it earns the extra
  // weight. 5.90:1 on the public bar, 5.99:1 on the CMS header.
  return (
    <button
      onClick={handleLogout}
      className="ml-auto text-sm text-[#5c5648] hover:text-[#3f3a30] hover:underline"
    >
      Log out
    </button>
  );
}
