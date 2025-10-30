'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, Eye, Edit3, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { FieldRenderer } from '@/components/dynamic-form/field-renderer';
import { ArrayFieldRenderer } from '@/components/dynamic-form/array-field-renderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  pdfUrl?: string;
  onSave?: () => void;
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
  pdfUrl,
  onSave,
}: DynamicStructureEditorProps) {
  const [data, setData] = useState<any>(initialData || {});
  const [saving, setSaving] = useState(false);
  const [variables, setVariables] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

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
  }, [initialData]);

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

  // ネストされたパスに対応したフィールド更新
  const handleFieldChange = (path: string, value: any) => {
    const keys = path.split('.');
    const newData = { ...data };
    let current: any = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        // 次のキーが数値かどうかで配列かオブジェクトか判定
        const nextKey = keys[i + 1];
        current[key] = /^\d+$/.test(nextKey) ? [] : {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
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
              <Button onClick={() => setPreviewDialogOpen(true)} variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                プレビュー
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
                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-inner">
                      <iframe
                        src={pdfUrl}
                        className="w-full h-[calc(95vh-180px)]"
                        title="PDF Preview"
                      />
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
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Excel埋め込みプレビュー</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ExcelPreviewRenderer variables={variables} data={data} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Excel埋め込み形式のプレビュー表示コンポーネント
 * {{変数名}}の形式で表示し、実際のExcel埋め込みイメージを再現
 */
function ExcelPreviewRenderer({ variables, data }: { variables: any; data: any }) {
  const renderExcelCell = (path: string, value: any): React.ReactElement => {
    const placeholder = `{{${path}}}`;
    const displayValue = value !== undefined && value !== null && value !== '' ? String(value) : placeholder;
    const isPlaceholder = displayValue === placeholder;

    return (
      <div
        className={`
          px-3 py-2 border border-gray-300 bg-white font-mono text-sm
          ${isPlaceholder ? 'text-blue-600 italic' : 'text-gray-900'}
        `}
      >
        {displayValue}
      </div>
    );
  };

  const renderSection = (schema: any, currentData: any, basePath: string = ''): JSX.Element => {
    // 配列の場合
    if (Array.isArray(schema)) {
      const arrayData = currentData || [];

      return (
        <div className="space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 font-mono text-xs text-yellow-800">
            {'{{#repeat:' + basePath + '}}'}
          </div>

          {arrayData.length === 0 ? (
            <div className="text-sm text-muted-foreground italic p-4 bg-gray-50 rounded">
              配列データがありません。実際のExcel変換時、このセクションは削除されます。
            </div>
          ) : (
            arrayData.map((item: any, index: number) => (
              <div key={index} className="border-l-2 border-blue-300 pl-4 space-y-2">
                <p className="text-xs font-semibold text-blue-700">項目 {index + 1}</p>
                {typeof schema[0] === 'object' && !Array.isArray(schema[0]) ? (
                  <div className="grid grid-cols-1 gap-2">
                    {Object.keys(schema[0]).map((key) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          {formatLabel(key)}
                        </label>
                        {renderExcelCell(`${basePath}.${index}.${key}`, item[key])}
                      </div>
                    ))}
                  </div>
                ) : (
                  renderExcelCell(`${basePath}.${index}`, item)
                )}
              </div>
            ))
          )}

          <div className="bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 font-mono text-xs text-yellow-800">
            {'{{#end:' + basePath + '}}'}
          </div>
        </div>
      );
    }

    // オブジェクトの場合
    if (typeof schema === 'object' && schema !== null) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(schema).map((key) => {
            const fieldPath = basePath ? `${basePath}.${key}` : key;
            const fieldValue = currentData?.[key];
            const fieldSchema = schema[key];

            return (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium text-gray-600 block">
                  {formatLabel(key)}
                </label>
                {Array.isArray(fieldSchema) ? (
                  renderSection(fieldSchema, fieldValue, key)
                ) : typeof fieldSchema === 'object' && fieldSchema !== null ? (
                  <div className="border border-dashed border-gray-300 p-3 space-y-2 bg-gray-50">
                    {renderSection(fieldSchema, fieldValue, fieldPath)}
                  </div>
                ) : (
                  renderExcelCell(fieldPath, fieldValue)
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // プリミティブ値
    return renderExcelCell(basePath, currentData);
  };

  const formatLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Excel埋め込みプレビュー
        </h4>
        <p className="text-xs text-blue-700">
          青いイタリック体: <code className="bg-blue-100 px-1 rounded">{'{{'}</code>変数名<code className="bg-blue-100 px-1 rounded">{'}}'}</code> は未入力のプレースホルダー<br />
          黒文字: 入力済みのデータ<br />
          黄色のマーカー: 繰り返しセクション（<code className="bg-blue-100 px-1 rounded">{'{#repeat:...}'}</code>）
        </p>
      </div>

      <div className="border-2 border-gray-400 shadow-lg bg-gray-100 p-6">
        {renderSection(variables, data)}
      </div>
    </div>
  );
}
