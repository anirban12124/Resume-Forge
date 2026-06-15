"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCreateVault } from "@/hooks/use-vaults";
import { useToast } from "@/components/ui/toast";
import { UploadSection } from "@/components/vault/upload-section";
import { ConstantsForm } from "@/components/vault/constants-form";
import { SkillsDisplay } from "@/components/vault/skills-display";
import { ProjectField } from "@/components/vault/project-field";
import { InternshipField } from "@/components/vault/internship-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  Loader2, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { ConstantsData, SkillsData, Project, Internship } from "@/types/vault";

export default function NewVaultPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createVault, loading: isSaving } = useCreateVault();
  const toast = useToast();

  // Primary State
  const [vaultName, setVaultName] = useState("");
  const [sourceOrigin, setSourceOrigin] = useState("manual");
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [hasSummary, setHasSummary] = useState(false);

  const [constantsData, setConstantsData] = useState<ConstantsData>({
    contact_info: {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      github: "",
      linkedin: "",
      portfolio: ""
    },
    education: [],
    achievements: []
  });

  const [skillsData, setSkillsData] = useState<SkillsData>({
    frontend: [],
    backend: [],
    devops: [],
    databases: []
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);

  // Section Collapsed States
  const [sections, setSections] = useState({
    ingestion: true,
    constants: true,
    skills: true,
    projects: true,
    internships: true
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleParsedData = (data: any) => {
    setSourceOrigin(data.source_origin);
    setOriginalFilename(data.original_filename);
    setConfidenceScore(data.parse_confidence_score);
    setHasSummary(data.has_summary);

    // Merge parsed constants
    if (data.constants) {
      setConstantsData({
        contact_info: {
          full_name: data.constants.contact_info?.full_name || "",
          email: data.constants.contact_info?.email || "",
          phone: data.constants.contact_info?.phone || "",
          location: data.constants.contact_info?.location || "",
          github: data.constants.contact_info?.github || "",
          linkedin: data.constants.contact_info?.linkedin || "",
          portfolio: data.constants.contact_info?.portfolio || ""
        },
        education: data.constants.education || [],
        achievements: data.constants.achievements || []
      });
      
      // Auto-set vault name if not already filled
      const parsedName = data.constants.contact_info?.full_name;
      if (parsedName) {
        setVaultName(`${parsedName}'s Knowledge Vault`);
      }
    }

    // Merge parsed skills
    if (data.skills) {
      setSkillsData({
        frontend: data.skills.frontend || [],
        backend: data.skills.backend || [],
        devops: data.skills.devops || [],
        databases: data.skills.databases || []
      });
    }

    // Expand Constants and Skills for review, collapse Ingestion
    setSections({
      ingestion: false,
      constants: true,
      skills: true,
      projects: true,
      internships: true
    });

    toast.info("Data extracted! Please review the editable sections below.");
  };

  const validateForm = () => {
    if (!vaultName.trim()) {
      toast.error("Vault name is required.");
      setSections(prev => ({ ...prev, constants: true }));
      return false;
    }

    if (!constantsData.contact_info.full_name.trim()) {
      toast.error("Full Name in Constants Review is required.");
      setSections(prev => ({ ...prev, constants: true }));
      return false;
    }

    if (projects.length === 0) {
      toast.error("At least one project is required to create a vault.");
      setSections(prev => ({ ...prev, projects: true }));
      return false;
    }

    // Validate that every project has name, description, and github_url
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (!p.name.trim() || !p.description.trim() || !p.github_url.trim()) {
        toast.error(`Project #${i + 1} is missing required fields.`);
        setSections(prev => ({ ...prev, projects: true }));
        return false;
      }
    }

    // Validate that every internship has role, company, and start date
    for (let i = 0; i < internships.length; i++) {
      const item = internships[i];
      if (!item.role.trim() || !item.company_name.trim() || !item.start_date) {
        toast.error(`Internship experience #${i + 1} is missing required fields.`);
        setSections(prev => ({ ...prev, internships: true }));
        return false;
      }
    }

    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        name: vaultName.trim(),
        constants_data: constantsData,
        skills_data: skillsData,
        has_summary: hasSummary,
        source_origin: sourceOrigin,
        original_filename: originalFilename,
        parse_confidence_score: confidenceScore,
        projects: projects.map((p) => ({
          name: p.name.trim(),
          description: p.description.trim(),
          github_url: p.github_url.trim(),
          live_url: p.live_url?.trim() || null
        })),
        internships: internships.map((i) => ({
          role: i.role.trim(),
          company_name: i.company_name.trim(),
          start_date: i.start_date,
          end_date: i.end_date || null,
          description_bullets: i.description_bullets
        }))
      };

      await createVault(payload);
      toast.success("Knowledge Vault created successfully!");
      router.push("/dashboard/vaults");
    } catch (err: any) {
      toast.error(err.message || "Failed to create vault.");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Knowledge Vault</h1>
          <p className="text-sm text-slate-500 font-semibold">
            Upload your resume, verify parsed info, and organize your projects and internships.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSaving}
          className="bg-primary hover:bg-primary-hover font-bold text-sm tracking-wide shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Vault...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Vault</span>
            </>
          )}
        </Button>
      </div>

      {/* Vault Name input card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          Vault Identifier / Name *
        </label>
        <Input
          value={vaultName}
          onChange={(e) => setVaultName(e.target.value)}
          placeholder="e.g. Senior Backend Engineer Vault &mdash; 2026"
          className="bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-all font-bold text-sm"
          required
        />
        <p className="text-[10px] text-slate-400 font-semibold">
          Give this vault a descriptive title. You can host up to 3 vaults representing different career focuses.
        </p>
      </div>

      {/* SECTION 1: RESUME UPLOAD */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div 
          onClick={() => toggleSection("ingestion")}
          className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Step 1: Ingest Resume (PDF or LaTeX)</span>
          </div>
          {sections.ingestion ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {sections.ingestion && (
          <div className="p-5 bg-slate-50/10">
            <UploadSection onParsed={handleParsedData} />
          </div>
        )}
      </div>

      {/* SECTION 2: CONSTANTS REVIEW */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div 
          onClick={() => toggleSection("constants")}
          className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Step 2: Review Constants & Education</span>
          </div>
          {sections.constants ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {sections.constants && (
          <div className="p-5 bg-slate-50/10">
            <ConstantsForm 
              data={constantsData} 
              onChange={setConstantsData} 
              sourceOrigin={sourceOrigin}
            />
          </div>
        )}
      </div>

      {/* SECTION 3: SKILLS DISPLAY */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div 
          onClick={() => toggleSection("skills")}
          className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Step 3: Organize Skills</span>
          </div>
          {sections.skills ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {sections.skills && (
          <div className="p-5 bg-slate-50/10">
            <SkillsDisplay data={skillsData} onChange={setSkillsData} />
          </div>
        )}
      </div>

      {/* SECTION 4: PROJECTS */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div 
          onClick={() => toggleSection("projects")}
          className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Step 4: Catalog Projects *</span>
          </div>
          {sections.projects ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {sections.projects && (
          <div className="p-5 bg-slate-50/10">
            <ProjectField 
              projects={projects} 
              onChange={setProjects} 
              isGithubAuthenticated={user?.auth_provider === "github"}
            />
          </div>
        )}
      </div>

      {/* SECTION 5: INTERNSHIPS */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div 
          onClick={() => toggleSection("internships")}
          className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Step 5: Add Professional History</span>
          </div>
          {sections.internships ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {sections.internships && (
          <div className="p-5 bg-slate-50/10">
            <InternshipField internships={internships} onChange={setInternships} />
          </div>
        )}
      </div>

      {/* Bottom Save bar */}
      <div className="flex justify-end gap-4 border-t border-slate-200 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/vaults")}
          className="border-slate-200 text-slate-700 font-semibold"
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-primary hover:bg-primary-hover font-bold text-sm tracking-wide shadow-md flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Vault...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Vault</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
