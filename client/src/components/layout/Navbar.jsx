"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, LogOut, Menu, Moon, Settings, Sun, User as UserIcon, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, getStoredAuth } from "@/services/api";
import { getInitialsColor, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [userMenu, setUserMenu] = useState(false);
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("lunor_theme", next ? "dark" : "light");
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 md:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden items-center gap-2 text-sm text-zinc-400 sm:flex">
        <span className="font-medium text-zinc-600 dark:text-zinc-300">Welcome back,</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{user?.name?.split(" ")[0]}</span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationsBell onMarkAll={markAllRead} />
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
        </button>

        <div className="relative ml-1">
          <button
            onClick={() => setUserMenu((v) => !v)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full text-xs font-bold text-white",
              getInitialsColor(user?.name)
            )}
          >
            {initials(user?.name) || "U"}
          </button>
          {userMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
              <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 animate-scale-in">
                <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user?.name}</p>
                  <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                  <p className="mt-1 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {user?.role}
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserMenu(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Settings className="size-4" /> Settings
                </Link>
                <a
                  href={`mailto:${user?.email}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <UserIcon className="size-4" /> Profile
                </a>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationsBell({ onMarkAll }) {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;
  return (
    <div className="relative">
      <Link
        href="/notifications"
        className="relative flex size-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="Notifications"
      >
        <span className="relative">
          <Bell className="size-4.5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex size-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-zinc-900">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </span>
      </Link>
      {onMarkAll && count > 0 && (
        <button
          onClick={onMarkAll}
          title="Mark all as read"
          className="absolute -bottom-1 -right-1 rounded-full bg-emerald-100 p-1 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400"
        >
          <CheckCheck className="size-3" />
        </button>
      )}
    </div>
  );
}

function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => api.get("/notifications/unread-count"),
    refetchInterval: 60000,
    enabled: typeof window !== "undefined" && !!getStoredAuth()?.token,
  });
}

export { Navbar };