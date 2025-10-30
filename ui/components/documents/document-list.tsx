'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Document } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface DocumentListProps {
  documents: Document[];
}

export function DocumentList({ documents }: DocumentListProps) {
  const router = useRouter();
  const removeDocument = useAppStore((state) => state.removeDocument);

  const handleDelete = async (documentId: string, filename: string) => {
    if (!confirm(`「${filename}」を削除しますか?`)) {
      return;
    }

    try {
      await apiClient.deleteDocument(documentId);
      removeDocument(documentId);
      toast.success('ドキュメントを削除しました');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '削除に失敗しました');
    }
  };

  const handleView = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>ドキュメントがありません</p>
        <p className="text-sm mt-2">PDFファイルをアップロードしてください</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <Card
          key={doc.document_id}
          className="hover:shadow-lg transition-shadow cursor-pointer"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>

            <h3 className="font-semibold mb-2 truncate" title={doc.filename}>
              {doc.filename}
            </h3>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(doc.created_at)}
            </div>

            {doc.converted_files && Object.keys(doc.converted_files).length > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                変換済み: {Object.keys(doc.converted_files).length}件
              </p>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleView(doc.document_id)}
              >
                詳細を見る
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(doc.document_id, doc.filename);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
