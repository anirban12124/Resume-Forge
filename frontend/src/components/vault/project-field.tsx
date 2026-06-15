"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Project } from "@/types/vault";
import { 
  Code, 
  Plus, 
  Trash2, 
  Github, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  GitPullRequest,
  GitCommit
} from "lucide-react";

interface ProjectFieldProps {
  projects: Project[];
  onChange: (projects: Project[]) => void;
  isGithubAuthenticated: boolean;
}

export function ProjectField({ projects, onChange, isGithubAuthenticated }: ProjectFieldProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleProjectChange = (index: number, field: keyof Project, value: string) => {
    const updated = [...projects];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onChange(updated);
  };

  const addProject = () => {
    if (projects.length >= 8) return;
    const newProject: Project = {
      name: "",
      description: "",
      github_url: "",
      live_url: ""
    };
    onChange([...projects, newProject]);
    // Expand the newly added project, collapse others
    setCollapsed((prev) => ({
      ...prev,
      [projects.length]: false
    }));
  };

  const confirmDelete = (index: number) => {
    setDeleteIndex(index);
  };

  const executeDelete = () => {
    if (deleteIndex === null) return;
    const updated = projects.filter((_, i) => i !== deleteIndex);
    onChange(updated);
    setDeleteIndex(null);
  };

  return (
    <div className="space-y-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      {/* Header Info */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-500" />
            <span>Projects ({projects.length}/8)</span>
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage developer projects. Valid repository URLs are required for automated sync.
          </p>
        </div>

        <Button
          type="button"
          onClick={addProject}
          disabled={projects.length >= 8}
          className="bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 h-9 px-3.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project</span>
        </Button>
      </div>

      {/* GitHub Note details */}
      <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-start gap-2.5 text-xs text-slate-500">
        <Github className="w-4.5 h-4.5 text-slate-450 shrink-0 mt-0.5" />
        <div className="font-semibold leading-relaxed">
          {isGithubAuthenticated ? (
            <p>
              <span className="text-indigo-600 font-bold">✨ GitHub Integrated:</span> Repo languages, README markdown, and commit messages will be fetched automatically to generate detailed bullet points when saved.
            </p>
          ) : (
            <p>
              <span className="text-slate-700 font-bold">ℹ️ Note:</span> Connect your GitHub profile to unlock automatic tech stack inference and commit-log analysis during ingestion.
            </p>
          )}
        </div>
      </div>

      {/* List of projects */}
      {projects.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-250 rounded-xl text-slate-400 text-xs font-semibold">
          No projects added yet. Click "Add Project" to start cataloging your work.
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project, idx) => {
            const isCollapsed = collapsed[idx] ?? false;
            const hasError = !project.name.trim() || !project.github_url.trim();

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
                    <GitPullRequest className={`w-4 h-4 shrink-0 ${hasError ? "text-amber-500" : "text-slate-400"}`} />
                    <span className="font-bold text-slate-800 truncate text-sm">
                      {project.name.trim() || `Untitled Project #${idx + 1}`}
                    </span>
                    {hasError && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Incomplete</span>
                      </span>
                    )}
                    {project.last_synced_commit && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        <span>Synced</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => confirmDelete(idx)}
                      className="p-1 rounded text-slate-450 hover:text-red-650 transition-colors"
                      title="Remove Project"
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
                          <p className="text-xs font-bold text-red-950">Remove project?</p>
                          <p className="text-[11px] text-red-700 font-semibold leading-relaxed">
                            Are you sure you want to remove this project? This will erase it from the vault on save.
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
                      {project.last_synced_commit && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/50 text-[10px] text-emerald-700 font-bold md:col-span-2">
                          <GitCommit className="w-3.5 h-3.5" />
                          <span>Synced with GitHub commit: {project.last_synced_commit.substring(0, 7)}</span>
                          {project.updated_at && (
                            <>
                              <span className="text-emerald-300">|</span>
                              <span>Last Synced: {new Date(project.updated_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Project Name *
                        </label>
                        <Input
                          value={project.name}
                          onChange={(e) => handleProjectChange(idx, "name", e.target.value)}
                          placeholder="ResumeForge Optimizer"
                          className="bg-slate-50/50 border-slate-200 text-slate-800 font-semibold focus:bg-white transition-all text-xs"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          GitHub Link (Repository URL) *
                        </label>
                        <div className="relative">
                          <Github className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
                          <Input
                            value={project.github_url}
                            onChange={(e) => handleProjectChange(idx, "github_url", e.target.value)}
                            placeholder="https://github.com/username/repo"
                            className="pl-9 bg-slate-50/50 border-slate-200 text-slate-800 font-semibold focus:bg-white transition-all text-xs"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Live Application URL (Optional)
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
                          <Input
                            value={project.live_url || ""}
                            onChange={(e) => handleProjectChange(idx, "live_url", e.target.value)}
                            placeholder="https://myproject.com"
                            className="pl-9 bg-slate-50/50 border-slate-200 text-slate-800 font-semibold focus:bg-white transition-all text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Project Description *
                        </label>
                        <Textarea
                          value={project.description}
                          onChange={(e) => handleProjectChange(idx, "description", e.target.value)}
                          placeholder="A brief summary of what the project does, key features, and your contribution."
                          className="bg-slate-50/50 border-slate-200 text-slate-800 font-semibold focus:bg-white transition-all text-xs min-h-[90px]"
                          required
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
