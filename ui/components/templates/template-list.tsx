'use client';

import React from 'react';
import { FileSpreadsheet, Clock, Trash2, Download, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Template } from '@/types';
import { formatRelativeTime, parseVariables } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface TemplateListProps {
  templates: Template[];
}

export function TemplateList({ templates }: TemplateListProps) {
  const removeTemplate = useAppStore((state) => state.removeTemplate);

  const handleDelete = async (templateId: string, name: string) => {
    if (!confirm(`テンプレート「${name}」を削除しますか?`)) {
      return;
    }

    try {
      await apiClient.deleteTemplate(templateId);
      removeTemplate(templateId);
      toast.success('テンプレートを削除しました');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '削除に失敗しました');
    }
  };

  const handleDownload = async (templateId: string, filename: string) => {
    try {
      const response = await apiClient.getDownloadUrl(templateId, 'template');

      const link = document.createElement('a');
      link.href = response.download_url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('ダウンロードを開始しました');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'ダウンロードに失敗しました');
    }
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileSpreadsheet className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>テンプレートがありません</p>
        <p className="text-sm mt-2">Excelテンプレートを登録してください</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const variables = parseVariables(template.variables);
        const hasVariables = variables && Object.keys(variables).length > 0;

        return (
          <Card key={template.template_id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                {hasVariables && <Badge variant="outline">変数定義あり</Badge>}
              </div>

              <h3 className="font-semibold mb-1" title={template.name}>
                {template.name}
              </h3>

              {template.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <p className="text-xs text-muted-foreground mb-1 truncate" title={template.filename}>
                {template.filename}
              </p>

              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(template.created_at)}
              </div>

              {hasVariables && (
                <div className="mb-4">
                  <p className="text-xs font-medium mb-1">変数:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(variables).slice(0, 3).map((key) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                    {Object.keys(variables).length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{Object.keys(variables).length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleDownload(template.template_id, template.filename)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  DL
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(template.template_id, template.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
