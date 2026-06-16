export interface ArchiveSummary {
  project_count: number;
  internship_count: number;
}

export interface ArchiveListResponse {
  id: string;
  title: string;
  vault_name: string;
  created_at: string;
  summary: ArchiveSummary;
}

export interface ArchiveDetailResponse extends ArchiveListResponse {
  vault_id: string;
  pdf_url: string;
  tex_content: string;
  jd_text: string;
  forge_config: Record<string, any>;
}
