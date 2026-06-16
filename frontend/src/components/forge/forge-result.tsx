"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PDFViewer } from "../ui/pdf-viewer";
import { CodeViewer } from "../ui/code-viewer";
import { Button } from "../ui/button";
import { Download, FileCode, Archive, ArrowRight, RefreshCw, CheckCircle } from "lucide-react";
import { ForgeResultResponse } from "@/types/forge";

interface ForgeResultProps {
  result: ForgeResultResponse;
  onReset: () => void;
}

export function ForgeResult({ result, onReset }: ForgeResultProps) {
  const [showCode, setShowCode] = useState<boolean>(false);

  const handleDownload = () => {
    window.open(result.pdf_url, "_blank");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Completion Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border border-emerald-950 bg-emerald-950/10 rounded-2xl">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-slate-100 tracking-tight">Optimization Complete!</h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Your resume has been successfully parsed, tailored, compiled, and archived.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/archive/${result.archive_id}`}>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-350 hover:text-white font-bold text-xs h-9.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Archive className="w-4 h-4 text-indigo-400" />
              <span>Open in Archive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Button
            onClick={onReset}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9.5 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Forge Another</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PDF Document Preview Column (Left, large) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Document Preview
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(!showCode)}
                className="border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-900 font-bold h-8 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>{showCode ? "Hide LaTeX Source" : "View LaTeX Source"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-900 font-bold h-8 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Download PDF</span>
              </Button>
            </div>
          </div>
          
          <PDFViewer url={result.pdf_url} />
        </div>

        {/* Info & Metadata Panel Column (Right, small) */}
        <div className="space-y-6">
          <div className="p-5 border border-slate-800 bg-slate-950 rounded-2xl shadow-xl space-y-4">
            <h4 className="text-xs font-extrabold text-slate-300 tracking-wide uppercase">
              Pipeline Metadata
            </h4>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-900 font-semibold">
                <span className="text-slate-500">Archive ID</span>
                <span className="text-slate-300 font-mono select-all text-[11px]">
                  {result.archive_id.substring(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-900 font-semibold">
                <span className="text-slate-500">Document Type</span>
                <span className="text-slate-300 font-bold">PDF / LaTeX Source</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-900 font-semibold">
                <span className="text-slate-500">Template Used</span>
                <span className="text-slate-300 font-bold">Resume Forge Default</span>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
              The PDF has been compiled using our background LaTeX engine and synced to cloud storage. Fresh presigned access URLs expire after 15 minutes.
            </p>
          </div>
        </div>

      </div>

      {/* Collapsible LaTeX Source Code Viewer */}
      {showCode && (
        <div className="border border-slate-800 bg-slate-950 rounded-2xl p-5 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CodeViewer code={result.tex_content} />
        </div>
      )}

    </div>
  );
}
export default ForgeResult;
