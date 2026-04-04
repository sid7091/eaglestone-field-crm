"use client";

import { useEffect, useState } from "react";
import { isOnline, onConnectivityChange, syncPendingData } from "@/lib/sync-manager";
import { getPendingItems } from "@/lib/offline-store";

export default function ConnectivityBanner() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(isOnline());

    const unsubscribe = onConnectivityChange(async (isConnected) => {
      setOnline(isConnected);
      if (isConnected) {
        await checkPending();
        // Auto-sync when back online
        setSyncing(true);
        await syncPendingData();
        await checkPending();
        setSyncing(false);
      }
    });

    checkPending();
    const interval = setInterval(checkPending, 30_000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  async function checkPending() {
    try {
      const visits = await getPendingItems("pending-visits");
      const customers = await getPendingItems("pending-customers");
      setPendingCount(visits.length + customers.length);
    } catch {
      // IndexedDB not available (SSR or unsupported)
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    await syncPendingData();
    await checkPending();
    setSyncing(false);
  }

  // Offline banner
  if (!online) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
        <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
        You&apos;re offline. Changes will sync when connected.
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-700 px-2 py-0.5 text-xs">
            {pendingCount} pending
          </span>
        )}
      </div>
    );
  }

  // Syncing banner
  if (syncing) {
    return (
      <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        Syncing {pendingCount} pending items...
      </div>
    );
  }

  // Pending items while online
  if (pendingCount > 0) {
    return (
      <div className="bg-stone-100 text-stone-700 px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
        {pendingCount} items pending sync.
        <button
          onClick={handleManualSync}
          className="rounded bg-brand-accent px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-accent/90"
        >
          Sync Now
        </button>
      </div>
    );
  }

  return null;
}
