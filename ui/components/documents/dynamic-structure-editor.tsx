'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, Edit3, X, Sparkles, FileText, Copy, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';
import { FieldRenderer } from '@/components/dynamic-form/field-renderer';
import { ArrayFieldRenderer } from '@/components/dynamic-form/array-field-renderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PDFPreview } from './pdf-preview';

interface Template {
  template_id: string;
  name: string;
  variables?: string; // JSON文字列
}

interface DynamicStructureEditorProps {
  documentId: string;
  templateId: string;
  template: Template;
  initialData?: any;
  generatedIntroduction?: string;
  pdfUrl?: string;
  onSave?: () => void;
  onGenerateSummaryComplete?: () => void;
}

/**
 * テンプレート変数定義に基づいて動的に編集フォームを生成するコンポーネント
 *
 * 特徴:
 * - テンプレートのvariables定義を解析して動的にUIを生成
 * - プリミティブ値、オブジェクト、配列に対応
 * - 編集モードとプレビューモードを切り替え可能
 */
export function DynamicStructureEditor({
  documentId,
  templateId,
  template,
  initialData,
  generatedIntroduction,
  pdfUrl,
  onSave,
  onGenerateSummaryComplete,
}: DynamicStructureEditorProps) {
  const [data, setData] = useState<any>(initialData || {});
  const [saving, setSaving] = useState(false);
  const [variables, setVariables] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // AI機能のstate
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [enhancedResult, setEnhancedResult] = useState<string | null>(null);
  const [originalValue, setOriginalValue] = useState<string | null>(null);
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // テンプレート変数をパース
  useEffect(() => {
    if (template.variables) {
      try {
        const parsed = JSON.parse(template.variables);
        setVariables(parsed);
      } catch (error) {
        console.error('Failed to parse template variables:', error);
        toast.error('テンプレート変数の解析に失敗しました');
      }
    }
  }, [template.variables]);

  // 初期データが変更されたら更新
  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData, templateId, documentId]);

  // データが空でvariablesがある場合、初期値を生成
  useEffect(() => {
    if (variables && (!data || Object.keys(data).length === 0)) {
      const initialValue = generateInitialValue(variables);
      setData(initialValue);
    }
  }, [variables]);

  // スキーマに基づいて初期値を生成
  const generateInitialValue = (schema: any): any => {
    if (schema === null || schema === undefined || schema === '') {
      return '';
    }
    if (typeof schema === 'string') {
      return '';
    }
    if (typeof schema === 'number') {
      return 0;
    }
    if (typeof schema === 'boolean') {
      return false;
    }
    if (Array.isArray(schema)) {
      return [];
    }
    if (typeof schema === 'object') {
      const initial: any = {};
      Object.keys(schema).forEach((key) => {
        initial[key] = generateInitialValue(schema[key]);
      });
      return initial;
    }
    return '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateStructuredData(documentId, templateId, data);
      toast.success('データを保存しました');
      if (onSave) onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // ネストされたパスから値を取得
  const getNestedValue = (obj: any, path: string): any => {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  };

  // 紹介文生成
  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await apiClient.generateSummary(documentId, templateId);
      toast.info('紹介文の生成を開始しました');

      const job = await apiClient.waitForJob(response.job_id);

      if (job.status === 'succeeded' || job.status === 'completed') {
        toast.success('紹介文の生成が完了しました');
        // 親コンポーネントでドキュメントを再取得してgenerated_introductionを更新
        if (onGenerateSummaryComplete) {
          await onGenerateSummaryComplete();
        }
      } else if (job.status === 'failed') {
        const errorMsg = getUserFriendlyErrorMessage(job.error);
        toast.error(errorMsg, { duration: 6000 });
      } else {
        toast.error('紹介文の生成に失敗しました');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '紹介文の生成に失敗しました');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // フィールドをブラッシュアップ
  const handleEnhanceField = async (fieldPath: string) => {
    const currentValue = getNestedValue(data, fieldPath);
    if (!currentValue || typeof currentValue !== 'string') {
      toast.error('このフィールドはブラッシュアップできません');
      return;
    }

    setEnhancingField(fieldPath);
    setOriginalValue(currentValue);

    try {
      const response = await apiClient.enhanceField(documentId, fieldPath, templateId);
      toast.info('ブラッシュアップを開始しました');

      const job = await apiClient.waitForJob(response.job_id);

      if (job.status === 'succeeded' || job.status === 'completed') {
        const updatedStructure = await apiClient.getStructuredData(documentId, templateId);
        const improvedFieldPath = `${fieldPath}_improved`;
        const improvedValue = getNestedValue(updatedStructure.structured_data, improvedFieldPath);

        if (improvedValue) {
          setEnhancedResult(improvedValue);
          setEnhanceDialogOpen(true);
        } else {
          setEnhancingField(null);
          toast.error('ブラッシュアップ結果が見つかりませんでした');
        }
      } else if (job.status === 'failed') {
        setEnhancingField(null);
        const errorMsg = getUserFriendlyErrorMessage(job.error);
        toast.error(errorMsg, { duration: 6000 });
      } else {
        setEnhancingField(null);
        toast.error('ブラッシュアップに失敗しました');
      }
    } catch (error: any) {
      setEnhancingField(null);
      toast.error(error.response?.data?.detail || 'ブラッシュアップに失敗しました');
    }
  };

  // ブラッシュアップ結果を採用
  const handleAcceptEnhancement = () => {
    if (enhancingField && enhancedResult) {
      handleFieldChange(enhancingField, enhancedResult);
      setEnhanceDialogOpen(false);
      setEnhancedResult(null);
      setOriginalValue(null);
      setEnhancingField(null);
      toast.success('ブラッシュアップを適用しました');
    }
  };

  // ブラッシュアップをキャンセル
  const handleCancelEnhancement = () => {
    setEnhanceDialogOpen(false);
    setEnhancedResult(null);
    setOriginalValue(null);
    setEnhancingField(null);
  };

  // 紹介文をコピー
  const handleCopyIntroduction = async () => {
    if (!generatedIntroduction) {
      toast.error('コピーする紹介文がありません');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedIntroduction);
      setCopied(true);
      toast.success('紹介文をコピーしました');

      // 2秒後にアイコンを元に戻す
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error('コピーに失敗しました');
    }
  };

  // ネストされたパスに対応したフィールド更新
  const handleFieldChange = (path: string, value: any) => {
    const keys = path.split('.');

    // ディープコピーを実装
    const deepClone = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(item => deepClone(item));
      const cloned: any = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
      });
      return cloned;
    };

    const newData = deepClone(data);
    let current: any = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const isArrayIndex = /^\d+$/.test(key);

      if (isArrayIndex) {
        // 配列インデックスの場合
        const index = parseInt(key, 10);
        if (!Array.isArray(current)) {
          current = [];
        }
        // 配列要素が存在しない場合は初期化
        if (!current[index]) {
          const nextKey = keys[i + 1];
          current[index] = /^\d+$/.test(nextKey) ? [] : {};
        }
        current = current[index];
      } else {
        // オブジェクトキーの場合
        if (!current[key]) {
          const nextKey = keys[i + 1];
          current[key] = /^\d+$/.test(nextKey) ? [] : {};
        }
        current = current[key];
      }
    }

    const lastKey = keys[keys.length - 1];
    const isArrayIndex = /^\d+$/.test(lastKey);

    if (isArrayIndex) {
      const index = parseInt(lastKey, 10);
      if (!Array.isArray(current)) {
        current = [];
      }
      current[index] = value;
    } else {
      current[lastKey] = value;
    }

    setData(newData);
  };

  // フィールド名をラベル用にフォーマット
  const formatLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // テンプレート変数が未定義の場合
  if (!variables) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{template.name}</CardTitle>
          <CardDescription>
            このテンプレートには変数定義がありません
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            テンプレート登録時に変数定義（JSON形式）を設定してください。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{template.name}</span>
            <div className="flex gap-2">
              <Button onClick={() => setEditDialogOpen(true)} variant="outline" size="sm">
                <Edit3 className="mr-2 h-4 w-4" />
                編集
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            テンプレート変数に基づいて動的に生成されたフォームです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              「編集」ボタンをクリックして構造化データを編集できます。
              「プレビュー」ボタンでExcel埋め込み形式を確認できます。
            </p>
            {/* データサマリー表示 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.keys(variables).map((key) => {
                const value = data[key];
                const hasValue = value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0);
                return (
                  <div key={key} className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">{formatLabel(key)}</p>
                    <p className="text-sm font-medium mt-1">
                      {hasValue ? (
                        Array.isArray(value) ? `${value.length}件` : '入力済み'
                      ) : (
                        <span className="text-muted-foreground">未入力</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 営業用紹介文生成 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              営業用紹介文
            </span>
            <div className="flex gap-2">
              {generatedIntroduction && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyIntroduction}
                  disabled={!generatedIntroduction}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      コピー
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
              >
                {generatingSummary ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    紹介文を生成
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            構造化データ全体から営業用の紹介文を自動生成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={generatedIntroduction || ''}
            readOnly
            rows={8}
            className="max-h-[500px] overflow-y-auto resize-y bg-gray-50"
            placeholder="「紹介文を生成」ボタンをクリックして紹介文を作成してください"
          />
          {!generatedIntroduction && (
            <p className="text-xs text-muted-foreground mt-2">
              まだ紹介文が生成されていません。「紹介文を生成」ボタンをクリックして作成してください。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 編集モーダル - 全画面幅 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="!max-w-[98vw] !w-[98vw] !h-[95vh] !p-0 flex">
          <div className="flex flex-col h-full w-full">
            {/* ヘッダー */}
            <div className="px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  構造化データ編集 - {template.name}
                </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      handleSave();
                    }}
                    disabled={saving}
                    size="sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditDialogOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 2カラムレイアウト */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* 左カラム: PDFプレビュー */}
              <div className="w-1/2 border-r overflow-y-auto bg-gray-50">
                <div className="p-6">
                  <h3 className="text-sm font-semibold mb-4 text-gray-700">
                    オリジナルPDF
                  </h3>
                  {pdfUrl ? (
                    <div className="h-[calc(95vh-180px)] overflow-auto">
                      <PDFPreview url={pdfUrl} filename="Document" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                      <p className="text-gray-500">PDFプレビューが利用できません</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 右カラム: 編集フォーム */}
              <div className="w-1/2 overflow-y-auto">
                <div className="p-6 space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">
                      左側のPDFを参照しながら、右側のフォームでデータを編集できます。
                    </p>
                  </div>

                  {Object.keys(variables).map((key) => {
                    const fieldSchema = variables[key];
                    const fieldValue = data[key];

                    return (
                      <div key={key} className="space-y-3">
                        <h3 className="text-base font-semibold border-b pb-2">
                          {formatLabel(key)}
                        </h3>

                        {Array.isArray(fieldSchema) ? (
                          // 配列フィールド
                          <ArrayFieldRenderer
                            fieldPath={key}
                            fieldLabel={formatLabel(key)}
                            itemSchema={fieldSchema[0]}
                            value={fieldValue || []}
                            onChange={handleFieldChange}
                          />
                        ) : (
                          // 通常のフィールド（オブジェクトまたはプリミティブ）
                          <FieldRenderer
                            fieldPath={key}
                            fieldSchema={fieldSchema}
                            value={fieldValue}
                            onChange={handleFieldChange}
                            level={0}
                            onEnhance={handleEnhanceField}
                            enhancingField={enhancingField}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center flex-shrink-0">
              <p className="text-sm text-muted-foreground">
                変更は自動保存されません。「保存」ボタンをクリックしてください。
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  閉じる
                </Button>
                <Button
                  onClick={() => {
                    handleSave();
                    setEditDialogOpen(false);
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      保存して閉じる
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* プレビューモーダル */}
      {/* ブラッシュアップ結果プレビューダイアログ */}
      <Dialog open={enhanceDialogOpen} onOpenChange={setEnhanceDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] !p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                ブラッシュアップ結果
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancelEnhancement}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 元のテキスト */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">元のテキスト</Label>
                <Textarea
                  value={originalValue || ''}
                  readOnly
                  rows={12}
                  className="bg-gray-50 resize-y max-h-[400px]"
                />
              </div>

              {/* 改善後のテキスト */}
              <div className="space-y-2">
                <Label className="text-base font-semibold text-green-700">改善後のテキスト</Label>
                <Textarea
                  value={enhancedResult || ''}
                  onChange={(e) => setEnhancedResult(e.target.value)}
                  rows={12}
                  className="border-green-300 focus:border-green-500 resize-y max-h-[400px]"
                  placeholder="改善後のテキスト"
                />
                <p className="text-xs text-muted-foreground">
                  ※ 採用前に微調整できます
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              改善後のテキストを確認し、「採用する」をクリックすると元のフィールドが置き換わります
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelEnhancement}>
                キャンセル
              </Button>
              <Button onClick={handleAcceptEnhancement} className="bg-green-600 hover:bg-green-700">
                <Sparkles className="mr-2 h-4 w-4" />
                採用する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

