"use client";

import React, { useState } from "react";
import { Copy, Check, FileCode } from "lucide-react";
import { Button } from "./button";

interface CodeViewerProps {
  code: string;
}

export function CodeViewer({ code }: CodeViewerProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="flex flex-col border border-slate-800 rounded-xl bg-slate-950 overflow-hidden shadow-lg w-full">
      {/* Code Viewer Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-900 bg-slate-950/60">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span>LaTeX Source Code</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-900 font-bold h-7.5 text-xs flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Source</span>
            </>
          )}
        </Button>
      </div>

      {/* Code Text Area */}
      <div className="p-4 overflow-auto max-h-[500px]">
        <pre className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap select-all">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
export default CodeViewer;
