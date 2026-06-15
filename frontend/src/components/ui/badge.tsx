import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-indigo-50 border-indigo-100 text-indigo-700",
    secondary: "bg-slate-100 border-slate-200 text-slate-700",
    success: "bg-emerald-50 border-emerald-150 text-emerald-750",
    warning: "bg-amber-50 border-amber-150 text-amber-750",
    destructive: "bg-red-50 border-red-150 text-red-750",
    info: "bg-blue-50 border-blue-150 text-blue-750",
    outline: "border border-slate-200 text-slate-600 bg-transparent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all duration-150",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
