"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkillsData, SkillItem } from "@/types/vault";
import { 
  Database, 
  Terminal, 
  Layers, 
  Cpu, 
  Plus, 
  X, 
  Bookmark, 
  GitCommit, 
  User 
} from "lucide-react";

interface SkillsDisplayProps {
  data: SkillsData;
  onChange: (data: SkillsData) => void;
}

export function SkillsDisplay({ data, onChange }: SkillsDisplayProps) {
  const [newSkillNames, setNewSkillNames] = useState<Record<string, string>>({
    frontend: "",
    backend: "",
    devops: "",
    databases: ""
  });

  const categories = [
    { key: "frontend", label: "Frontend Development", icon: Layers, color: "text-indigo-500 bg-indigo-50 border-indigo-100" },
    { key: "backend", label: "Backend Systems", icon: Terminal, color: "text-emerald-500 bg-emerald-50 border-emerald-100" },
    { key: "devops", label: "DevOps & Cloud Tools", icon: Cpu, color: "text-orange-500 bg-orange-50 border-orange-100" },
    { key: "databases", label: "Databases & Storage", icon: Database, color: "text-blue-500 bg-blue-50 border-blue-100" }
  ];

  // Helper to remove skill
  const handleRemoveSkill = (category: string, skillName: string) => {
    const list = data[category as keyof SkillsData] || [];
    const updatedList = list.filter((s) => s.name.toLowerCase() !== skillName.toLowerCase());
    
    onChange({
      ...data,
      [category]: updatedList
    });
  };

  // Helper to add skill
  const handleAddSkill = (category: string) => {
    const name = newSkillNames[category].trim();
    if (!name) return;

    const list = data[category as keyof SkillsData] || [];
    // Prevent duplicates
    if (list.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setNewSkillNames({ ...newSkillNames, [category]: "" });
      return;
    }

    const newItem: SkillItem = {
      name,
      domain_category: category,
      origin_source: "manual"
    };

    onChange({
      ...data,
      [category]: [...list, newItem]
    });

    setNewSkillNames({ ...newSkillNames, [category]: "" });
  };

  const handleKeyPress = (e: React.KeyboardEvent, category: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill(category);
    }
  };

  // Helper to render visual dot/indicator representing origin
  const getOriginDot = (origin: string) => {
    switch (origin) {
      case "user_pdf":
      case "pdf":
      case "latex_code":
        return <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Parsed from Resume" />;
      case "github_sync":
      case "github":
        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Inferred from GitHub" />;
      default:
        return <span className="w-1.5 h-1.5 rounded-full bg-slate-400" title="Manually Added" />;
    }
  };

  return (
    <div className="space-y-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          <span>Skills Display</span>
        </h3>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          Grouped tag clouds of your professional skills. Add, remove, or modify categories.
        </p>
      </div>

      {/* Legend / Key */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs font-semibold text-slate-500">
        <span className="text-slate-400 uppercase tracking-wide text-[10px] font-bold">Source Indicators:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Resume File</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>GitHub Synced</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span>Manual Addition</span>
        </div>
      </div>

      {/* Grid Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const skillsList = data[cat.key as keyof SkillsData] || [];

          return (
            <div 
              key={cat.key} 
              className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-slate-50/20"
            >
              <div>
                <div className="flex items-center gap-2 mb-3.5">
                  <div className={`p-1.5 rounded-lg border ${cat.color} shrink-0`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{cat.label}</h4>
                  <Badge variant="outline" className="ml-auto font-bold bg-white text-slate-450 border-slate-250">
                    {skillsList.length}
                  </Badge>
                </div>

                {/* Skills cloud */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {skillsList.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold italic py-2">
                      No skill tags in this category.
                    </p>
                  ) : (
                    skillsList.map((skill) => (
                      <div
                        key={skill.name}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-sm transition-all hover:border-slate-300"
                      >
                        {getOriginDot(skill.origin_source)}
                        <span>{skill.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(cat.key, skill.name)}
                          className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Inline input to append new tag */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <Input
                  value={newSkillNames[cat.key]}
                  onChange={(e) => setNewSkillNames({ ...newSkillNames, [cat.key]: e.target.value })}
                  onKeyDown={(e) => handleKeyPress(e, cat.key)}
                  placeholder="Add skill (e.g. NextJS)"
                  className="h-8 text-xs bg-white border-slate-200 text-slate-800 font-semibold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSkill(cat.key)}
                  className="h-8 border-slate-200 text-slate-650 hover:bg-slate-50 font-bold px-2.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
