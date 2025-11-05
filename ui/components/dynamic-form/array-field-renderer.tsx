'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldRenderer } from './field-renderer';
import { Plus, Trash2 } from 'lucide-react';

interface ArrayFieldRendererProps {
  fieldPath: string;
  fieldLabel: string;
  itemSchema: any;
  value: any[];
  onChange: (path: string, value: any) => void;
}

/**
 * 配列型フィールドのレンダラー
 *
 * 特徴:
 * - 動的に項目を追加/削除可能
 * - 各項目をカード形式で表示
 * - ネストされたオブジェクトや配列にも対応
 */
export function ArrayFieldRenderer({
  fieldPath,
  fieldLabel,
  itemSchema,
  value = [],
  onChange,
}: ArrayFieldRendererProps) {

  const handleAdd = () => {
    // スキーマに基づいて初期値を生成
    const newItem = generateInitialValue(itemSchema);
    onChange(fieldPath, [...value, newItem]);
  };

  const handleRemove = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(fieldPath, newValue);
  };

  const handleItemChange = (index: number, itemValue: any) => {
    const newValue = [...value];
    newValue[index] = itemValue;
    onChange(fieldPath, newValue);
  };

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
      Object.keys(schema).forEach(key => {
        initial[key] = generateInitialValue(schema[key]);
      });
      return initial;
    }
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          {fieldLabel}
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          項目を追加
        </Button>
      </div>

      {value.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">
              項目がありません。「項目を追加」ボタンをクリックして追加してください。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {value.map((item, index) => (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{fieldLabel} #{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    className="h-8 gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    削除
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(itemSchema) ? (
                  // 配列の配列の場合
                  <ArrayFieldRenderer
                    fieldPath={`${fieldPath}.${index}`}
                    fieldLabel="項目"
                    itemSchema={itemSchema[0]}
                    value={item || []}
                    onChange={onChange}
                  />
                ) : typeof itemSchema === 'object' && itemSchema !== null ? (
                  // オブジェクトの場合
                  <div className="space-y-4">
                    {Object.keys(itemSchema).map((key) => {
                      const nestedSchema = itemSchema[key];
                      const nestedValue = item?.[key];
                      const nestedPath = `${fieldPath}.${index}.${key}`;

                      // フィールド名をラベル用にフォーマット
                      const formatLabel = (k: string): string => {
                        return k
                          .replace(/_/g, ' ')
                          .replace(/([A-Z])/g, ' $1')
                          .trim()
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                      };

                      return (
                        <div key={key} className="space-y-2">
                          <label className="text-sm font-medium">
                            {formatLabel(key)}
                          </label>
                          {Array.isArray(nestedSchema) ? (
                            // ネストされた配列
                            <ArrayFieldRenderer
                              fieldPath={nestedPath}
                              fieldLabel={formatLabel(key)}
                              itemSchema={nestedSchema[0]}
                              value={nestedValue || []}
                              onChange={onChange}
                            />
                          ) : (
                            // 通常のフィールド
                            <FieldRenderer
                              fieldPath={nestedPath}
                              fieldSchema={nestedSchema}
                              value={nestedValue}
                              onChange={onChange}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // プリミティブ値の場合
                  <FieldRenderer
                    fieldPath={`${fieldPath}.${index}`}
                    fieldSchema={itemSchema}
                    value={item}
                    onChange={onChange}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
