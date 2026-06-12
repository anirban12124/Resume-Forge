"use client";

import Link from "next/link";
import { NavLinks } from "./nav-links";
import { Flame, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile drawer overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-slate-950 border-r border-slate-900 text-slate-100 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto h-screen",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-900">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-white">
            <Flame className="w-6 h-6 text-primary fill-primary/10" />
            <span>ResumeForge</span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Main Navigation Links */}
        <div className="flex-1 overflow-y-auto">
          <NavLinks onItemClick={onClose} />
        </div>
        
        {/* Sidebar Footer details */}
        <div className="p-4 border-t border-slate-900 text-xs text-slate-500 text-center font-medium">
          &copy; {new Date().getFullYear()} ResumeForge
        </div>
      </aside>
    </>
  );
}
