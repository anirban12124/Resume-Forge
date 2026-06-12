"use client";

import { Archive } from "lucide-react";

export default function ArchivePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Resume Archive</h1>
        <p className="text-sm text-slate-500 font-semibold">Browse and manage previously generated resumes and code sources.</p>
      </div>
      
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl h-80 bg-white p-6 text-center">
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 mb-4">
          <Archive className="w-8 h-8" />
        </div>
        <p className="text-slate-700 font-bold text-lg">Resumes Library</p>
        <p className="text-slate-400 text-sm mt-1 font-semibold max-w-sm leading-relaxed">
          Coming soon &mdash; View compilations, inspect raw LaTeX code strings, and download PDF outputs using secure AWS S3.
        </p>
      </div>
    </div>
  );
}
