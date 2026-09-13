"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CreditCard,
  HandCoins,
  History,
  LayoutDashboard,
  Package,
  RotateCcw,
  Shirt,
  ShoppingCart,
  Store,
  Target,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  RotateCcw,
  Shirt,
  Truck,
  Users,
  Store,
  CreditCard,
  HandCoins,
  Wallet,
  Target,
  BarChart3,
  Bell,
  History,
};

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const sections = {};

  NAV_ITEMS.forEach((item) => {
    (sections[item.section] ||= []).push(item);
  });

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-5 dark:border-zinc-800">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              L
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-50">LUNOR</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Business Manager</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                {section}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = ICONS[item.icon] || LayoutDashboard;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
                        )}
                      >
                        <Icon className={cn("size-4.5 shrink-0", active ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500")} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-[11px] text-zinc-400">{APP_NAME}</p>
          <p className="mt-0.5 text-[11px] text-zinc-300 dark:text-zinc-600">Monitoring your business. 24/7.</p>
        </div>
      </aside>
    </>
  );
}