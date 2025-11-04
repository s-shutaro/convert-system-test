import { create } from 'zustand';
import type { Document, Template, Job, StructuredData } from '@/types';

interface AppState {
  // Documents
  documents: Document[];
  selectedDocument: Document | null;

  // Structured Data (multi-template support)
  structuredDataMap: Map<string, StructuredData>; // key: `${documentId}_${templateId}`

  // Templates
  templates: Template[];
  selectedTemplate: Template | null;

  // Jobs
  activeJobs: Map<string, Job>;

  // UI State
  isLoading: boolean;

  // Actions - Documents
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  setSelectedDocument: (document: Document | null) => void;
  updateDocument: (documentId: string, updates: Partial<Document>) => void;
  removeDocument: (documentId: string) => void;

  // Actions - Structured Data
  setStructuredData: (documentId: string, templateId: string, data: StructuredData) => void;
  getStructuredData: (documentId: string, templateId: string) => StructuredData | undefined;
  clearStructuredData: (documentId: string) => void;

  // Actions - Templates
  setTemplates: (templates: Template[]) => void;
  addTemplate: (template: Template) => void;
  setSelectedTemplate: (template: Template | null) => void;
  removeTemplate: (templateId: string) => void;

  // Actions - Jobs
  setJob: (jobId: string, job: Job) => void;
  removeJob: (jobId: string) => void;
  getJob: (jobId: string) => Job | undefined;
  getActiveJobForTemplate: (documentId: string, templateId: string) => Job | undefined;
  getAllActiveJobs: () => Job[];

  // Actions - UI
  setIsLoading: (isLoading: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  documents: [],
  selectedDocument: null,
  structuredDataMap: new Map(),
  templates: [],
  selectedTemplate: null,
  activeJobs: new Map(),
  isLoading: false,

  // Document actions
  setDocuments: (documents) => set({ documents }),

  addDocument: (document) =>
    set((state) => ({ documents: [document, ...state.documents] })),

  setSelectedDocument: (document) => set({ selectedDocument: document }),

  updateDocument: (documentId, updates) =>
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.document_id === documentId ? { ...doc, ...updates } : doc
      ),
      selectedDocument:
        state.selectedDocument?.document_id === documentId
          ? { ...state.selectedDocument, ...updates }
          : state.selectedDocument,
    })),

  removeDocument: (documentId) =>
    set((state) => ({
      documents: state.documents.filter((doc) => doc.document_id !== documentId),
      selectedDocument:
        state.selectedDocument?.document_id === documentId ? null : state.selectedDocument,
    })),

  // Structured Data actions
  setStructuredData: (documentId, templateId, data) =>
    set((state) => {
      const key = `${documentId}_${templateId}`;
      const newMap = new Map(state.structuredDataMap);
      newMap.set(key, data);
      return { structuredDataMap: newMap };
    }),

  getStructuredData: (documentId, templateId) => {
    const key = `${documentId}_${templateId}`;
    return get().structuredDataMap.get(key);
  },

  clearStructuredData: (documentId) =>
    set((state) => {
      const newMap = new Map(state.structuredDataMap);
      // Remove all structured data for this document
      for (const key of newMap.keys()) {
        if (key.startsWith(`${documentId}_`)) {
          newMap.delete(key);
        }
      }
      return { structuredDataMap: newMap };
    }),

  // Template actions
  setTemplates: (templates) => set({ templates }),

  addTemplate: (template) =>
    set((state) => ({ templates: [template, ...state.templates] })),

  setSelectedTemplate: (template) => set({ selectedTemplate: template }),

  removeTemplate: (templateId) =>
    set((state) => ({
      templates: state.templates.filter((tpl) => tpl.template_id !== templateId),
      selectedTemplate:
        state.selectedTemplate?.template_id === templateId ? null : state.selectedTemplate,
    })),

  // Job actions
  setJob: (jobId, job) =>
    set((state) => {
      const newJobs = new Map(state.activeJobs);
      newJobs.set(jobId, job);
      return { activeJobs: newJobs };
    }),

  removeJob: (jobId) =>
    set((state) => {
      const newJobs = new Map(state.activeJobs);
      newJobs.delete(jobId);
      return { activeJobs: newJobs };
    }),

  getJob: (jobId) => get().activeJobs.get(jobId),

  getActiveJobForTemplate: (documentId, templateId) => {
    const jobs = Array.from(get().activeJobs.values());
    return jobs.find(
      (job) =>
        job.document_id === documentId &&
        job.template_id === templateId &&
        (job.status === 'queued' || job.status === 'running')
    );
  },

  getAllActiveJobs: () => {
    return Array.from(get().activeJobs.values()).filter(
      (job) => job.status === 'queued' || job.status === 'running'
    );
  },

  // UI actions
  setIsLoading: (isLoading) => set({ isLoading }),
}));
