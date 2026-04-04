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
            const isActive = pathname === item.href;
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

              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-stone-600/50 p-4">
        <p className="text-center text-xs text-stone-500">
          Eaglestone Field CRM v1.0
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
