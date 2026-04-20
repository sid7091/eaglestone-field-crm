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

  if (!online) {
    return (
      <div className="flex items-center justify-center gap-2 bg-danger/10 px-4 py-2 text-center font-display text-[11px] font-semibold tracking-wide text-danger">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
        YOU&apos;RE OFFLINE — VISITS &amp; CUSTOMERS WILL SYNC WHEN YOU RECONNECT
        {pendingCount > 0 && (
          <span className="rounded-xs bg-danger/20 px-1.5 py-0.5 font-mono text-[10px]">
            {pendingCount} PENDING
          </span>
        )}
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="flex items-center justify-center gap-2 bg-info/10 px-4 py-2 text-center font-display text-[11px] font-semibold tracking-wide text-info">
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        SYNCING {pendingCount} PENDING {pendingCount === 1 ? "ITEM" : "ITEMS"}…
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center justify-center gap-2 bg-warning/10 px-4 py-2 text-center font-display text-[11px] font-semibold tracking-wide text-warning">
        {pendingCount} {pendingCount === 1 ? "ITEM" : "ITEMS"} WAITING TO SYNC
        <button
          onClick={handleManualSync}
          className="rounded-xs bg-warning/20 px-2 py-0.5 font-display text-[10px] font-semibold tracking-wide text-warning transition-colors hover:bg-warning/30"
        >
          SYNC NOW
        </button>
      </div>
    );
  }

  return null;
}
