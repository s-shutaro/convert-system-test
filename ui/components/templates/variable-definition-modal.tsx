'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TreeFieldEditor } from './tree-field-editor';
import { JsonPreview } from './json-preview';
import { toast } from 'sonner';

interface VariableDefinitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  onConfirm: (data: any) => void;
}

export function VariableDefinitionModal({
  open,
  onOpenChange,
  initialData = {},
  onConfirm,
}: VariableDefinitionModalProps) {
  const [templateData, setTemplateData] = useState<any>(initialData);

  // バリデーション
  const validateData = (data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // 空チェック
    if (Object.keys(data).length === 0) {
      errors.push('少なくとも1つのフィールドを追加してください');
      return { valid: false, errors };
    }

    // フィールド名の検証（再帰的）
    const validateFields = (obj: any, path: string[] = []): void => {
      for (const key in obj) {
        const fullPath = [...path, key].join('.');

        // フィールド名の形式チェック
        if (!/^[a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/.test(key)) {
          errors.push(`無効なフィールド名: "${fullPath}" (英数字、日本語、アンダースコアのみ使用可能)`);
        }

        // 再帰的にチェック
        const value = obj[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          validateFields(value, [...path, key]);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              validateFields(item, [...path, key, `[${index}]`]);
            }
          });
        }
      }
    };

    validateFields(data);

    // JSON変換可能性チェック
    try {
      JSON.stringify(data);
    } catch (e) {
      errors.push('JSON変換に失敗しました');
    }

    return { valid: errors.length === 0, errors };
  };

  // 確定ボタン
  const handleConfirm = () => {
    const { valid, errors } = validateData(templateData);

    if (!valid) {
      errors.forEach((error) => toast.error(error));
      return;
    }

    onConfirm(templateData);
    onOpenChange(false);
    toast.success('変数定義を確定しました');
  };

  // キャンセル時にリセット
  const handleCancel = () => {
    setTemplateData(initialData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>テンプレート変数定義</DialogTitle>
          <p className="text-sm text-muted-foreground">
            抽出するデータの構造を定義してください。左側でフィールドを追加・編集し、右側でJSONプレビューを確認できます。
          </p>
        </DialogHeader>

        <div className="flex gap-4 px-6 pb-6 overflow-hidden" style={{ height: 'calc(90vh - 180px)' }}>
          {/* 左側: ツリーエディタ */}
          <div className="flex-1 min-w-0">
            <TreeFieldEditor data={templateData} onChange={setTemplateData} />
          </div>

          {/* 右側: JSONプレビュー */}
          <div className="w-2/5 min-w-0">
            <JsonPreview data={templateData} />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button type="button" onClick={handleConfirm}>
            確定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
