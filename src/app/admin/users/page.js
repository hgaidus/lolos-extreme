import Link from 'next/link';
import { cookies } from 'next/headers';
import { listUsers } from '@/lib/adminUsers';
import { ADMIN_COOKIE_NAME, getSessionUsername } from '@/lib/adminAuth';
import UsersManager from './UsersManager';

export default async function AdminUsersPage() {
  const store = await cookies();
  const currentUser = getSessionUsername(store.get(ADMIN_COOKIE_NAME)?.value) || '';

  return (
    <div>
      <Link href="/admin" className="text-sm text-blue-700 hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1 text-gray-800">Accounts</h1>
      <p className="text-sm text-gray-600 mb-5 max-w-2xl">
        Anyone listed here can edit the whole site, including this page. Removing
        an account takes effect immediately, though a session already signed in
        stays valid until it expires.
      </p>

      <UsersManager initialUsers={listUsers()} currentUser={currentUser} />
    </div>
  );
}
