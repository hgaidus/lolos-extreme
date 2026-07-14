'use client';

export default function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.assign('/admin/login');
  }

  return (
    <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white">
      Log out
    </button>
  );
}
