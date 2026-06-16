"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useVaultList, useVault } from "@/hooks/use-vaults";
import { Select } from "../ui/select";
import { Slider } from "../ui/slider";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { ForgeRunRequest } from "@/types/forge";

interface ForgeConfigProps {
  onSubmit: (config: ForgeRunRequest) => void;
  isForging: boolean;
}

export function ForgeConfig({ onSubmit, isForging }: ForgeConfigProps) {
  const searchParams = useSearchParams();
  const jdQuery = searchParams.get("jd") || "";
  const vaultIdQuery = searchParams.get("vault_id") || "";

  const { vaults, loading: vaultsLoading, error: vaultsError } = useVaultList();
  
  const [selectedVaultId, setSelectedVaultId] = useState<string>("");
  const [projectCount, setProjectCount] = useState<number>(1);
  const [internshipCount, setInternshipCount] = useState<number>(0);
  const [jdText, setJdText] = useState<string>("");

  // Detailed view of selected vault to know max projects/internships
  const { vault, loading: vaultLoading } = useVault(selectedVaultId || null);

  // Prefill values from URL queries if available
  useEffect(() => {
    if (jdQuery) {
      setJdText(jdQuery);
    }
  }, [jdQuery]);

  useEffect(() => {
    if (vaults && vaults.length > 0) {
      if (vaultIdQuery && vaults.some(v => v.id === vaultIdQuery)) {
        setSelectedVaultId(vaultIdQuery);
      } else {
        setSelectedVaultId(vaults[0].id);
      }
    }
  }, [vaults, vaultIdQuery]);

  // Adjust sliders when selected vault changes
  useEffect(() => {
    if (vault) {
      const pCount = vault.projects ? vault.projects.length : 0;
      const iCount = vault.internships ? vault.internships.length : 0;
      
      setProjectCount(Math.min(Math.max(pCount, 1), 3)); // defaults to min(max_avail, 3) for standard look
      setInternshipCount(Math.min(iCount, 2)); // defaults to min(max_avail, 2)
    }
  }, [vault]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVaultId || jdText.trim().length < 20) return;
    
    onSubmit({
      vault_id: selectedVaultId,
      project_count: projectCount,
      internship_count: internshipCount,
      jd_text: jdText.trim()
    });
  };

  const isFormInvalid = !selectedVaultId || jdText.trim().length < 20 || isForging || vaultLoading;

  if (vaultsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-slate-800 rounded-2xl bg-slate-950/40 h-80">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-semibold">Loading profile vaults...</p>
      </div>
    );
  }

  if (vaultsError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-red-950 bg-red-950/10 text-red-400 rounded-2xl max-w-xl mx-auto text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
        <p className="font-bold text-sm">Failed to load vaults</p>
        <p className="text-xs text-slate-500 mt-1">{vaultsError}</p>
      </div>
    );
  }

  if (!vaults || vaults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl h-80 bg-slate-950/20 p-8 text-center max-w-xl mx-auto">
        <AlertCircle className="w-8 h-8 text-slate-500 mb-3" />
        <p className="text-slate-300 font-extrabold text-base">No Knowledge Vaults Found</p>
        <p className="text-slate-500 text-xs mt-2 max-w-sm leading-relaxed font-semibold">
          You must create at least one Knowledge Vault with your profile data (education, skills, etc.) before you can forge a resume.
        </p>
        <Button 
          onClick={() => window.location.href = "/dashboard/vaults/new"}
          className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs mt-6 h-9 shadow-md"
        >
          Create first Vault
        </Button>
      </div>
    );
  }

  const maxProjects = vault?.projects ? vault.projects.length : 0;
  const maxInternships = vault?.internships ? vault.internships.length : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
      <div className="p-6 border border-slate-800 bg-slate-950 rounded-2xl shadow-xl space-y-6">
        
        {/* Vault Selection */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-300 tracking-wide uppercase">
            Select Knowledge Vault
          </label>
          <Select
            value={selectedVaultId}
            onChange={(e) => setSelectedVaultId(e.target.value)}
            disabled={isForging}
          >
            {vaults.map((v) => (
              <option key={v.id} value={v.id} className="bg-slate-950 text-slate-100">
                {v.name} ({v.project_count} projects, {v.internship_count} internships)
              </option>
            ))}
          </Select>
        </div>

        {/* Sliders Grid */}
        {vault && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-slate-900 bg-slate-950/50">
            {/* Project Slider */}
            <div>
              {maxProjects > 0 ? (
                <Slider
                  label="Select Projects to Include"
                  min={1}
                  max={maxProjects}
                  value={projectCount}
                  onChange={(e) => setProjectCount(parseInt(e.target.value))}
                  disabled={isForging || vaultLoading}
                />
              ) : (
                <div className="text-xs text-slate-500 italic p-3 font-semibold text-center border border-dashed border-slate-900 rounded-lg">
                  No projects in selected vault.
                </div>
              )}
            </div>

            {/* Internship Slider */}
            <div>
              {maxInternships > 0 ? (
                <Slider
                  label="Select Experience/Internships to Include"
                  min={0}
                  max={maxInternships}
                  value={internshipCount}
                  onChange={(e) => setInternshipCount(parseInt(e.target.value))}
                  disabled={isForging || vaultLoading}
                />
              ) : (
                <div className="text-xs text-slate-500 italic p-3 font-semibold text-center border border-dashed border-slate-900 rounded-lg">
                  No experiences in selected vault.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Job Description Textarea */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-extrabold text-slate-300 tracking-wide uppercase">
              Target Job Description
            </label>
            <span className="text-[10px] font-bold text-slate-500">
              {jdText.trim().length} chars (min 20)
            </span>
          </div>
          <Textarea
            placeholder="Paste the target job description here. ResumeForge will parse it, match requirements with your vault, tailor project bullet points, and structure the layout."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            disabled={isForging}
            className="h-56 bg-slate-950 text-slate-100 placeholder:text-slate-650 resize-y border border-slate-800 rounded-xl"
          />
        </div>

        {/* Action Button */}
        <Button
          type="submit"
          disabled={isFormInvalid}
          className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold text-sm tracking-wider uppercase h-11 shadow-lg active:scale-98 duration-100 flex items-center justify-center gap-2 group cursor-pointer"
        >
          {vaultLoading ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              <span>Fetching vault configuration...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4.5 h-4.5 group-hover:scale-110 transition-transform text-amber-400" />
              <span>Forge Resume</span>
            </>
          )}
        </Button>

      </div>
    </form>
  );
}
