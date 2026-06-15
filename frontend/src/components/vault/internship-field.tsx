"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Internship } from "@/types/vault";
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Building 
} from "lucide-react";

interface InternshipFieldProps {
  internships: Internship[];
  onChange: (internships: Internship[]) => void;
}

export function InternshipField({ internships, onChange }: InternshipFieldProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleInternshipChange = (index: number, field: keyof Internship, value: any) => {
    const updated = [...internships];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onChange(updated);
  };

  const addInternship = () => {
    if (internships.length >= 8) return;
    const newInternship: Internship = {
      role: "",
      company_name: "",
      start_date: "",
      end_date: "",
      description_bullets: []
    };
    onChange([...internships, newInternship]);
    setCollapsed((prev) => ({
      ...prev,
      [internships.length]: false
    }));
  };

  const confirmDelete = (index: number) => {
    setDeleteIndex(index);
  };

  const executeDelete = () => {
    if (deleteIndex === null) return;
    const updated = internships.filter((_, i) => i !== deleteIndex);
    onChange(updated);
    setDeleteIndex(null);
  };

  // Helper to convert bullet list to text for display
  const getBulletsText = (bullets: string[]) => {
    return bullets.join("\n");
  };

  // Helper to convert textarea change to bullet list
  const handleBulletsChange = (index: number, text: string) => {
    const bullets = text.split("\n").filter((line) => line.trim() !== "");
    handleInternshipChange(index, "description_bullets", bullets);
  };

  return (
    <div className="space-y-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      {/* Header Info */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            <span>Internships ({internships.length}/8)</span>
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Add relevant industry experiences. Write description accomplishments one bullet per line.
          </p>
        </div>

        <Button
          type="button"
          onClick={addInternship}
          disabled={internships.length >= 8}
          className="bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 h-9 px-3.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Experience</span>
        </Button>
      </div>

      {/* List of Internships */}
      {internships.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-250 rounded-xl text-slate-400 text-xs font-semibold">
          No experience records added yet. Click "Add Experience" to begin.
        </div>
      ) : (
        <div className="space-y-4">
          {internships.map((intern, idx) => {
            const isCollapsed = collapsed[idx] ?? false;
            const hasError = !intern.role.trim() || !intern.company_name.trim() || !intern.start_date;

            return (
              <div 
                key={idx} 
                className={`border rounded-xl bg-white overflow-hidden transition-all duration-200 ${
                  deleteIndex === idx 
                    ? "border-red-300 ring-2 ring-red-50" 
                    : hasError 
                    ? "border-amber-200 hover:border-amber-300"
                    : "border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                {/* Collapsible Header */}
                <div 
                  onClick={() => toggleCollapse(idx)}
                  className="flex items-center justify-between px-4 py-3.5 bg-slate-50/50 border-b border-slate-100 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Briefcase className={`w-4 h-4 shrink-0 ${hasError ? "text-amber-500" : "text-slate-400"}`} />
                    <span className="font-bold text-slate-800 truncate text-sm">
                      {intern.role.trim() && intern.company_name.trim() 
                        ? `${intern.role} at ${intern.company_name}` 
                        : intern.role.trim() || intern.company_name.trim() || `Untitled Experience #${idx + 1}`
                      }
                    </span>
                    {hasError && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Incomplete</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => confirmDelete(idx)}
                      className="p-1 rounded text-slate-450 hover:text-red-650 transition-colors"
                      title="Remove Experience"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCollapse(idx)}
                      className="p-1 rounded text-slate-450 hover:text-slate-700 transition-colors"
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Details */}
                {!isCollapsed && (
                  <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    {deleteIndex === idx ? (
                      <div className="bg-red-50/50 border border-red-100 rounded-lg p-3.5 flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-red-950">Remove experience?</p>
                          <p className="text-[11px] text-red-700 font-semibold leading-relaxed">
                            Are you sure you want to remove this experience? This will erase it from the vault on save.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteIndex(null)}
                            className="h-8 border-red-200 text-red-900 bg-white hover:bg-red-50 text-[11px] font-bold"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={executeDelete}
                            className="h-8 bg-red-600 hover:bg-red-700 text-[11px] font-bold"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Role Title *
                        </label>
                        <Input
                          value={intern.role}
                          onChange={(e) => handleInternshipChange(idx, "role", e.target.value)}
                          placeholder="Software Engineering Intern"
                          className="bg-slate-50/50 border-slate-200 text-slate-800 font-semibold focus:bg-white transition-all text-xs"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Company Name *
                        </label>
                        <div className="relative">
                          <Building className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                          <Input
                            value={intern.company_name}
                            onChange={(e) => handleInternshipChange(idx, "company_name", e.target.value)}
                            placeholder="Stripe, Inc."
                            className="pl-9 bg-slate-50/50 border-slate-200 text-slate-800 font-semibold focus:bg-white transition-all text-xs"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Start Date *
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                          <input
                            type="date"
                            value={intern.start_date}
                            onChange={(e) => handleInternshipChange(idx, "start_date", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            End Date
                          </label>
                          <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!intern.end_date}
                              onChange={(e) => {
                                handleInternshipChange(idx, "end_date", e.target.checked ? null : "");
                              }}
                              className="rounded text-primary border-slate-350 focus:ring-primary w-3.5 h-3.5"
                            />
                            <span>Present / Ongoing</span>
                          </label>
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                          <input
                            type="date"
                            value={intern.end_date || ""}
                            onChange={(e) => handleInternshipChange(idx, "end_date", e.target.value)}
                            disabled={!intern.end_date && intern.end_date !== ""}
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Experience Bullet Points
                          </label>
                          <span className="text-[10px] font-bold text-slate-400">
                            One bullet per line
                          </span>
                        </div>
                        <Textarea
                          value={getBulletsText(intern.description_bullets)}
                          onChange={(e) => handleBulletsChange(idx, e.target.value)}
                          placeholder="Implemented automated API endpoints using Python FastAPI, resulting in 40% latency drop.&#10;Collaborated with cross-functional product squads to integrate auth features."
                          className="bg-slate-50/50 border-slate-200 text-slate-800 font-semibold focus:bg-white transition-all text-xs min-h-[120px]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
