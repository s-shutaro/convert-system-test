// Document types (API v3.0.0)
export interface Document {
  document_id: string;
  tenant: string;
  filename: string;
  file_key: string;
  converted_files?: { [template_id: string]: string }; // template_id -> S3 file key
  created_at: number;
  updated_at: number;
}

// Structured Data types (API v3.0.0 - new multi-template support)
export interface StructuredData {
  document_id: string;
  template_id: string;
  structured_data: any;
  status: 'processing' | 'completed' | 'failed';
  created_at: number;
  updated_at: number;
}

export interface StructuredDataListItem {
  document_id: string;
  template_id: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: number;
  updated_at: number;
}

// Template types
export interface Template {
  template_id: string;
  tenant: string;
  name: string;
  description?: string;
  filename: string;
  file_key: string;
  variables?: string; // JSON string
  created_at: number;
  updated_at: number;
}

// Job types
export interface Job {
  job_id: string;
  tenant: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'completed';
  step: string;
  output?: any;
  error?: string;
  updated_at: number;
  document_id?: string; // Added for tracking which document this job belongs to
  template_id?: string; // Added for tracking which template this job uses
}

// API Response types
export interface DocumentUploadResponse {
  document_id: string;
  status: string;
  filename: string;
}

export interface ExtractResponse {
  job_id: string;
  status: string;
}

export interface TemplateUploadResponse {
  template_id: string;
  name: string;
  status: string;
  variables?: string;
}

export interface ListResponse<T> {
  items: T[];
  last_evaluated_key?: string;
  has_more: boolean;
}

export interface DownloadUrlResponse {
  download_url: string;
  filename: string;
  expires_in: number;
  expires_at: number;
}

export interface UpdateStructuredDataResponse {
  document_id: string;
  template_id: string;
  status: string;
}

export interface ApiError {
  detail: string;
}

// Analysis types
export type AnalysisType = 'ocr' | 'vision' | 'base64';
