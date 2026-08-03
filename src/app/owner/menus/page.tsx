import { redirect } from 'next/navigation';

/** /owner/menus was a guessed path showing fallback content instead of 404.
 *  Redirect to the real multi-menu manager. */
export default function OwnerMenusRedirect() {
  redirect('/owner/restaurants');
}
