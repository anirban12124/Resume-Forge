"use client";

import React from "react";
import Link from "next/link";
import { useVaultList } from "@/hooks/use-vaults";
import { VaultCard } from "@/components/vault/vault-card";
import { Button } from "@/components/ui/button";
import { Database, Plus, Loader2, AlertCircle, Info } from "lucide-react";

export default function VaultsPage() {
  const { vaults, loading, error, mutate } = useVaultList();

  const maxVaultsReached = vaults ? vaults.length >= 3 : false;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Knowledge Vaults</h1>
          <p className="text-sm text-slate-500 font-semibold">
            Manage your professional constants, education details, skills, and projects.
          </p>
        </div>

        <div className="relative group self-start sm:self-auto">
          <Link href={maxVaultsReached ? "#" : "/dashboard/vaults/new"}>
            <Button
              disabled={maxVaultsReached || loading}
              className="bg-primary hover:bg-primary-hover font-bold text-sm tracking-wide shadow-md flex items-center gap-2"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Create Vault</span>
            </Button>
          </Link>
          {maxVaultsReached && (
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center gap-1.5 p-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold shadow-lg w-56 z-20 pointer-events-none">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Max limit of 3 vaults reached. Delete one to create a new vault.</span>
            </div>
          )}
        </div>
      </div>

      {/* Main content display */}
      {loading ? (
        // Grid Loading Skeleton
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-slate-200 rounded-xl bg-white p-6 h-48 space-y-4 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-4.5 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-24 bg-slate-200 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-200 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="h-12 bg-slate-100 rounded-lg" />
                <div className="h-12 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Error state
        <div className="flex items-center gap-3 p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl max-w-2xl mx-auto">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="flex-1 text-sm font-semibold">
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="border-red-200 text-red-800 hover:bg-red-100/50 bg-white font-bold h-8"
          >
            Retry Fetch
          </Button>
        </div>
      ) : vaults && vaults.length > 0 ? (
        // Vaults list grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vaults.map((vault) => (
            <VaultCard key={vault.id} vault={vault} onDeleted={mutate} />
          ))}
        </div>
      ) : (
        // Empty state page
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl h-96 bg-white p-8 text-center max-w-2xl mx-auto shadow-sm">
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-primary mb-5 shadow-inner">
            <Database className="w-10 h-10" />
          </div>
          <p className="text-slate-900 font-extrabold text-xl">Create your first Knowledge Vault</p>
          <p className="text-slate-450 text-xs mt-2 font-bold max-w-md leading-relaxed">
            Ingest your resume PDF or paste LaTeX code to organize your profile. You can host up to 3 vaults to generate targeted job descriptions.
          </p>
          <Link href="/dashboard/vaults/new" className="mt-6">
            <Button className="bg-primary hover:bg-primary-hover font-bold text-sm tracking-wide shadow-md flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Get Started</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
