'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Loader2, FileDown, Download } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Template, Job } from '@/types';

interface ConvertFormProps {
  documentId: string;
  convertedFiles?: { [template_id: string]: string }; // template_id -> S3 file key
  onConvertComplete?: () => void;
}

export function ConvertForm({ documentId, convertedFiles, onConvertComplete }: ConvertFormProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [converting, setConverting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiClient.listTemplates(50);
      setTemplates(response.items);
      if (response.items.length > 0) {
        setSelectedTemplateId(response.items[0].template_id);
      }
    } catch (error: any) {
      toast.error('テンプレート一覧の取得に失敗しました');
    }
  };

  const handleConvert = async () => {
    if (!selectedTemplateId) {
      toast.error('テンプレートを選択してください');
      return;
    }

    setConverting(true);
    try {
      const response = await apiClient.convertDocument(documentId, selectedTemplateId);
      toast.info('変換を開始しました');

      // Poll for completion
      const job = await apiClient.waitForJob(response.job_id, (currentJob: Job) => {
        toast.info(`処理中: ${currentJob.step}`);
      });

      if (job.status === 'succeeded' || job.status === 'completed') {
        toast.success('変換が完了しました');

        // Auto download
        await handleDownload(selectedTemplateId);

        if (onConvertComplete) {
          onConvertComplete();
        }
      } else {
        toast.error(`変換に失敗しました: ${job.error || '不明なエラー'}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '変換に失敗しました');
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = async (templateId: string) => {
    setDownloading(templateId);
    try {
      const response = await apiClient.getDownloadUrl(documentId, 'converted', templateId);

      // Download using the signed URL
      const link = document.createElement('a');
      link.href = response.download_url;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('ダウンロードを開始しました');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'ダウンロードに失敗しました');
    } finally {
      setDownloading(null);
    }
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Excel変換</CardTitle>
          <CardDescription>
            変換を実行する前に、テンプレートを登録してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.href = '/templates'}>
            テンプレート管理へ
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Excel変換
          </CardTitle>
          <CardDescription>
            構造化データをExcelテンプレートに変換します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">テンプレート</Label>
            <Select
              id="template"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={converting}
            >
              {templates.map((template) => (
                <option key={template.template_id} value={template.template_id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </div>

          <Button
            onClick={handleConvert}
            disabled={converting || !selectedTemplateId}
            className="w-full"
          >
            {converting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                変換中...
              </>
            ) : (
              '変換を開始'
            )}
          </Button>
        </CardContent>
      </Card>

      {convertedFiles && Object.keys(convertedFiles).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>変換済みファイル</CardTitle>
            <CardDescription>
              過去に変換されたファイルをダウンロードできます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(convertedFiles).map(([templateId, fileKeyOrObject]) => {
              // Handle both string and object formats from API
              const fileKey = typeof fileKeyOrObject === 'string'
                ? fileKeyOrObject
                : (fileKeyOrObject as any)?.file_key;

              const template = templates.find(t => t.template_id === templateId);
              return (
                <div
                  key={templateId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{template?.name || templateId}</p>
                    {fileKey && <p className="text-xs text-muted-foreground">{fileKey}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(templateId)}
                    disabled={downloading === templateId}
                  >
                    {downloading === templateId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        ダウンロード
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
