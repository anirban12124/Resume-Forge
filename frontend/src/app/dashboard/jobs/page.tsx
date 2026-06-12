"use client";

import { Briefcase } from "lucide-react";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Job Listings</h1>
        <p className="text-sm text-slate-500 font-semibold">Explore recently scraped jobs from Internshala, Wellfound, Indeed, and Naukri.</p>
      </div>
      
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl h-80 bg-white p-6 text-center">
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 mb-4">
          <Briefcase className="w-8 h-8" />
        </div>
        <p className="text-slate-700 font-bold text-lg">Opportunities Board</p>
        <p className="text-slate-400 text-sm mt-1 font-semibold max-w-sm leading-relaxed">
          Coming soon &mdash; Filter and search for positions, view full descriptions, and immediately trigger targeted resume forge pipelines.
        </p>
      </div>
    </div>
  );
}
