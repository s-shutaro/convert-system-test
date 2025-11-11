'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { FileText, Package, List, Plus, Trash2, Edit2, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface TreeFieldEditorProps {
  data: any;
  onChange: (data: any) => void;
}

type FieldType = 'string' | 'object' | 'array';
type ValueType = 'string' | 'date' | 'datetime' | 'number' | 'boolean';

interface AddFieldDialogState {
  isOpen: boolean;
  parentPath: string[];
  fieldName: string;
  fieldType: FieldType;
  valueType: ValueType;
}

export function TreeFieldEditor({ data, onChange }: TreeFieldEditorProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [addDialog, setAddDialog] = useState<AddFieldDialogState>({
    isOpen: false,
    parentPath: [],
    fieldName: '',
    fieldType: 'string',
    valueType: 'string',
  });
  const [editingField, setEditingField] = useState<{ path: string[]; oldName: string } | null>(null);
  const [newFieldName, setNewFieldName] = useState('');

  // パス文字列化
  const pathToString = (path: string[]): string => path.join('.');

  // パスの展開/折りたたみ
  const toggleExpand = (path: string[]) => {
    const pathStr = pathToString(path);
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(pathStr)) {
      newExpanded.delete(pathStr);
    } else {
      newExpanded.add(pathStr);
    }
    setExpandedPaths(newExpanded);
  };

  // フィールドタイプを判定
  const getFieldType = (value: any): FieldType => {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) {
      // 型定義オブジェクト { type: "string" } の場合は string として扱う
      if ('type' in value && typeof value.type === 'string') return 'string';
      return 'object';
    }
    return 'string';
  };

  // 値の型を取得（新形式の場合）
  const getValueType = (value: any): ValueType | null => {
    if (typeof value === 'object' && value !== null && 'type' in value) {
      return value.type as ValueType;
    }
    return null;
  };

  // アイコンを取得
  const getIcon = (type: FieldType) => {
    switch (type) {
      case 'string':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'object':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'array':
        return <List className="h-4 w-4 text-green-500" />;
    }
  };

  // 値を取得
  const getValueAtPath = (obj: any, path: string[]): any => {
    let current = obj;
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  };

  // 値を設定
  const setValueAtPath = (obj: any, path: string[], value: any): any => {
    if (path.length === 0) return value;

    const newObj = JSON.parse(JSON.stringify(obj));
    let current = newObj;

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    return newObj;
  };

  // フィールド削除
  const deleteValueAtPath = (obj: any, path: string[]): any => {
    if (path.length === 0) return {};

    const newObj = JSON.parse(JSON.stringify(obj));
    let current = newObj;

    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    delete current[path[path.length - 1]];
    return newObj;
  };

  // フィールド追加
  const handleAddField = () => {
    const { parentPath, fieldName, fieldType, valueType } = addDialog;

    if (!fieldName.trim()) {
      toast.error('フィールド名を入力してください');
      return;
    }

    // 親を取得
    const parent = parentPath.length === 0 ? data : getValueAtPath(data, parentPath);

    // 配列の場合は、配列の最初の要素（テンプレート）に追加
    let targetParent = parent;
    let targetPath = parentPath;

    if (Array.isArray(parent) && parent.length > 0) {
      // 配列の場合、0番目の要素（テンプレート）に追加
      targetParent = parent[0];
      targetPath = [...parentPath, '0'];
    }

    // 重複チェック
    if (targetParent && targetParent[fieldName] !== undefined) {
      toast.error('同じ名前のフィールドが既に存在します');
      return;
    }

    let initialValue: any;
    switch (fieldType) {
      case 'string':
        // 型情報をオブジェクトとして保存
        initialValue = { type: valueType };
        break;
      case 'object':
        initialValue = {};
        break;
      case 'array':
        initialValue = [{}];
        break;
    }

    const newPath = [...targetPath, fieldName];
    const newData = setValueAtPath(data, newPath, initialValue);
    onChange(newData);

    // パスを展開
    setExpandedPaths(prev => new Set([...prev, pathToString(parentPath)]));

    // ダイアログをリセット
    setAddDialog({
      isOpen: false,
      parentPath: [],
      fieldName: '',
      fieldType: 'string',
      valueType: 'string',
    });

    toast.success(`フィールド「${fieldName}」を追加しました`);
  };

  // フィールド削除
  const handleDelete = (path: string[]) => {
    const newData = deleteValueAtPath(data, path);
    onChange(newData);
    toast.success('フィールドを削除しました');
  };

  // フィールド名変更
  const handleRename = (path: string[], newName: string) => {
    if (!newName.trim()) {
      toast.error('フィールド名を入力してください');
      return;
    }

    const parentPath = path.slice(0, -1);
    const parent = parentPath.length === 0 ? data : getValueAtPath(data, parentPath);

    if (parent[newName] !== undefined) {
      toast.error('同じ名前のフィールドが既に存在します');
      return;
    }

    const value = getValueAtPath(data, path);
    let newData = deleteValueAtPath(data, path);
    const newPath = [...parentPath, newName];
    newData = setValueAtPath(newData, newPath, value);

    onChange(newData);
    setEditingField(null);
    toast.success('フィールド名を変更しました');
  };

  // ツリーノードをレンダリング
  const renderTreeNode = (key: string, value: any, path: string[], level: number = 0) => {
    const fieldType = getFieldType(value);
    const fullPath = [...path, key];
    const pathStr = pathToString(fullPath);
    const isExpanded = expandedPaths.has(pathStr);
    const isEditing = editingField?.path.join('.') === pathStr;

    const hasChildren =
      (fieldType === 'object' && Object.keys(value).length > 0) ||
      (fieldType === 'array' && value.length > 0);

    return (
      <div key={pathStr}>
        <div
          className="flex items-center gap-2 py-1 px-2 hover:bg-slate-100 rounded group"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {/* 展開ボタン */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpand(fullPath)}
              className="flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* アイコン */}
          <div className="flex-shrink-0">{getIcon(fieldType)}</div>

          {/* フィールド名 */}
          {isEditing ? (
            <Input
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onBlur={() => {
                if (newFieldName.trim() !== editingField.oldName) {
                  handleRename(fullPath, newFieldName);
                } else {
                  setEditingField(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename(fullPath, newFieldName);
                } else if (e.key === 'Escape') {
                  setEditingField(null);
                }
              }}
              className="h-6 text-sm flex-1"
              autoFocus
            />
          ) : (
            <span className="text-sm font-medium flex-1">{key}</span>
          )}

          {/* タイプ表示 */}
          <span className="text-xs text-muted-foreground">
            {fieldType === 'array' && `[${value.length}]`}
            {fieldType === 'object' && `{${Object.keys(value).length}}`}
            {fieldType === 'string' && getValueType(value) && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                {getValueType(value)}
              </span>
            )}
          </span>

          {/* 操作ボタン */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {(fieldType === 'object' || fieldType === 'array') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setAddDialog({
                    isOpen: true,
                    parentPath: fullPath,
                    fieldName: '',
                    fieldType: 'string',
                    valueType: 'string',
                  })
                }
                className="h-6 w-6 p-0"
                title="子フィールド追加"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingField({ path: fullPath, oldName: key });
                setNewFieldName(key);
              }}
              className="h-6 w-6 p-0"
              title="名前変更"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(fullPath)}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              title="削除"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* 子要素 */}
        {isExpanded && hasChildren && (
          <div>
            {fieldType === 'object' &&
              Object.keys(value).map((childKey) =>
                renderTreeNode(childKey, value[childKey], fullPath, level + 1)
              )}
            {fieldType === 'array' && value.length > 0 && (
              <div className="border-l-2 border-slate-200 ml-4">
                <div
                  className="flex items-center gap-2 py-1 px-2 text-muted-foreground"
                  style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                >
                  <span className="text-xs">配列項目のテンプレート:</span>
                </div>
                {typeof value[0] === 'object' && value[0] !== null ? (
                  Object.keys(value[0]).map((childKey) =>
                    renderTreeNode(childKey, value[0][childKey], [...fullPath, '0'], level + 1)
                  )
                ) : (
                  <div
                    className="flex items-center gap-2 py-1 px-2"
                    style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                  >
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">テキスト値</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">フィールド構造</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setAddDialog({
              isOpen: true,
              parentPath: [],
              fieldName: '',
              fieldType: 'string',
              valueType: 'string',
            })
          }
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          フィールド追加
        </Button>
      </div>

      <div className="flex-1 overflow-auto border rounded-lg bg-white p-2">
        {Object.keys(data).length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            フィールドがありません。「フィールド追加」ボタンから追加してください。
          </div>
        ) : (
          <div className="space-y-1">
            {Object.keys(data).map((key) => renderTreeNode(key, data[key], [], 0))}
          </div>
        )}
      </div>

      {/* フィールド追加ダイアログ */}
      {addDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">フィールド追加</h3>

            <div className="space-y-2">
              <Label htmlFor="fieldName">フィールド名</Label>
              <Input
                id="fieldName"
                value={addDialog.fieldName}
                onChange={(e) =>
                  setAddDialog((prev) => ({ ...prev, fieldName: e.target.value }))
                }
                placeholder="例: 基本情報、経歴、スキル"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddField();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldType">フィールド型</Label>
              <Select
                id="fieldType"
                value={addDialog.fieldType}
                onChange={(e) =>
                  setAddDialog((prev) => ({
                    ...prev,
                    fieldType: e.target.value as FieldType,
                  }))
                }
              >
                <option value="string">📄 テキスト - 単一の値</option>
                <option value="object">📦 オブジェクト - ネストされたフィールド</option>
                <option value="array">📋 配列 - 複数の項目</option>
              </Select>
            </div>

            {/* 値の型選択（string型の場合のみ表示） */}
            {addDialog.fieldType === 'string' && (
              <div className="space-y-2">
                <Label htmlFor="valueType">値の型</Label>
                <Select
                  id="valueType"
                  value={addDialog.valueType}
                  onChange={(e) =>
                    setAddDialog((prev) => ({
                      ...prev,
                      valueType: e.target.value as ValueType,
                    }))
                  }
                >
                  <option value="string">文字列</option>
                  <option value="date">日付 (例: 2025年1月15日)</option>
                  <option value="datetime">日時 (例: 2025年1月15日10時23分)</option>
                  <option value="number">数値</option>
                  <option value="boolean">真偽値 (〇/空欄)</option>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setAddDialog({
                    isOpen: false,
                    parentPath: [],
                    fieldName: '',
                    fieldType: 'string',
                    valueType: 'string',
                  })
                }
              >
                キャンセル
              </Button>
              <Button type="button" onClick={handleAddField}>
                追加
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
