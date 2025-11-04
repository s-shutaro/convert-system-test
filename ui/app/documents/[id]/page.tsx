'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PDFPreview } from '@/components/documents/pdf-preview';
import { ExtractForm } from '@/components/documents/extract-form';
import { StructureEditor } from '@/components/documents/structure-editor';
import { DynamicStructureEditor } from '@/components/documents/dynamic-structure-editor';
import { ConvertForm } from '@/components/documents/convert-form';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { getStatusColor, getStatusLabel, formatRelativeTime } from '@/lib/utils';
import type { Document, StructuredDataListItem, Template } from '@/types';
import { JobProgressCard } from '@/components/documents/job-progress-card';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [structures, setStructures] = useState<StructuredDataListItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [structuresLoaded, setStructuresLoaded] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const setStructuredData = useAppStore((state) => state.setStructuredData);
  const getStructuredData = useAppStore((state) => state.getStructuredData);
  const getActiveJobForTemplate = useAppStore((state) => state.getActiveJobForTemplate);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 並行実行して両方の完了を待つ
        const [doc, templatesResponse] = await Promise.all([
          apiClient.getDocument(documentId),
          apiClient.listTemplates(50)
        ]);

        setDocument(doc);
        setTemplates(templatesResponse.items);

        // その後、順次処理
        const urlResponse = await apiClient.getDownloadUrl(documentId, 'original');
        setPdfUrl(urlResponse.download_url);

        await loadStructuresList();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [documentId]);

  useEffect(() => {
    if (selectedTemplateId) {
      loadStructureForTemplate(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const loadDocument = async () => {
    try {
      const doc = await apiClient.getDocument(documentId);
      setDocument(doc);

      // Get PDF download URL
      const urlResponse = await apiClient.getDownloadUrl(documentId, 'original');
      setPdfUrl(urlResponse.download_url);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'ドキュメントの取得に失敗しました');
    }
  };

  const loadStructuresList = async () => {
    try {
      const response = await apiClient.listStructuredData(documentId);
      console.log('Structures list response:', response);
      console.log('Items:', response.items);
      response.items?.forEach((item, index) => {
        console.log(`Structure ${index}:`, {
          template_id: item.template_id,
          status: item.status,
          statusType: typeof item.status
        });
      });
      setStructures(response.items || []);
      setStructuresLoaded(true);

      // Auto-select first completed structure
      const completed = response.items?.find(s => s.status === 'completed');
      console.log('Found completed structure:', completed);

      // If no completed, select first one anyway
      if (!completed && response.items && response.items.length > 0) {
        const firstStructure = response.items[0];
        console.log('No completed structure found, selecting first:', firstStructure);
        if (!selectedTemplateId) {
          console.log('Auto-selecting first template:', firstStructure.template_id);
          setSelectedTemplateId(firstStructure.template_id);
        }
      } else if (completed && !selectedTemplateId) {
        console.log('Auto-selecting completed template:', completed.template_id);
        setSelectedTemplateId(completed.template_id);
      }
    } catch (error: any) {
      console.log('No structured data available yet');
      setStructures([]);
      setStructuresLoaded(true);
    }
  };

  const loadStructureForTemplate = async (templateId: string) => {
    try {
      console.log(`Loading structure for template ${templateId}...`);
      const structuredData = await apiClient.getStructuredData(documentId, templateId);
      console.log('Loaded structured data:', structuredData);
      setStructuredData(documentId, templateId, structuredData);
      console.log('Stored in state');
    } catch (error: any) {
      console.error(`Structure for template ${templateId} not available:`, error);
    }
  };

  const handleExtractComplete = async () => {
    await loadDocument();
    await loadStructuresList();
  };

  const handleStructureSave = async () => {
    await loadStructureForTemplate(selectedTemplateId);
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await apiClient.getDownloadUrl(documentId, 'original');
      const link = window.document.createElement('a');
      link.href = response.download_url;
      link.download = response.filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      toast.success('ダウンロードを開始しました');
    } catch (error: any) {
      toast.error('ダウンロードに失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">ドキュメントが見つかりません</p>
        <Button className="mt-4" onClick={() => router.push('/')}>
          ホームに戻る
        </Button>
      </div>
    );
  }

  const currentStructure = selectedTemplateId
    ? getStructuredData(documentId, selectedTemplateId)
    : null;

  console.log('Current state:', {
    documentId,
    selectedTemplateId,
    structuresCount: structures.length,
    currentStructure,
    hasStructuredData: !!currentStructure?.structured_data
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{document.filename}</h1>
            {/* ドキュメント自体にステータスはないため、構造化データのステータスを表示 */}
            {structures.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {structures.map((structure) => {
                  const template = templates.find(t => t.template_id === structure.template_id);
                  const activeJob = getActiveJobForTemplate(documentId, structure.template_id);
                  const isProcessing = activeJob && (activeJob.status === 'queued' || activeJob.status === 'running');

                  return (
                    <div key={structure.template_id} className="flex items-center gap-1">
                      <Badge className={getStatusColor(isProcessing ? activeJob.status : structure.status)}>
                        {template?.name || structure.template_id}: {getStatusLabel(isProcessing ? activeJob.status : structure.status)}
                      </Badge>
                      {structure.status === 'completed' && !isProcessing && (
                        <span className="text-xs text-muted-foreground">
                          ({formatRelativeTime(structure.updated_at)})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={handleDownloadPDF}>
          <Download className="h-4 w-4 mr-2" />
          PDFをダウンロード
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: PDF Preview & Extract */}
        <div className="space-y-6">
          {pdfUrl && <PDFPreview url={pdfUrl} filename={document.filename} />}

          {/* 構造抽出フォームは常に表示（複数テンプレートで抽出可能） */}
          <ExtractForm
            documentId={documentId}
            onExtractComplete={handleExtractComplete}
          />
        </div>

        {/* Right Column: Structure Editor & Convert */}
        <div className="space-y-6">
          {/* Template Selector */}
          {structuresLoaded && structures && structures.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="template-select">表示するテンプレート</Label>
              <Select
                id="template-select"
                value={selectedTemplateId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTemplateId(e.target.value)}
              >
                {structures.map((structure) => {
                  const template = templates.find(t => t.template_id === structure.template_id);
                  return (
                    <option key={structure.template_id} value={structure.template_id}>
                      {template?.name || structure.template_id} ({getStatusLabel(structure.status)})
                    </option>
                  );
                })}
              </Select>
            </div>
          )}

          {/* Processing Job Progress Card */}
          {selectedTemplateId && (() => {
            const activeJob = getActiveJobForTemplate(documentId, selectedTemplateId);
            const template = templates.find(t => t.template_id === selectedTemplateId);

            if (activeJob && (activeJob.status === 'queued' || activeJob.status === 'running')) {
              return (
                <JobProgressCard
                  job={activeJob}
                  templateName={template?.name}
                />
              );
            }
            return null;
          })()}

          {/* Show structure data or processing message */}
          {(() => {
            const activeJob = getActiveJobForTemplate(documentId, selectedTemplateId);
            const isProcessing = activeJob && (activeJob.status === 'queued' || activeJob.status === 'running');

            // Show processing message if job is active and no completed data yet
            if (isProcessing && (!currentStructure || currentStructure.status !== 'completed')) {
              return (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-yellow-500" />
                  <p className="font-medium">処理中です...</p>
                  <p className="text-sm mt-2">完了するまでお待ちください</p>
                </div>
              );
            }

            // Show completed data
            if (currentStructure && currentStructure.status === 'completed') {
              return (
                <>
                  {/* Show info if there's a processing job but we're showing old data */}
                  {isProcessing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        現在、新しい分析を処理中です。以下は前回の完了済みデータです。
                      </p>
                    </div>
                  )}

                  {/* 動的構造化データエディター: テンプレート変数に基づいてUIを生成 */}
                  {(() => {
                    const template = templates.find(t => t.template_id === selectedTemplateId);

                    if (!template) {
                      // templatesがまだ読み込まれていない可能性
                      if (templates.length === 0) {
                        return (
                          <div className="flex justify-center items-center min-h-[200px]">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">
                              テンプレート情報を読み込んでいます...
                            </span>
                          </div>
                        );
                      }
                      // テンプレートが見つからない場合はフォールバック
                      return (
                        <StructureEditor
                          documentId={documentId}
                          templateId={selectedTemplateId}
                          initialData={currentStructure.structured_data}
                          onSave={handleStructureSave}
                        />
                      );
                    }

                    return (
                      <DynamicStructureEditor
                        documentId={documentId}
                        templateId={selectedTemplateId}
                        template={template}
                        initialData={currentStructure.structured_data}
                        pdfUrl={pdfUrl}
                        onSave={handleStructureSave}
                      />
                    );
                  })()}

                  <ConvertForm
                    documentId={documentId}
                    convertedFiles={document.converted_files}
                    onConvertComplete={loadDocument}
                  />
                </>
              );
            }

            return null;
          })()}

          {structuresLoaded && structures.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>構造化データがまだありません</p>
              <p className="text-sm mt-2">左側のフォームからテンプレートを選択して構造抽出を実行してください</p>
              <Button className="mt-4" onClick={loadStructuresList}>
                再読み込み
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
