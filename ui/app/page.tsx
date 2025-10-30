'use client';

import { useEffect, useState } from 'react';
import { UploadDocument } from '@/components/documents/upload-document';
import { DocumentList } from '@/components/documents/document-list';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function Home() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}

function HomePage() {
  const [loading, setLoading] = useState(true);
  const documents = useAppStore((state) => state.documents);
  const setDocuments = useAppStore((state) => state.setDocuments);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await apiClient.listDocuments(50);
      setDocuments(response.items);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'ドキュメントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">ドキュメント管理</h1>
        <p className="text-muted-foreground">
          PDFファイルをアップロードして、AIによる構造抽出とテンプレート変換を実行できます
        </p>
      </div>

      <UploadDocument />

      <div>
        <h2 className="text-2xl font-semibold mb-4">アップロード済みドキュメント</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DocumentList documents={documents} />
        )}
      </div>
    </div>
  );
}
