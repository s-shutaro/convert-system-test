import axios, { AxiosInstance } from 'axios';
import type {
  Document,
  Template,
  Job,
  DocumentUploadResponse,
  ExtractResponse,
  TemplateUploadResponse,
  ListResponse,
  DownloadUrlResponse,
  AnalysisType,
  StructuredData,
  StructuredDataListItem,
  UpdateStructuredDataResponse,
} from '@/types';
import { getJwtToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach JWT token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getJwtToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login on unauthorized
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Documents API
  async uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await this.client.post<DocumentUploadResponse>(
      '/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  }

  async extractStructure(
    documentId: string,
    templateId: string,
    analysisType: AnalysisType
  ): Promise<ExtractResponse> {
    const { data } = await this.client.post<ExtractResponse>(
      `/documents/${documentId}/extract`,
      { template_id: templateId, analysis_type: analysisType }
    );
    return data;
  }

  async getDocument(documentId: string): Promise<Document> {
    const { data } = await this.client.get<Document>(`/documents/${documentId}`);
    return data;
  }

  async listDocuments(limit: number = 20, lastKey?: string): Promise<ListResponse<Document>> {
    const params: any = { limit };
    if (lastKey) params.last_key = lastKey;

    const { data } = await this.client.get<ListResponse<Document>>('/documents', { params });
    return data;
  }

  async deleteDocument(documentId: string): Promise<{ document_id: string; status: string }> {
    const { data } = await this.client.delete(`/documents/${documentId}`);
    return data;
  }

  async reanalyzeDocument(documentId: string): Promise<ExtractResponse> {
    const { data } = await this.client.post<ExtractResponse>(`/documents/${documentId}/reanalyze`);
    return data;
  }

  // Structured Data API (API v3.0.0)
  async getStructuredData(documentId: string, templateId: string): Promise<StructuredData> {
    const { data } = await this.client.get<StructuredData>(
      `/documents/${documentId}/structures/${templateId}`
    );
    return data;
  }

  async listStructuredData(documentId: string): Promise<ListResponse<StructuredDataListItem>> {
    const { data } = await this.client.get<any>(
      `/documents/${documentId}/structures`
    );

    // API returns {structures: [...]} instead of {items: [...]}
    // Normalize the response to match the expected format
    if (data.structures && !data.items) {
      return {
        items: data.structures,
        has_more: false
      };
    }

    return data;
  }

  async updateStructuredData(
    documentId: string,
    templateId: string,
    structuredData: any
  ): Promise<UpdateStructuredDataResponse> {
    const { data } = await this.client.put<UpdateStructuredDataResponse>(
      `/documents/${documentId}/structures/${templateId}`,
      structuredData
    );
    return data;
  }

  // Templates API
  async uploadTemplate(
    file: File,
    name: string,
    description?: string,
    variables?: any
  ): Promise<TemplateUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) formData.append('description', description);
    if (variables) formData.append('variables', JSON.stringify(variables));

    const { data } = await this.client.post<TemplateUploadResponse>(
      '/templates',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  }

  async getTemplate(templateId: string): Promise<Template> {
    const { data } = await this.client.get<Template>(`/templates/${templateId}`);
    return data;
  }

  async listTemplates(limit: number = 20, lastKey?: string): Promise<ListResponse<Template>> {
    const params: any = { limit };
    if (lastKey) params.last_key = lastKey;

    const { data } = await this.client.get<ListResponse<Template>>('/templates', { params });
    return data;
  }

  async deleteTemplate(templateId: string): Promise<{ template_id: string; status: string }> {
    const { data } = await this.client.delete(`/templates/${templateId}`);
    return data;
  }

  // Conversion API
  async convertDocument(documentId: string, templateId: string): Promise<ExtractResponse> {
    const { data } = await this.client.post<ExtractResponse>(
      `/documents/${documentId}/convert`,
      { template_id: templateId }
    );
    return data;
  }

  // AI Processing API
  async enhanceField(
    documentId: string,
    fieldPath: string,
    templateId: string,
    instructions?: string
  ): Promise<ExtractResponse> {
    const { data } = await this.client.post<ExtractResponse>(
      `/documents/${documentId}/enhance`,
      { field_path: fieldPath, template_id: templateId, instructions }
    );
    return data;
  }

  async generateSummary(documentId: string, templateId: string): Promise<ExtractResponse> {
    const { data } = await this.client.post<ExtractResponse>(
      `/documents/${documentId}/summary`,
      { template_id: templateId }
    );
    return data;
  }

  // Files API
  async getDownloadUrl(
    fileId: string,
    type: 'original' | 'template' | 'converted',
    templateId?: string
  ): Promise<DownloadUrlResponse> {
    const params: any = { type };
    if (templateId) params.template_id = templateId;

    const { data } = await this.client.get<DownloadUrlResponse>(
      `/files/${fileId}/download`,
      { params }
    );
    return data;
  }

  // Jobs API
  async getJob(jobId: string): Promise<Job> {
    const { data } = await this.client.get<Job>(`/jobs/${jobId}`);
    return data;
  }

  async pollJob(jobId: string, timeout: number = 25): Promise<Job> {
    const { data } = await this.client.get<Job>(`/jobs/${jobId}/poll`, {
      params: { timeout },
      timeout: (timeout + 5) * 1000, // Add 5 seconds buffer
    });
    return data;
  }

  // Helper method to poll until completion
  async waitForJob(jobId: string, onProgress?: (job: Job) => void): Promise<Job> {
    let job = await this.pollJob(jobId);

    while (job.status === 'queued' || job.status === 'running') {
      if (onProgress) onProgress(job);
      job = await this.pollJob(jobId);
    }

    if (onProgress) onProgress(job);
    return job;
  }
}

export const apiClient = new ApiClient();
