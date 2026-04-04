"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  // ─── Field CRM ────────────────────────────
  {
    name: "Field Dashboard",
    href: "/field-dashboard",
    icon: "M3 13.5h4.5v6H3v-6zm0-9h4.5v6H3v-6zm6.75 0H18v4.5H9.75V4.5zm0 6.75H18V18H9.75v-6.75z",
  },
  {
    name: "Customers",
    href: "/customers",
    icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16V17a6.002 6.002 0 0112-1.93M12 10a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    name: "Visits",
    href: "/visits",
    icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z",
  },
  {
    name: "Field Inventory",
    href: "/field-inventory",
    icon: "M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9",
  },
  // ─── Factory / Production ─────────────────
  {
    name: "Raw Blocks",
    href: "/blocks",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    name: "Production",
    href: "/production",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    children: [
      { name: "Gang Saw", href: "/production/gang-saw" },
      { name: "Epoxy / Vacuum", href: "/production/epoxy" },
      { name: "Polishing", href: "/production/polishing" },
    ],
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  },
  {
    name: "Machines",
    href: "/machines",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-stone-600/50 px-4">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <Image
            src="/logo.svg"
            alt="Eagle Stone"
            width={140}
            height={60}
            className="h-10 w-auto text-brand-cream"
            style={{ filter: "brightness(0) invert(93%) sepia(8%) saturate(300%) hue-rotate(15deg)" }}
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.children &&
                item.children.some((child) => pathname.startsWith(child.href)));
            const isParentActive =
              item.href !== "/" && pathname.startsWith(item.href);

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive || isParentActive
                      ? "bg-stone-700/60 text-brand-accent"
                      : "text-stone-300 hover:bg-stone-700/40 hover:text-white"
                  )}
                >
                  <svg
                    className="h-5 w-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={item.icon}
                    />
                  </svg>
                  {item.name}
                </Link>

                {/* Sub-navigation */}
                {item.children && (isActive || isParentActive) && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.name}>
                        <Link
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            pathname === child.href ||
                              pathname.startsWith(child.href)
                              ? "text-brand-accent"
                              : "text-stone-400 hover:text-white"
                          )}
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-stone-600/50 p-4">
        <p className="text-center text-xs text-stone-500">
          Eagle Stone ERP v1.0
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar (slide-in drawer) */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-brand-dark text-white transition-transform duration-200 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-4 z-10 rounded-lg p-1 text-stone-400 hover:text-white"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-brand-dark text-white lg:block">
        {sidebarContent}
      </aside>
    </>
  );
}
