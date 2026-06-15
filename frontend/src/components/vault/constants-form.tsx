"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConstantsData, EducationEntry } from "@/types/vault";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Github, 
  Linkedin, 
  Globe, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Award, 
  FileText 
} from "lucide-react";

interface ConstantsFormProps {
  data: ConstantsData;
  onChange: (data: ConstantsData) => void;
  sourceOrigin: string; // 'pdf' | 'latex_code' | 'manual'
}

export function ConstantsForm({ data, onChange, sourceOrigin }: ConstantsFormProps) {
  // Translate backend source origin to human readable badge format
  const getOriginBadge = () => {
    if (sourceOrigin === "pdf") {
      return <Badge variant="info">PDF Ingested</Badge>;
    } else if (sourceOrigin === "latex_code") {
      return <Badge variant="success">LaTeX Parsed</Badge>;
    } else {
      return <Badge variant="secondary">Manual Input</Badge>;
    }
  };

  // Helper to update contact info
  const handleContactChange = (field: keyof typeof data.contact_info, value: string) => {
    const updated = {
      ...data,
      contact_info: {
        ...data.contact_info,
        [field]: value || null
      }
    };
    onChange(updated);
  };

  // Helper to update education entry
  const handleEducationChange = (index: number, field: keyof EducationEntry, value: any) => {
    const newEducation = [...data.education];
    newEducation[index] = {
      ...newEducation[index],
      [field]: value
    };
    onChange({
      ...data,
      education: newEducation
    });
  };

  const addEducation = () => {
    const newEntry: EducationEntry = {
      school: "",
      degree: "",
      major: "",
      gpa: "",
      start_date: "",
      end_date: "",
      location: ""
    };
    onChange({
      ...data,
      education: [...data.education, newEntry]
    });
  };

  const removeEducation = (index: number) => {
    const newEducation = data.education.filter((_, i) => i !== index);
    onChange({
      ...data,
      education: newEducation
    });
  };

  // Helper to update achievements
  const handleAchievementChange = (index: number, value: string) => {
    const newAchievements = [...data.achievements];
    newAchievements[index] = value;
    onChange({
      ...data,
      achievements: newAchievements
    });
  };

  const addAchievement = () => {
    onChange({
      ...data,
      achievements: [...data.achievements, ""]
    });
  };

  const removeAchievement = (index: number) => {
    const newAchievements = data.achievements.filter((_, i) => i !== index);
    onChange({
      ...data,
      achievements: newAchievements
    });
  };

  return (
    <div className="space-y-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <span>Constants Review</span>
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Review primary header, education entries, and certification data.
          </p>
        </div>
        <div>
          {getOriginBadge()}
        </div>
      </div>

      {/* Section A: Contact Info */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span>Contact & Header Info</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                value={data.contact_info.full_name || ""}
                onChange={(e) => handleContactChange("full_name", e.target.value)}
                placeholder="John Doe"
                className="pl-9 bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-all font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                type="email"
                value={data.contact_info.email || ""}
                onChange={(e) => handleContactChange("email", e.target.value)}
                placeholder="john.doe@example.com"
                className="pl-9 bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                value={data.contact_info.phone || ""}
                onChange={(e) => handleContactChange("phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="pl-9 bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                value={data.contact_info.location || ""}
                onChange={(e) => handleContactChange("location", e.target.value)}
                placeholder="San Francisco, CA"
                className="pl-9 bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">GitHub Profile URL</label>
            <div className="relative">
              <Github className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                value={data.contact_info.github || ""}
                onChange={(e) => handleContactChange("github", e.target.value)}
                placeholder="https://github.com/johndoe"
                className="pl-9 bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">LinkedIn Profile URL</label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                value={data.contact_info.linkedin || ""}
                onChange={(e) => handleContactChange("linkedin", e.target.value)}
                placeholder="https://linkedin.com/in/johndoe"
                className="pl-9 bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1 md:col-span-2 lg:col-span-3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Portfolio Website URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                value={data.contact_info.portfolio || ""}
                onChange={(e) => handleContactChange("portfolio", e.target.value)}
                placeholder="https://johndoe.dev"
                className="pl-9 bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section B: Education */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Education Entries</span>
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEducation}
            className="border-indigo-100 text-primary hover:bg-indigo-50 font-bold flex items-center gap-1 h-8 px-2.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add School</span>
          </Button>
        </div>

        {data.education.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-450 text-xs font-semibold">
            No education entries listed. Click "Add School" to insert.
          </div>
        ) : (
          <div className="space-y-4">
            {data.education.map((edu, idx) => (
              <div key={idx} className="relative p-4 rounded-xl border border-slate-250 bg-slate-50/30 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => removeEducation(idx)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-red-650 transition-colors p-1"
                  title="Remove education entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Institution Name *</label>
                    <Input
                      value={edu.school || ""}
                      onChange={(e) => handleEducationChange(idx, "school", e.target.value)}
                      placeholder="University of California, Berkeley"
                      className="bg-white border-slate-200 text-slate-800 font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Degree (e.g. BS, MS)</label>
                    <Input
                      value={edu.degree || ""}
                      onChange={(e) => handleEducationChange(idx, "degree", e.target.value)}
                      placeholder="Bachelor of Science"
                      className="bg-white border-slate-200 text-slate-800 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Major / Field</label>
                    <Input
                      value={edu.major || ""}
                      onChange={(e) => handleEducationChange(idx, "major", e.target.value)}
                      placeholder="Computer Science"
                      className="bg-white border-slate-200 text-slate-800 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">GPA</label>
                    <Input
                      value={edu.gpa || ""}
                      onChange={(e) => handleEducationChange(idx, "gpa", e.target.value)}
                      placeholder="3.8 / 4.0"
                      className="bg-white border-slate-200 text-slate-800 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Start Date / Year</label>
                    <Input
                      value={edu.start_date || ""}
                      onChange={(e) => handleEducationChange(idx, "start_date", e.target.value)}
                      placeholder="Aug 2021"
                      className="bg-white border-slate-200 text-slate-800 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">End Date / Year</label>
                    <Input
                      value={edu.end_date || ""}
                      onChange={(e) => handleEducationChange(idx, "end_date", e.target.value)}
                      placeholder="May 2025"
                      className="bg-white border-slate-200 text-slate-800 font-semibold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section C: Achievements & Certifications */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>Achievements & Certifications</span>
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAchievement}
            className="border-indigo-100 text-primary hover:bg-indigo-50 font-bold flex items-center gap-1 h-8 px-2.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </Button>
        </div>

        {data.achievements.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-450 text-xs font-semibold">
            No achievements listed. Click "Add Item" to insert.
          </div>
        ) : (
          <div className="space-y-2">
            {data.achievements.map((ach, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-slate-400 text-xs font-semibold">#{idx + 1}</span>
                <Input
                  value={ach}
                  onChange={(e) => handleAchievementChange(idx, e.target.value)}
                  placeholder="AWS Certified Solutions Architect &mdash; 2024"
                  className="bg-slate-50 border-slate-200 text-slate-850 focus:bg-white transition-all font-semibold flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeAchievement(idx)}
                  className="text-slate-400 hover:text-red-650 transition-colors p-1.5"
                  title="Remove achievement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
