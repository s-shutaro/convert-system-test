'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import type { Template, AnalysisType, Job } from '@/types';
import { getUserFriendlyErrorMessage, getJobStatusMessage } from '@/lib/error-messages';

interface ExtractFormProps {
  documentId: string;
  onExtractStart?: (jobId: string) => void;
  onExtractComplete?: () => void;
}

export function ExtractForm({ documentId, onExtractStart, onExtractComplete }: ExtractFormProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('vision');
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const setJob = useAppStore((state) => state.setJob);

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

  const handleExtract = async () => {
    if (!selectedTemplateId) {
      toast.error('テンプレートを選択してください');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.extractStructure(
        documentId,
        selectedTemplateId,
        analysisType
      );

      const jobId = response.job_id;
      toast.info('構造抽出を開始しました');

      if (onExtractStart) {
        onExtractStart(jobId);
      }

      // Start polling
      setPolling(true);
      pollJob(jobId);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '構造抽出の開始に失敗しました');
      setLoading(false);
    }
  };

  const pollJob = async (jobId: string) => {
    try {
      const job = await apiClient.waitForJob(jobId, (currentJob: Job) => {
        // Add document_id and template_id to job for tracking
        const enrichedJob = {
          ...currentJob,
          document_id: documentId,
          template_id: selectedTemplateId,
        };
        setJob(jobId, enrichedJob);

        // Show user-friendly status message
        const statusMsg = getJobStatusMessage(currentJob.status, currentJob.step);
        if (currentJob.status === 'failed') {
          const errorMsg = getUserFriendlyErrorMessage(currentJob.error);
          toast.error(errorMsg, { duration: 6000 });
        } else {
          toast.info(statusMsg);
        }
      });

      if (job.status === 'succeeded' || job.status === 'completed') {
        toast.success('構造抽出が完了しました');
        if (onExtractComplete) {
          onExtractComplete();
        }
      } else if (job.status === 'failed') {
        // Show user-friendly error message
        const errorMsg = getUserFriendlyErrorMessage(job.error);
        toast.error(errorMsg, {
          duration: 6000, // Show error longer
        });
      }
    } catch (error: any) {
      toast.error('ジョブの監視に失敗しました');
    } finally {
      setLoading(false);
      setPolling(false);
    }
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>構造抽出</CardTitle>
          <CardDescription>
            構造抽出を実行する前に、テンプレートを登録してください
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          構造抽出
        </CardTitle>
        <CardDescription>
          AIを使用してPDFから構造化データを抽出します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template">テンプレート</Label>
          <Select
            id="template"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={loading}
          >
            {templates.map((template) => (
              <option key={template.template_id} value={template.template_id}>
                {template.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="analysis">分析方式</Label>
          <Select
            id="analysis"
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
            disabled={loading}
          >
            <option value="vision">Vision (GPT-4/5 Vision - 署名付きURL)</option>
            <option value="base64">BASE64 (GPT-4/5 Vision)</option>
            <option value="text">Text (pypdf + GPT-5)</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Vision: レイアウト保持、手書き対応 / BASE64: Visionと同様 / Text: 高速・低コスト（失敗時Visionフォールバック）
          </p>
        </div>

        <Button
          onClick={handleExtract}
          disabled={loading || !selectedTemplateId}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {polling ? '処理中...' : '開始中...'}
            </>
          ) : (
            '構造抽出を開始'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
