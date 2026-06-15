"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useVault } from "@/hooks/use-vaults";
import { useToast } from "@/components/ui/toast";
import { ConstantsForm } from "@/components/vault/constants-form";
import { SkillsDisplay } from "@/components/vault/skills-display";
import { ProjectField } from "@/components/vault/project-field";
import { InternshipField } from "@/components/vault/internship-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { 
  Database, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  ArrowLeft
} from "lucide-react";
import { ConstantsData, SkillsData, Project, Internship } from "@/types/vault";

export default function EditVaultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const { user } = useAuth();
  const { vault, loading, error, mutate } = useVault(id);
  const toast = useToast();

  // Primary form state
  const [isInitialized, setIsInitialized] = useState(false);
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

  // Copies of original items for diffing
  const [originalProjects, setOriginalProjects] = useState<Project[]>([]);
  const [originalInternships, setOriginalInternships] = useState<Internship[]>([]);

  // Section Collapsed States
  const [sections, setSections] = useState({
    constants: true,
    skills: false,
    projects: false,
    internships: false
  });

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveStep, setSaveStep] = useState<string | null>(null);

  useEffect(() => {
    if (vault && !isInitialized) {
      setVaultName(vault.name);
      setSourceOrigin(vault.source_origin);
      setOriginalFilename(vault.original_filename || null);
      setConfidenceScore(vault.parse_confidence_score || null);
      setHasSummary(vault.has_summary);
      setConstantsData(vault.constants_data);
      setSkillsData(vault.skills_data);
      setProjects(vault.projects);
      setInternships(vault.internships);
      
      setOriginalProjects(vault.projects);
      setOriginalInternships(vault.internships);
      
      setIsInitialized(true);
    }
  }, [vault, isInitialized]);

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const validateForm = () => {
    if (!vaultName.trim()) {
      toast.error("Vault name is required.");
      return false;
    }

    if (!constantsData.contact_info.full_name.trim()) {
      toast.error("Full Name is required in Constants Review.");
      setSections(prev => ({ ...prev, constants: true }));
      return false;
    }

    if (projects.length === 0) {
      toast.error("At least one project is required in your vault.");
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

    setIsSaving(true);
    try {
      // 1. Differentiate Projects
      const projectsToDelete = originalProjects.filter(orig => !projects.some(curr => curr.id === orig.id));
      const projectsToCreate = projects.filter(curr => !curr.id);
      const projectsToUpdate = projects.filter(curr => {
        if (!curr.id) return false;
        const orig = originalProjects.find(o => o.id === curr.id);
        if (!orig) return false;
        return (
          curr.name !== orig.name ||
          curr.description !== orig.description ||
          curr.github_url !== orig.github_url ||
          curr.live_url !== orig.live_url
        );
      });

      // 2. Differentiate Internships
      const internshipsToDelete = originalInternships.filter(orig => !internships.some(curr => curr.id === orig.id));
      const internshipsToCreate = internships.filter(curr => !curr.id);
      const internshipsToUpdate = internships.filter(curr => {
        if (!curr.id) return false;
        const orig = originalInternships.find(o => o.id === curr.id);
        if (!orig) return false;
        return (
          curr.role !== orig.role ||
          curr.company_name !== orig.company_name ||
          curr.start_date !== orig.start_date ||
          curr.end_date !== orig.end_date ||
          JSON.stringify(curr.description_bullets) !== JSON.stringify(orig.description_bullets)
        );
      });

      // --- SAVE SEQUENCE ---
      // A. Update vault metadata
      setSaveStep("Saving metadata...");
      const vaultRes = await api.put(`/vaults/${id}`, {
        name: vaultName.trim(),
        constants_data: constantsData,
        skills_data: skillsData,
        has_summary: hasSummary
      });
      if (!vaultRes.ok) throw new Error("Failed to save vault metadata.");

      // B. Save Projects
      setSaveStep("Syncing projects...");
      // Deletions
      for (const p of projectsToDelete) {
        const res = await api.delete(`/vaults/${id}/projects/${p.id}`);
        if (!res.ok) throw new Error(`Failed to remove project "${p.name}".`);
      }
      // Creations
      for (const p of projectsToCreate) {
        const res = await api.post(`/vaults/${id}/projects`, {
          name: p.name.trim(),
          description: p.description.trim(),
          github_url: p.github_url.trim(),
          live_url: p.live_url?.trim() || null
        });
        if (!res.ok) throw new Error(`Failed to create project "${p.name}".`);
      }
      // Updates
      for (const p of projectsToUpdate) {
        const res = await api.put(`/vaults/${id}/projects/${p.id}`, {
          name: p.name.trim(),
          description: p.description.trim(),
          github_url: p.github_url.trim(),
          live_url: p.live_url?.trim() || null
        });
        if (!res.ok) throw new Error(`Failed to update project "${p.name}".`);
      }

      // C. Save Internships
      setSaveStep("Syncing internships...");
      // Deletions
      for (const i of internshipsToDelete) {
        const res = await api.delete(`/vaults/${id}/internships/${i.id}`);
        if (!res.ok) throw new Error(`Failed to remove experience at "${i.company_name}".`);
      }
      // Creations
      for (const i of internshipsToCreate) {
        const res = await api.post(`/vaults/${id}/internships`, {
          role: i.role.trim(),
          company_name: i.company_name.trim(),
          start_date: i.start_date,
          end_date: i.end_date || null,
          description_bullets: i.description_bullets
        });
        if (!res.ok) throw new Error(`Failed to create experience at "${i.company_name}".`);
      }
      // Updates
      for (const i of internshipsToUpdate) {
        const res = await api.put(`/vaults/${id}/internships/${i.id}`, {
          role: i.role.trim(),
          company_name: i.company_name.trim(),
          start_date: i.start_date,
          end_date: i.end_date || null,
          description_bullets: i.description_bullets
        });
        if (!res.ok) throw new Error(`Failed to update experience at "${i.company_name}".`);
      }

      toast.success("Knowledge Vault updated successfully!");
      router.push("/dashboard/vaults");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while saving the vault.");
    } finally {
      setIsSaving(false);
      setSaveStep(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <span className="font-bold text-sm">Loading vault details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center max-w-md mx-auto space-y-4">
        <div className="p-3 rounded-full bg-red-50 text-red-500 border border-red-100">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-slate-900 font-extrabold text-lg">Failed to Load Vault</p>
        <p className="text-slate-400 text-xs font-semibold">{error}</p>
        <Button onClick={() => router.push("/dashboard/vaults")} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vaults</span>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/vaults")}
            className="border-slate-200 text-slate-600 bg-white hover:bg-slate-50 font-bold px-2.5 h-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Edit Knowledge Vault</h1>
            <p className="text-sm text-slate-500 font-semibold">
              Update constants, change skills, or manage projects and internships.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSaving}
          className="bg-primary hover:bg-primary-hover font-bold text-sm tracking-wide shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{saveStep || "Saving Changes..."}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
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
      </div>

      {/* SECTION 1: CONSTANTS REVIEW */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div 
          onClick={() => toggleSection("constants")}
          className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Step 1: Review Constants & Education</span>
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

      {/* SECTION 2: SKILLS DISPLAY */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div 
          onClick={() => toggleSection("skills")}
          className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Step 2: Organize Skills</span>
          </div>
          {sections.skills ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {sections.skills && (
          <div className="p-5 bg-slate-50/10">
            <SkillsDisplay data={skillsData} onChange={setSkillsData} />
          </div>
        )}
      </div>

      {/* SECTION 3: PROJECTS */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div 
          onClick={() => toggleSection("projects")}
          className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Step 3: Catalog Projects *</span>
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

      {/* SECTION 4: INTERNSHIPS */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div 
          onClick={() => toggleSection("internships")}
          className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm">Step 4: Add Professional History</span>
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
              <span>{saveStep || "Saving Changes..."}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
