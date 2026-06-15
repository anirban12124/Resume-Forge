export interface ContactInfo {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  github?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
}

export interface EducationEntry {
  school: string;
  degree?: string | null;
  major?: string | null;
  gpa?: string | number | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
}

export interface ConstantsData {
  contact_info: ContactInfo;
  education: EducationEntry[];
  achievements: string[];
}

export interface SkillItem {
  name: string;
  domain_category: string; // 'frontend' | 'backend' | 'devops' | 'databases'
  origin_source: string; // 'user_pdf' | 'github_sync' | 'manual'
}

export interface SkillsData {
  frontend: SkillItem[];
  backend: SkillItem[];
  devops: SkillItem[];
  databases: SkillItem[];
}

export interface Project {
  id?: string;
  vault_id?: string;
  user_id?: string;
  name: string;
  description: string;
  github_url: string;
  live_url?: string | null;
  last_synced_commit?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Internship {
  id?: string;
  vault_id?: string;
  user_id?: string;
  role: string;
  company_name: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  description_bullets: string[];
  duration_months?: number | null;
  role_domain?: string | null;
  inferred_tech_stack?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface Vault {
  id: string;
  user_id: string;
  name: string;
  base_template_id: string;
  source_origin: string;
  original_filename?: string | null;
  parse_confidence_score?: number | null;
  github_sync_status: boolean;
  constants_data: ConstantsData;
  skills_data: SkillsData;
  has_summary: boolean;
  created_at: string;
  updated_at: string;
  projects: Project[];
  internships: Internship[];
}

export interface VaultListResponse {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  github_sync_status: boolean;
  project_count: number;
  internship_count: number;
}

export interface VaultCreate {
  name: string;
  constants_data: ConstantsData;
  skills_data: SkillsData;
  has_summary: boolean;
  source_origin: string;
  original_filename?: string | null;
  parse_confidence_score?: number | null;
  projects: Project[];
  internships: Internship[];
}

export interface VaultUpdate {
  name?: string;
  constants_data?: ConstantsData;
  skills_data?: SkillsData;
  has_summary?: boolean;
  github_sync_status?: boolean;
}
