'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';

interface FieldRendererProps {
  fieldPath: string;
  fieldSchema: any;
  value: any;
  onChange: (path: string, value: any) => void;
  level?: number;
  onEnhance?: (fieldPath: string) => void;
  enhancingField?: string | null;
  allData?: any; // _improvedフィールドの存在確認用
}

/**
 * テンプレート変数定義に基づいて動的にフォームフィールドを生成するコンポーネント
 *
 * サポートする型:
 * - プリミティブ値（string/number）→ Input/Textarea
 * - オブジェクト → ネストされたセクション
 * - 配列 → ArrayFieldRenderer（別コンポーネント）で処理
 */
export function FieldRenderer({
  fieldPath,
  fieldSchema,
  value,
  onChange,
  level = 0,
  onEnhance,
  enhancingField,
  allData,
}: FieldRendererProps) {

  // フィールド名をラベル用にフォーマット
  const formatLabel = (key: string): string => {
    // キャメルケースやスネークケースを読みやすく変換
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // プリミティブ値（string, number, boolean, null, undefined, 空文字列）
  if (
    fieldSchema === null ||
    fieldSchema === undefined ||
    fieldSchema === '' ||
    typeof fieldSchema === 'string' ||
    typeof fieldSchema === 'number' ||
    typeof fieldSchema === 'boolean'
  ) {
    // _improvedフィールドの存在確認
    const improvedFieldPath = `${fieldPath}_improved`;
    const improvedValue = allData?.[improvedFieldPath];
    const hasImprovedVersion = improvedValue !== undefined && improvedValue !== null && improvedValue !== '';

    // 表示する値: improvedが存在する場合はそれを優先
    const displayValue = hasImprovedVersion ? improvedValue : value;
    const originalValue = value;

    // 元の文章を表示するための状態管理
    const [showOriginal, setShowOriginal] = useState(false);

    // 複数行テキストエリアが必要かどうかを判定
    // 実際の値が長い場合（100文字以上）
    const hasLongValue = typeof displayValue === 'string' && displayValue.length > 100;

    // スキーマ値が長い場合（後方互換性のため残す）
    const hasLongSchema = typeof fieldSchema === 'string' && fieldSchema.length > 50;

    // 改行を含む場合
    const hasNewline = typeof displayValue === 'string' && displayValue.includes('\n');

    // いずれかの条件を満たす場合は複数行テキストエリアを使用
    const isLongText = hasLongValue || hasLongSchema || hasNewline;

    const isEnhancing = enhancingField === fieldPath;
    const hasValue = displayValue && typeof displayValue === 'string' && displayValue.trim().length > 0;
    const canEnhance = onEnhance && hasValue;

    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {isLongText ? (
              <Textarea
                value={displayValue || ''}
                onChange={(e) => onChange(fieldPath, e.target.value)}
                placeholder="入力してください"
                rows={4}
                className="max-h-[500px] overflow-y-auto resize-y"
              />
            ) : (
              <Input
                value={displayValue || ''}
                onChange={(e) => onChange(fieldPath, e.target.value)}
                placeholder="入力してください"
              />
            )}
          </div>
          {canEnhance && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEnhance(fieldPath)}
              disabled={isEnhancing || !hasValue}
              className="shrink-0 mt-1"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  処理中
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  改善
                </>
              )}
            </Button>
          )}
        </div>

        {/* 改善版が存在する場合、元の文章を表示 */}
        {hasImprovedVersion && originalValue && (
          <div className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs text-muted-foreground h-6 px-2"
            >
              <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showOriginal ? 'rotate-180' : ''}`} />
              {showOriginal ? '元の文章を隠す' : '元の文章を表示'}
            </Button>
            {showOriginal && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md border border-muted">
                <p className="text-xs text-muted-foreground mb-1">元の文章:</p>
                <p className="text-sm whitespace-pre-wrap">{originalValue}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 配列 → ArrayFieldRendererで処理（親コンポーネントで処理）
  if (Array.isArray(fieldSchema)) {
    // このケースは通常親コンポーネントで処理されるため、ここには来ない
    return null;
  }

  // オブジェクト → ネストされたフィールド
  if (typeof fieldSchema === 'object') {
    const keys = Object.keys(fieldSchema);

    // ネストレベルに応じて表示スタイルを変更
    const isTopLevel = level === 0;

    return (
      <div className="space-y-4">
        {keys.map((key) => {
          const nestedPath = fieldPath ? `${fieldPath}.${key}` : key;
          const nestedSchema = fieldSchema[key];
          const nestedValue = value?.[key];

          // 配列の場合は別のレンダラーを使用する必要がある
          // ここでは警告を出して null を返す
          if (Array.isArray(nestedSchema)) {
            return (
              <div key={key} className="space-y-2">
                <Label className="text-sm font-medium">
                  {formatLabel(key)}
                </Label>
                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      配列フィールドは ArrayFieldRenderer で処理してください
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          }

          return (
            <div key={key} className="space-y-2">
              <Label className="text-sm font-medium">
                {formatLabel(key)}
              </Label>
              <FieldRenderer
                fieldPath={nestedPath}
                fieldSchema={nestedSchema}
                value={nestedValue}
                onChange={onChange}
                level={level + 1}
                onEnhance={onEnhance}
                enhancingField={enhancingField}
                allData={allData}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // 未知の型の場合
  return (
    <div className="space-y-2">
      <Input
        value={value || ''}
        onChange={(e) => onChange(fieldPath, e.target.value)}
        placeholder="入力してください"
      />
    </div>
  );
}
