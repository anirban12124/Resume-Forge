"use client";

import { useAuth } from "@/hooks/use-auth";
import { Menu, LogOut, User as UserIcon } from "lucide-react";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200 text-slate-800 shadow-sm shrink-0">
      {/* Mobile Sidebar toggle trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          aria-label="Open menu"
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden transition-colors cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="hidden md:inline text-sm text-slate-500 font-semibold">
          Welcome back to your workspace
        </span>
      </div>

      {/* User profile details and actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-primary font-semibold text-sm border border-indigo-100">
            {user?.full_name ? (
              user.full_name.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <span className="hidden sm:inline text-sm font-bold text-slate-700">
            {user?.full_name || user?.email}
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-slate-200" />

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 hover:bg-opacity-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
