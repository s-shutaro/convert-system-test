'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface JsonPreviewProps {
  data: any;
}

export function JsonPreview({ data }: JsonPreviewProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast.success('JSONをコピーしました');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('コピーに失敗しました');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">JSONプレビュー</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              コピー済み
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              コピー
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-auto border rounded-lg bg-slate-50 p-4">
        <pre className="text-xs font-mono text-slate-800">
          <code>{jsonString}</code>
        </pre>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {Object.keys(data).length} フィールド
      </div>
    </div>
  );
}
