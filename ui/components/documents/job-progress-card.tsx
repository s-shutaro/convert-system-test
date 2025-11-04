'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Job } from '@/types';

interface JobProgressCardProps {
  job: Job;
  templateName?: string;
}

export function JobProgressCard({ job, templateName }: JobProgressCardProps) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'queued':
        return 'キュー待ち';
      case 'running':
        return '処理中';
      case 'succeeded':
      case 'completed':
        return '完了';
      case 'failed':
        return '失敗';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-gray-500';
      case 'running':
        return 'bg-yellow-500';
      case 'succeeded':
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}分${seconds}秒前`;
    }
    return `${seconds}秒前`;
  };

  const isProcessing = job.status === 'queued' || job.status === 'running';

  return (
    <Card className={`border-l-4 ${isProcessing ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-gray-300'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />}
            {templateName ? `${templateName} - 処理状況` : 'ジョブ処理状況'}
          </span>
          <Badge className={getStatusColor(job.status)}>
            {getStatusLabel(job.status)}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          {formatTimestamp(job.updated_at)}に更新
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isProcessing && (
          <div className="bg-white border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-medium text-yellow-800">
              {job.step || '処理中...'}
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {!isProcessing && job.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              処理が完了しました。最新のデータが表示されています。
            </p>
          </div>
        )}

        {job.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800">
              エラーが発生しました
            </p>
            {job.error && (
              <p className="text-xs text-red-600 mt-1">
                {job.error}
              </p>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          ジョブID: {job.job_id}
        </div>
      </CardContent>
    </Card>
  );
}
