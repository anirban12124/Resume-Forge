"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Database, Flame, Archive, Briefcase, ChevronRight } from "lucide-react";

const dashboardSections = [
  {
    href: "/dashboard/vaults",
    title: "Knowledge Vaults",
    description: "Manage your professional data, education, contact info, and parsed skills.",
    icon: Database,
    color: "bg-indigo-50 border-indigo-100 text-indigo-600",
  },
  {
    href: "/dashboard/forge",
    title: "Resume Forge",
    description: "Tailor your experience bullet points and generate targeted LaTeX resumes.",
    icon: Flame,
    color: "bg-orange-50 border-orange-100 text-orange-600",
  },
  {
    href: "/dashboard/archive",
    title: "Resume Archive",
    description: "View, copy raw LaTeX source, and download your forged PDF resumes.",
    icon: Archive,
    color: "bg-emerald-50 border-emerald-100 text-emerald-600",
  },
  {
    href: "/dashboard/jobs",
    title: "Job Listings",
    description: "Browse daily scraped developer openings from top job boards.",
    icon: Briefcase,
    color: "bg-blue-50 border-blue-100 text-blue-600",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Workspace Overview</h1>
        <p className="text-sm text-slate-500 font-semibold">Select a module below to manage your assets or optimize templates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dashboardSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="group">
              <Card className="h-full border border-slate-200 bg-white hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/[0.04] transition-all duration-200 cursor-pointer flex flex-col justify-between p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl border ${section.color} shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-950 group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <span>{section.title}</span>
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed font-semibold">
                      {section.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-primary transition-colors mt-6 self-end uppercase tracking-wider">
                  <span>Open Section</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
