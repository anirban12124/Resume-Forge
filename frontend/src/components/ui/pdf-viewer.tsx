"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface PDFViewerProps {
  url: string | null;
}

export function PDFViewer({ url }: PDFViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [url]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl h-[600px] text-slate-400">
        <AlertCircle className="w-8 h-8 text-slate-500 mb-2" />
        <p className="font-bold text-sm">No PDF URL provided</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[650px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
          <p className="text-slate-400 text-xs font-semibold">Loading PDF preview...</p>
        </div>
      )}
      
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 z-10 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="font-bold text-sm">Failed to load PDF</p>
          <p className="text-xs text-slate-500 mt-1">Please download the PDF directly to view it.</p>
        </div>
      ) : (
        <iframe
          src={url}
          className="w-full h-full border-none"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </div>
  );
}
export default PDFViewer;
