"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useDeleteArchive } from "@/hooks/use-archive";
import { useToast } from "@/components/ui/toast";
import { ArchiveListResponse } from "@/types/archive";
import { Calendar, Briefcase, Code, Trash2, ArrowRight, Loader2, Database } from "lucide-react";

interface ArchiveCardProps {
  archive: ArchiveListResponse;
  onDeleted: () => void;
}

export function ArchiveCard({ archive, onDeleted }: ArchiveCardProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const { deleteArchive, loading: isDeleting } = useDeleteArchive();
  const toast = useToast();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation on click
    try {
      await deleteArchive(archive.id);
      toast.success(`Archive "${archive.title}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      onDeleted();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete archived resume.");
    }
  };

  const formattedDate = new Date(archive.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <>
      <Card className="flex flex-col h-full bg-white border border-slate-200 text-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group relative">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
              {archive.title}
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-4 flex-grow space-y-3">
          {/* Vault Name */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="line-clamp-1">Vault: {archive.vault_name}</span>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <Code className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-slate-900">{archive.summary.project_count}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Projects</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <Briefcase className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-slate-900">{archive.summary.internship_count}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Experiences</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <Link href={`/dashboard/archive/${archive.id}`} className="flex-grow">
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs h-8.5 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>View Resume</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              setIsDeleteModalOpen(true);
            }}
            className="flex items-center justify-center hover:bg-red-700 bg-red-650 h-8.5 w-8.5 cursor-pointer shrink-0"
            title="Delete Resume"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Resume Archive"
        description="Are you absolutely sure you want to delete this resume?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-semibold leading-relaxed">
            This will permanently delete the archived resume <span className="font-bold text-slate-800">"{archive.title}"</span> from your record and S3 cloud storage. This action cannot be undone.
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
    </>
  );
}
export default ArchiveCard;
