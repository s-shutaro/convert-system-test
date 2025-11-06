'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface TemplateFormData {
  name: string;
  description: string;
  variables: string;
}

interface UploadTemplateProps {
  onSuccess?: () => void;
}

export function UploadTemplate({ onSuccess }: UploadTemplateProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const addTemplate = useAppStore((state) => state.addTemplate);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TemplateFormData>();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate Excel file
      if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
        toast.error('Excelファイル(.xlsx)のみアップロード可能です');
        return;
      }

      setFile(selectedFile);
    }
  };

  const onSubmit = async (data: TemplateFormData) => {
    if (!file) {
      toast.error('ファイルを選択してください');
      return;
    }

    setUploading(true);
    try {
      let variables: any = null;

      // Parse variables if provided
      if (data.variables.trim()) {
        try {
          variables = JSON.parse(data.variables);
        } catch (e) {
          toast.error('変数定義のJSONが不正です');
          setUploading(false);
          return;
        }
      }

      const response = await apiClient.uploadTemplate(
        file,
        data.name,
        data.description,
        variables
      );

      // Fetch full template details
      const template = await apiClient.getTemplate(response.template_id);

      addTemplate(template);
      toast.success(`テンプレート「${data.name}」を登録しました`);

      // Reset form
      reset();
      setFile(null);
      setOpen(false);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        テンプレートを登録
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>テンプレート登録</DialogTitle>
            <DialogDescription>
              Excelテンプレートファイルと変数定義を登録します
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>Excelファイル (.xlsx)</Label>
              {!file ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <FileSpreadsheet className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    クリックしてファイルを選択
                  </p>
                </label>
              ) : (
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-sm">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">テンプレート名 *</Label>
              <Input
                id="name"
                {...register('name', { required: '必須項目です' })}
                placeholder="例: 標準スキルシートテンプレート"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="テンプレートの説明を入力"
                rows={3}
              />
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <Label htmlFor="variables">変数定義（JSON形式、任意）</Label>
              <Textarea
                id="variables"
                {...register('variables')}
                placeholder={`例:
{
  "basic_info": {
    "name": "",
    "age": ""
  },
  "work_experience": [],
  "skills": []
}`}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                テンプレート内で使用する変数の構造をJSON形式で定義します
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={uploading}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={uploading || !file}>
                {uploading ? 'アップロード中...' : '登録'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
