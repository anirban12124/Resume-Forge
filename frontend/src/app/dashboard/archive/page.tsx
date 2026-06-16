"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useArchiveList } from "@/hooks/use-archive";
import { ArchiveCard } from "@/components/archive/archive-card";
import { Button } from "@/components/ui/button";
import { Archive, Plus, ArrowLeft, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function ArchivePage() {
  const [page, setPage] = useState<number>(1);
  const { archives, loading, error, mutate } = useArchiveList(page);

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const hasNextPage = archives ? archives.length === 20 : false;
  const hasPrevPage = page > 1;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Resume Archive</h1>
          <p className="text-sm text-slate-500 font-semibold">
            Access and manage all of your tailored, compiled resumes.
          </p>
        </div>

        <Link href="/dashboard/forge" className="self-start sm:self-auto">
          <Button className="bg-primary hover:bg-primary-hover font-bold text-sm tracking-wide shadow-md flex items-center gap-2">
            <Plus className="w-4.5 h-4.5" />
            <span>Forge New Resume</span>
          </Button>
        </Link>
      </div>

      {/* Main Workspace display */}
      {loading ? (
        // Loading skeleton
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-slate-200 rounded-xl bg-white p-6 h-48 space-y-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-48 bg-slate-150 rounded" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-10 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Error card
        <div className="flex items-center gap-3 p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl max-w-xl mx-auto shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="flex-1 text-sm font-semibold">{error}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="border-red-200 text-red-800 hover:bg-red-100/50 bg-white font-bold h-8"
          >
            Retry
          </Button>
        </div>
      ) : archives && archives.length > 0 ? (
        <div className="space-y-8">
          {/* Card list grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archives.map((archive) => (
              <ArchiveCard key={archive.id} archive={archive} onDeleted={mutate} />
            ))}
          </div>

          {/* Pagination Controls */}
          {(hasPrevPage || hasNextPage) && (
            <div className="flex items-center justify-center gap-4 border-t border-slate-100 pt-6">
              <Button
                variant="outline"
                onClick={handlePrevPage}
                disabled={!hasPrevPage}
                className="flex items-center gap-1.5 font-bold text-xs h-9"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
              
              <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
                Page {page}
              </span>

              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={!hasNextPage}
                className="flex items-center gap-1.5 font-bold text-xs h-9"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Empty state
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl h-96 bg-white p-8 text-center max-w-xl mx-auto shadow-sm">
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-primary mb-5 shadow-inner">
            <Archive className="w-10 h-10" />
          </div>
          <p className="text-slate-900 font-extrabold text-xl">No Resumes Generated Yet</p>
          <p className="text-slate-450 text-xs mt-2 font-bold max-w-sm leading-relaxed">
            Feed a job description to the optimization pipeline to rewrite experience bullets, match skills, and compile your first resume.
          </p>
          <Link href="/dashboard/forge" className="mt-6">
            <Button className="bg-primary hover:bg-primary-hover font-bold text-sm tracking-wide shadow-md flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Forge Resume</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
