export interface ForgeRunRequest {
  vault_id: string;
  project_count: number;
  internship_count: number;
  jd_text: string;
}

export interface ForgeStatusResponse {
  task_id: string;
  status: 'queued' | 'parsing_jd' | 'selecting_projects' | 'generating_content' | 'compiling_latex' | 'uploading' | 'completed' | 'failed';
  error_message: string | null;
}

export interface ForgeResultResponse {
  pdf_url: string;
  tex_content: string;
  archive_id: string;
}
