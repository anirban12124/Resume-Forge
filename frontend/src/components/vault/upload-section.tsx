"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileCode, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw 
} from "lucide-react";

interface UploadSectionProps {
  onParsed: (data: {
    constants: any;
    skills: any;
    has_summary: boolean;
    parse_confidence_score: number;
    source_origin: string;
    original_filename: string;
  }) => void;
}

export function UploadSection({ onParsed }: UploadSectionProps) {
  const [mode, setMode] = useState<"pdf" | "latex">("pdf");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [latexCode, setLatexCode] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setPdfFile(file);
      } else {
        toast.error("Unsupported file type. Please upload a PDF.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleParse = async () => {
    const formData = new FormData();
    let filename = "";

    if (mode === "pdf") {
      if (!pdfFile) {
        toast.error("Please upload a PDF file first.");
        return;
      }
      formData.append("file", pdfFile);
      filename = pdfFile.name;
    } else {
      if (!latexCode.trim()) {
        toast.error("Please paste LaTeX code first.");
        return;
      }
      const file = new File([latexCode], "resume.tex", { type: "text/plain" });
      formData.append("file", file);
      filename = "resume.tex";
    }

    setIsParsing(true);
    setConfidence(null);
    setParsedFileName(null);
    try {
      const response = await apiFetch("/vaults/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = "Failed to parse resume";
        try {
          const errData = await response.json();
          errorMsg = errData.detail || errorMsg;
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setConfidence(data.parse_confidence_score);
      setParsedFileName(filename);
      toast.success("Resume parsed successfully!");
      onParsed(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while parsing the resume.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-50" />
            <span>Resume Ingestion</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Select a method to ingest and parse your resume data automatically.
          </p>
        </div>

        {/* Tab Toggle buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/50">
          <button
            onClick={() => setMode("pdf")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              mode === "pdf"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload PDF</span>
          </button>
          <button
            onClick={() => setMode("latex")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              mode === "latex"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Paste LaTeX</span>
          </button>
        </div>
      </div>

      {/* Mode Content */}
      {mode === "pdf" ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer ${
            dragActive
              ? "border-primary bg-indigo-50/20"
              : pdfFile
              ? "border-emerald-300 bg-emerald-50/5"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {pdfFile ? (
            <div className="flex flex-col items-center text-center space-y-2.5">
              <div className="p-3 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{pdfFile.name}</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {(pdfFile.size / 1024 / 1024).toFixed(2)} MB &bull; PDF Document
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="border-slate-200 text-slate-500 hover:text-slate-800 font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  setPdfFile(null);
                }}
              >
                Change File
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  Drag and drop your PDF resume here, or <span className="text-primary hover:underline">browse</span>
                </p>
                <p className="text-xs text-slate-400 font-semibold">
                  Only PDF files are supported for parsing upload.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            LaTeX Resume Source
          </label>
          <Textarea
            value={latexCode}
            onChange={(e) => setLatexCode(e.target.value)}
            placeholder="Paste your resume LaTeX code here. e.g. \documentclass{article} ... \begin{document} ..."
            className="font-mono text-xs min-h-[180px] bg-slate-50 border-slate-200 focus:bg-white transition-all"
          />
        </div>
      )}

      {/* Parse Trigger & Confidence Indicators */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
        <Button
          onClick={handleParse}
          disabled={isParsing || (mode === "pdf" ? !pdfFile : !latexCode.trim())}
          className="bg-primary hover:bg-primary-hover font-bold text-sm tracking-wide shadow-md flex items-center gap-2 shrink-0"
        >
          {isParsing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Parsing Resume...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Parse Resume</span>
            </>
          )}
        </Button>

        {/* Confidence score badge and warning details */}
        {confidence !== null && parsedFileName && (
          <div className="flex items-center gap-3 animate-in fade-in duration-200">
            {confidence >= 0.85 ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-955 max-w-sm text-xs">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                <div className="font-semibold leading-normal">
                  <span className="font-bold">Confidence: {(confidence * 100).toFixed(0)}%</span>
                  <p className="text-[10px] text-emerald-600 mt-0.5">High parsing fidelity. Double check contact information fields below.</p>
                </div>
              </div>
            ) : confidence >= 0.5 ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-100 bg-amber-50/50 text-amber-955 max-w-sm text-xs">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 animate-bounce" />
                <div className="font-semibold leading-normal">
                  <span className="font-bold">Confidence: {(confidence * 100).toFixed(0)}%</span>
                  <p className="text-[10px] text-amber-600 mt-0.5">Moderate fidelity. Some formatting wasn't clear. Please check all parsed sections carefully.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-red-100 bg-red-50 text-red-955 max-w-sm text-xs">
                <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                <div className="font-semibold leading-normal">
                  <span className="font-bold">Confidence: {(confidence * 100).toFixed(0)}%</span>
                  <p className="text-[10px] text-red-650 mt-0.5">Low fidelity. Parsing failed on complex elements. Recommend pasting the original LaTeX instead.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
