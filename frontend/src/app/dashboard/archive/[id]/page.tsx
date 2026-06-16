"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useArchiveDetail, useDeleteArchive } from "@/hooks/use-archive";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { CodeViewer } from "@/components/ui/code-viewer";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Download,
  FileCode,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Database,
  Calendar,
  Layers,
  Settings
} from "lucide-react";

interface ArchiveDetailPageProps {
  params: {
    id: string;
  };
}

export default function ArchiveDetailPage({ params }: ArchiveDetailPageProps) {
  const { id } = params;
  const router = useRouter();
  const toast = useToast();

  const { archive, loading, error } = useArchiveDetail(id);
  const { deleteArchive, loading: isDeleting } = useDeleteArchive();

  const [showCode, setShowCode] = useState<boolean>(false);
  const [isJdOpen, setIsJdOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const handleDelete = async () => {
    try {
      await deleteArchive(id);
      toast.success("Resumed deleted from archive successfully.");
      setIsDeleteModalOpen(false);
      router.push("/dashboard/archive");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete archived resume.");
    }
  };

  const handleDownload = () => {
    if (archive?.pdf_url) {
      window.open(archive.pdf_url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-96">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-semibold">Retrieving archive details...</p>
      </div>
    );
  }

  if (error || !archive) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-red-200 bg-red-50 text-red-800 rounded-2xl max-w-xl mx-auto text-center shadow-sm">
        <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
        <p className="font-bold text-sm">Failed to load archived resume</p>
        <p className="text-xs text-red-600 mt-1">{error || "Archive entry not found."}</p>
        <Link href="/dashboard/archive" className="mt-6">
          <Button variant="outline" className="border-red-200 text-red-800 hover:bg-red-100/50 bg-white font-bold text-xs h-9">
            Back to Archive
          </Button>
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(archive.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="space-y-6">
      
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/archive">
            <Button
              variant="outline"
              size="icon"
              className="border-slate-200 hover:bg-slate-50 text-slate-700 h-9.5 w-9.5 rounded-lg flex items-center justify-center cursor-pointer shadow-sm"
              title="Back to listing"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight line-clamp-1">
              {archive.title}
            </h1>
            <div className="flex items-center gap-4 text-[11px] text-slate-450 font-bold">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Generated {formattedDate}</span>
              </span>
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Vault: {archive.vault_name}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Re-forge button */}
          <Link
            href={`/dashboard/forge?vault_id=${archive.vault_id}&jd=${encodeURIComponent(
              archive.jd_text
            )}`}
          >
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs h-9 px-3 flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Re-forge Pipeline</span>
            </Button>
          </Link>

          {/* Download PDF button */}
          <Button
            variant="outline"
            onClick={handleDownload}
            className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs h-9 px-3 flex items-center gap-1.5 shadow-sm cursor-pointer bg-white"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Download</span>
          </Button>

          {/* Toggle LaTeX code */}
          <Button
            variant="outline"
            onClick={() => setShowCode(!showCode)}
            className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs h-9 px-3 flex items-center gap-1.5 shadow-sm cursor-pointer bg-white"
          >
            <FileCode className="w-4 h-4 text-indigo-500" />
            <span>{showCode ? "Hide LaTeX" : "View LaTeX"}</span>
          </Button>

          {/* Delete archive entry */}
          <Button
            variant="destructive"
            onClick={() => setIsDeleteModalOpen(true)}
            className="hover:bg-red-700 bg-red-650 font-bold text-xs h-9 w-9 flex items-center justify-center cursor-pointer shadow-sm shrink-0"
            title="Delete archived resume"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Preview workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PDF viewer container column (Left, large) */}
        <div className="lg:col-span-2 space-y-4">
          <PDFViewer url={archive.pdf_url} />
        </div>

        {/* Metadata sidebar column (Right, small) */}
        <div className="space-y-6">
          
          {/* Collapsible Job Description panel */}
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => setIsJdOpen(!isJdOpen)}
              className="flex items-center justify-between w-full p-4.5 bg-slate-50 border-b border-slate-100 text-left font-bold text-xs text-slate-700 tracking-wide uppercase group cursor-pointer"
            >
              <span>Target Job Description</span>
              {isJdOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-650 transition-colors" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-650 transition-colors" />
              )}
            </button>
            
            {isJdOpen && (
              <div className="p-4 max-h-60 overflow-y-auto text-xs text-slate-600 font-semibold leading-relaxed whitespace-pre-wrap select-text bg-white">
                {archive.jd_text}
              </div>
            )}
          </div>

          {/* Pipeline Details panel */}
          <div className="border border-slate-200 rounded-2xl bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wide">
              <Settings className="w-4 h-4 text-indigo-500" />
              <span>Forge Parameters</span>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-semibold text-slate-600">
                <span>Projects Injected</span>
                <span className="text-slate-900 font-bold">{archive.summary.project_count}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-semibold text-slate-600">
                <span>Experiences Injected</span>
                <span className="text-slate-900 font-bold">{archive.summary.internship_count}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-semibold text-slate-600">
                <span>Domain Focus</span>
                <span className="text-slate-900 font-bold bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full capitalize text-[10px]">
                  {archive.forge_config?.role_domain || "Software Engineering"}
                </span>
              </div>
              
              {/* Warnings display if present */}
              {archive.forge_config?.warning_message && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-relaxed font-semibold flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{archive.forge_config.warning_message}</span>
                </div>
              )}
              
              {/* Fallback indicators */}
              {archive.forge_config?.pdf_fallback_used && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed font-semibold flex gap-2">
                  <Layers className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>Compiled using standard text stream fallback (Tectonic was not installed in host server path).</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* LaTeX Code code block */}
      {showCode && (
        <div className="border border-slate-200 bg-slate-950 rounded-2xl p-5 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CodeViewer code={archive.tex_content} />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Resume Archive"
        description="Are you absolutely sure you want to delete this resume?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-semibold leading-relaxed">
            This will permanently delete the archived resume <span className="font-bold text-slate-800">"{archive.title}"</span> from your account and S3 cloud storage. This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="border-slate-200 text-slate-700 font-semibold"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 font-bold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Resume</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
