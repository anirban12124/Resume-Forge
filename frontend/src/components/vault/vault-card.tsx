"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useDeleteVault } from "@/hooks/use-vaults";
import { useToast } from "@/components/ui/toast";
import { VaultListResponse } from "@/types/vault";
import { Calendar, Briefcase, Code, GitBranch, Trash2, Edit2, Loader2 } from "lucide-react";

interface VaultCardProps {
  vault: VaultListResponse;
  onDeleted: () => void;
}

export function VaultCard({ vault, onDeleted }: VaultCardProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { deleteVault, loading: isDeleting } = useDeleteVault();
  const toast = useToast();

  const handleDelete = async () => {
    try {
      await deleteVault(vault.id);
      toast.success(`Vault "${vault.name}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      onDeleted();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete vault.");
    }
  };

  const isRecent = () => {
    // Show "Processing..." if created within the last 45 seconds and github_sync_status is true
    const createdTime = new Date(vault.created_at).getTime();
    const now = new Date().getTime();
    return vault.github_sync_status && (now - createdTime < 45000);
  };

  const formattedDate = new Date(vault.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Card className="flex flex-col h-full bg-white border border-slate-200 text-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group relative">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
              {vault.name}
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>Created {formattedDate}</span>
            </div>
          </div>

          {/* Sync indicator */}
          <div className="shrink-0">
            {isRecent() ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-100 text-amber-700">
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                <span>Processing...</span>
              </span>
            ) : vault.github_sync_status ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-100 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>GitHub Synced</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 border border-slate-200 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Sync Off</span>
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-6 flex-grow">
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="p-1.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Code className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-slate-900 leading-none">{vault.project_count}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Projects</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="p-1.5 rounded bg-orange-50 border border-orange-100 text-orange-600">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-slate-900 leading-none">{vault.internship_count}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Internships</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <Link href={`/dashboard/vaults/${vault.id}/edit`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 justify-center"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Details</span>
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-1.5 hover:bg-red-700 bg-red-650"
            title="Delete Knowledge Vault"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Knowledge Vault"
        description="Are you absolutely sure you want to delete this vault?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-semibold leading-relaxed">
            This will permanently delete the vault <span className="font-bold text-slate-800">"{vault.name}"</span> and all of its associated projects and internships. This action cannot be undone.
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
                  <span>Delete Vault</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
