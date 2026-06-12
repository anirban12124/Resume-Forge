"use client";

import { Database } from "lucide-react";

export default function VaultsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Knowledge Vaults</h1>
        <p className="text-sm text-slate-500 font-semibold">Manage your professional constants, skills, and parsed templates.</p>
      </div>
      
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl h-80 bg-white p-6 text-center">
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-primary mb-4">
          <Database className="w-8 h-8" />
        </div>
        <p className="text-slate-700 font-bold text-lg">Vault Management Section</p>
        <p className="text-slate-400 text-sm mt-1 font-semibold max-w-sm leading-relaxed">
          Coming soon &mdash; Create up to 3 separate vaults containing custom projects, internships, and skill tags.
        </p>
      </div>
    </div>
  );
}
