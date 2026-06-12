"use client";

import { Flame } from "lucide-react";

export default function ForgePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Resume Forge</h1>
        <p className="text-sm text-slate-500 font-semibold">Generate highly targeted and ATS-optimized resumes.</p>
      </div>
      
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl h-80 bg-white p-6 text-center">
        <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-600 mb-4">
          <Flame className="w-8 h-8 animate-pulse" />
        </div>
        <p className="text-slate-700 font-bold text-lg">Forge Engine Pipeline</p>
        <p className="text-slate-400 text-sm mt-1 font-semibold max-w-sm leading-relaxed">
          Coming soon &mdash; Feed job descriptions to rewrite project bullets, match skills, and compile LaTeX PDF resumes.
        </p>
      </div>
    </div>
  );
}
