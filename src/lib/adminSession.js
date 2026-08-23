import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, getSessionUsername } from './adminAuth';
import { findUser } from './adminUsers';

// The display name of whoever is signed in — "Herb", "Lolo" — as it should
// appear in a byline. Used to pre-fill the author on new content.
//
// Deliberately the display name rather than the username: the author field is
// free text that already contains "Herb", "Lolo", "Tommy" and "Andrew", and
// bylines have to keep reading the same way they always have. Tommy and Andrew
// have no accounts and never will, which is exactly why this only ever
// suggests a default and never constrains the field.
export async function currentUserName() {
  try {
    const store = await cookies();
    const username = getSessionUsername(store.get(ADMIN_COOKIE_NAME)?.value);
    if (!username) return '';
    const user = findUser(username);
    return user?.name || username;
  } catch {
    return '';
  }
}
