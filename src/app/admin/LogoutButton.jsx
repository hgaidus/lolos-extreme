'use client';

export default function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.assign('/admin/login');
  }

  // Muted rather than terracotta: signing out is not the thing you came here
  // to do, and it sits next to two links that are.
  //
  // #5c5648, not the bar's #8a8272 hint colour — measured 5.99:1 on this
  // header against 3.13:1, and this is an interactive control, so it has to
  // clear AA rather than merely look secondary.
  return (
    <button
      onClick={handleLogout}
      className="text-sm text-[#5c5648] hover:text-[#3f3a30] hover:underline"
    >
      Log out
    </button>
  );
}
