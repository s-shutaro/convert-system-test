'use client';

import { useEffect, useState } from 'react';
import { UploadTemplate } from '@/components/templates/upload-template';
import { TemplateList } from '@/components/templates/template-list';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function TemplatesPage() {
  return (
    <ProtectedRoute>
      <TemplatesPageContent />
    </ProtectedRoute>
  );
}

function TemplatesPageContent() {
  const [loading, setLoading] = useState(true);
  const templates = useAppStore((state) => state.templates);
  const setTemplates = useAppStore((state) => state.setTemplates);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiClient.listTemplates(50);
      setTemplates(response.items);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">テンプレート管理</h1>
          <p className="text-muted-foreground">
            Excelテンプレートを登録して、ドキュメント変換時に使用できます
          </p>
        </div>
        <UploadTemplate onSuccess={loadTemplates} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">登録済みテンプレート</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <TemplateList templates={templates} />
        )}
      </div>
    </div>
  );
}
