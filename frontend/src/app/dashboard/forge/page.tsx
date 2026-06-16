"use client";

import React, { Suspense } from "react";
import { useForge } from "@/hooks/use-forge";
import { ForgeConfig } from "@/components/forge/forge-config";
import { ForgeProgress } from "@/components/forge/forge-progress";
import { ForgeResult } from "@/components/forge/forge-result";
import { Flame, Loader2 } from "lucide-react";

function ForgeContent() {
  const {
    triggerForge,
    forgeStatus,
    forgeResult,
    isForging,
    error,
    reset
  } = useForge();

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Resume Forge</h1>
        <p className="text-sm text-slate-500 font-semibold">
          Generate highly targeted and ATS-optimized resumes compiled directly in LaTeX.
        </p>
      </div>

      {/* Pipeline State Switcher */}
      <div className="pt-2">
        {forgeResult ? (
          <ForgeResult result={forgeResult} onReset={reset} />
        ) : isForging ? (
          <ForgeProgress status={forgeStatus} error={error} onReset={reset} />
        ) : (
          <ForgeConfig onSubmit={triggerForge} isForging={isForging} />
        )}
      </div>
    </div>
  );
}

export default function ForgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 border border-slate-200 rounded-2xl bg-white h-80">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-slate-400 text-xs font-semibold">Initializing Forge Workspace...</p>
        </div>
      }
    >
      <ForgeContent />
    </Suspense>
  );
}
