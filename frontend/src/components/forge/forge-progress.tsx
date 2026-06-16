"use client";

import React from "react";
import { Loader2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { ForgeStatusResponse } from "@/types/forge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ForgeProgressProps {
  status: ForgeStatusResponse | null;
  error: string | null;
  onReset: () => void;
}

const STEPS = [
  { key: "parsing_jd", label: "Parsing Job Description & Requirements" },
  { key: "selecting_projects", label: "Selecting Relevant Projects & Experiences" },
  { key: "generating_content", label: "Tailoring Resume Content via LLM" },
  { key: "compiling_latex", label: "Compiling LaTeX Code to PDF Document" },
  { key: "uploading", label: "Uploading Generated Files to Vault Storage" }
];

const STATUS_ORDER: Record<string, number> = {
  "queued": -1,
  "parsing_jd": 0,
  "selecting_projects": 1,
  "generating_content": 2,
  "compiling_latex": 3,
  "uploading": 4,
  "completed": 5,
  "failed": 6
};

export function ForgeProgress({ status, error, onReset }: ForgeProgressProps) {
  const currentStatus = status?.status || "queued";
  const currentIndex = STATUS_ORDER[currentStatus] ?? -1;

  return (
    <div className="max-w-xl mx-auto border border-slate-800 bg-slate-950 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Title & Loader */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-slate-100 tracking-tight">Forging Resume...</h2>
          <p className="text-xs text-slate-500 font-semibold">Running AI content tailoring and LaTeX build pipelines</p>
        </div>
        {!error && currentStatus !== "completed" && (
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        )}
      </div>

      {/* Steps List */}
      <div className="space-y-4 relative pl-3.5 before:absolute before:left-6 before:top-4 before:bottom-4 before:w-[1.5px] before:bg-slate-850">
        {STEPS.map((step, index) => {
          const isCompleted = currentIndex > index || currentStatus === "completed";
          const isActive = currentIndex === index && currentStatus !== "failed";
          const isFailed = currentIndex === index && currentStatus === "failed";
          const isPending = currentIndex < index;

          return (
            <div key={step.key} className="flex items-center gap-4 relative z-10">
              {/* Step indicator circle */}
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors shrink-0",
                  isCompleted && "bg-indigo-600 border-indigo-600 text-white",
                  isActive && "bg-indigo-950 border-indigo-500 text-indigo-400 animate-pulse",
                  isFailed && "bg-red-950 border-red-500 text-red-400",
                  isPending && "bg-slate-900 border-slate-800 text-slate-500"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isFailed ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  "text-xs font-bold transition-colors",
                  isCompleted && "text-slate-200",
                  isActive && "text-indigo-400",
                  isFailed && "text-red-400",
                  isPending && "text-slate-500"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error or Warning Displays */}
      {error && (
        <div className="p-4 border border-red-950 bg-red-950/20 rounded-xl space-y-3">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-red-400 uppercase tracking-wider">Pipeline Failed</p>
              <p className="text-xs text-slate-350 font-bold leading-relaxed">{error}</p>
            </div>
          </div>
          <Button
            onClick={onReset}
            className="w-full bg-red-650 hover:bg-red-700 text-white font-bold text-xs h-8.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset and Try Again</span>
          </Button>
        </div>
      )}
      
      {/* Fallback check in case of quiet hang */}
      {!error && currentStatus === "queued" && (
        <p className="text-[10px] text-slate-500 font-semibold text-center italic">
          Waiting in pipeline queue...
        </p>
      )}
    </div>
  );
}
