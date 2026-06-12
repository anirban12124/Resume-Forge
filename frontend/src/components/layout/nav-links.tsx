"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Database, Flame, Archive, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/vaults", label: "Knowledge Vaults", icon: Database },
  { href: "/dashboard/forge", label: "Resume Forge", icon: Flame },
  { href: "/dashboard/archive", label: "Resume Archive", icon: Archive },
  { href: "/dashboard/jobs", label: "Job Listings", icon: Briefcase },
];

export function NavLinks({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-150 group",
              isActive
                ? "bg-primary text-white shadow-md shadow-primary/20 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5 transition-colors duration-150",
                isActive ? "text-white" : "text-slate-400 group-hover:text-white"
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
