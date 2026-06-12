"use client";

import { useParams } from "next/navigation";
import { Database } from "lucide-react";

export default function EditVaultPage() {
  const params = useParams();
  const id = params?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Edit Knowledge Vault</h1>
        <p className="text-sm text-slate-500 font-semibold">Modify constants, projects, internships, and skill listings for your resumes.</p>
      </div>
      
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl h-80 bg-white p-6 text-center">
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-primary mb-4">
          <Database className="w-8 h-8" />
        </div>
        <p className="text-slate-700 font-bold text-lg">Edit Vault: {id}</p>
        <p className="text-slate-400 text-sm mt-1 font-semibold max-w-sm leading-relaxed">
          Coming soon &mdash; Edit constant data sections, achievements, and re-sync repositories.
        </p>
      </div>
    </div>
  );
}
