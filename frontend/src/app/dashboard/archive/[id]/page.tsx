"use client";

import { useParams } from "next/navigation";
import { Archive } from "lucide-react";

export default function ArchiveDetailPage() {
  const params = useParams();
  const id = params?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Archive Details</h1>
        <p className="text-sm text-slate-500 font-semibold">View information and LaTeX source code for this forged resume.</p>
      </div>
      
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl h-80 bg-white p-6 text-center">
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 mb-4">
          <Archive className="w-8 h-8" />
        </div>
        <p className="text-slate-700 font-bold text-lg">Resume details: {id}</p>
        <p className="text-slate-400 text-sm mt-1 font-semibold max-w-sm leading-relaxed">
          Coming soon &mdash; Inspect PDF render, view LaTeX source segments, or re-forge configurations.
        </p>
      </div>
    </div>
  );
}
