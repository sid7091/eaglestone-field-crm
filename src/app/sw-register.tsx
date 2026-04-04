'use client';

/**
 * SWRegister
 *
 * Invisible client component that bootstraps the service worker and
 * listens for SW update notifications. Rendered once in the root layout.
 */

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sync-manager';

export default function SWRegister(): null {
  useEffect(() => {
    registerServiceWorker();

    // Listen for the custom event emitted by the SW update handler.
    const handleUpdate = () => {
      // Surfaces a simple console notice. Replace with a toast / banner as
      // the UI layer matures.
      console.info(
        '[App] A new version of Eaglestone CRM is available. Reload to update.'
      );
    };

    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  return null;
}
