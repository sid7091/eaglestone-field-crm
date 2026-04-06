"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PlanVisitModal from "./PlanVisitModal";

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [visitModalPurpose, setVisitModalPurpose] = useState<string | undefined>(undefined);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const actions = [
    {
      label: "New Client Visit",
      onClick: () => { setOpen(false); setVisitModalPurpose("SALES_PITCH"); setVisitModalOpen(true); },
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      bg: "bg-emerald-500",
    },
    {
      label: "Post Follow Up",
      onClick: () => { setOpen(false); setVisitModalPurpose("ORDER_FOLLOWUP"); setVisitModalOpen(true); },
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
      bg: "bg-amber-500",
    },
    {
      label: "Add Customer",
      onClick: () => { setOpen(false); router.push("/customers/new"); },
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      ),
      bg: "bg-blue-500",
    },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Action items — expand upward from FAB */}
        <div className="mb-3 flex flex-col items-end gap-2">
          {actions.map((action, i) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex items-center gap-2.5 rounded-full bg-white pl-4 pr-3 py-2 shadow-lg ring-1 ring-stone-200/60 transition-all duration-200 hover:shadow-xl"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.9)",
                transitionDelay: open ? `${i * 50}ms` : "0ms",
                pointerEvents: open ? "auto" : "none",
              }}
            >
              <span className="text-sm font-medium text-stone-700 whitespace-nowrap">
                {action.label}
              </span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${action.bg} text-white`}>
                {action.icon}
              </span>
            </button>
          ))}
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-200 ${
            open
              ? "bg-stone-700 hover:bg-stone-800 rotate-45"
              : "bg-amber-500 hover:bg-amber-600"
          }`}
          aria-label={open ? "Close menu" : "Quick actions"}
        >
          <svg
            className="h-6 w-6 text-white transition-transform duration-200"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Plan Visit Modal */}
      <PlanVisitModal
        open={visitModalOpen}
        onClose={() => { setVisitModalOpen(false); setVisitModalPurpose(undefined); }}
        defaultPurpose={visitModalPurpose}
      />
    </>
  );
}
