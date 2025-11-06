'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Sparkles, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';

interface StructureEditorProps {
  documentId: string;
  templateId: string;
  initialData?: any;
  onSave?: () => void;
}

export function StructureEditor({ documentId, templateId, initialData, onSave }: StructureEditorProps) {
  const [data, setData] = useState<any>(initialData || {});
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

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

  const handleEnhance = async (fieldPath: string) => {
    setEnhancing(true);
    try {
      const response = await apiClient.enhanceField(documentId, fieldPath);
      toast.info('ブラッシュアップを開始しました');

      // Poll for completion
      const job = await apiClient.waitForJob(response.job_id);

      if (job.status === 'succeeded' || job.status === 'completed') {
        // Reload structure
        const updatedStructure = await apiClient.getStructuredData(documentId, templateId);
        setData(updatedStructure.structured_data);
        toast.success('ブラッシュアップが完了しました');
      } else if (job.status === 'failed') {
        // Show user-friendly error message
        const errorMsg = getUserFriendlyErrorMessage(job.error);
        toast.error(errorMsg, {
          duration: 6000,
        });
      } else {
        toast.error('ブラッシュアップに失敗しました');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'ブラッシュアップに失敗しました');
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await apiClient.generateSummary(documentId);
      toast.info('紹介文の生成を開始しました');

      // Poll for completion
      const job = await apiClient.waitForJob(response.job_id);

      if (job.status === 'succeeded' || job.status === 'completed') {
        // Reload structure to get the generated_introduction field
        const updatedStructure = await apiClient.getStructuredData(documentId, templateId);
        setData(updatedStructure.structured_data);
        toast.success('紹介文の生成が完了しました');
      } else if (job.status === 'failed') {
        // Show user-friendly error message
        const errorMsg = getUserFriendlyErrorMessage(job.error);
        toast.error(errorMsg, {
          duration: 6000,
        });
      } else {
        toast.error('紹介文の生成に失敗しました');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '紹介文の生成に失敗しました');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    const newData = { ...data };
    let current: any = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) current[key] = {};
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    setData(newData);
  };

  const getField = (path: string) => {
    const keys = path.split('.');
    let current = data;

    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return '';
      }
    }

    return current || '';
  };

  // Loading state while waiting for data
  const hasData = data && Object.keys(data).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>構造化データ編集</span>
          <Button onClick={handleSave} disabled={saving || !hasData} size="sm">
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
        </CardTitle>
        <CardDescription>
          抽出されたデータを確認・編集できます
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>構造抽出が完了していないか、データがありません</p>
          </div>
        ) : (
          <>
        {/* Basic Info */}
        {data.basic_info && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">基本情報</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">氏名</Label>
                <Input
                  id="name"
                  value={getField('basic_info.name')}
                  onChange={(e) => updateField('basic_info.name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="furigana">フリガナ</Label>
                <Input
                  id="furigana"
                  value={getField('basic_info.furigana')}
                  onChange={(e) => updateField('basic_info.furigana', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">年齢</Label>
                <Input
                  id="age"
                  value={getField('basic_info.age')}
                  onChange={(e) => updateField('basic_info.age', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Work Experience */}
        {data.work_experience && Array.isArray(data.work_experience) && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">職務経歴</h3>
            {data.work_experience.map((exp: any, index: number) => (
              <Card key={index}>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>会社名</Label>
                      <Input
                        value={exp.company || ''}
                        onChange={(e) => {
                          const newExp = [...data.work_experience];
                          newExp[index] = { ...newExp[index], company: e.target.value };
                          setData({ ...data, work_experience: newExp });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>期間</Label>
                      <Input
                        value={`${exp.period?.start || ''} - ${exp.period?.end || ''}`}
                        disabled
                      />
                    </div>
                  </div>
                  {exp.project?.overview && (
                    <div className="space-y-2">
                      <Label>プロジェクト概要</Label>
                      <Textarea
                        value={exp.project.overview}
                        onChange={(e) => {
                          const newExp = [...data.work_experience];
                          newExp[index] = {
                            ...newExp[index],
                            project: { ...newExp[index].project, overview: e.target.value },
                          };
                          setData({ ...data, work_experience: newExp });
                        }}
                        rows={3}
                        className="max-h-[300px] overflow-y-auto resize-y"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Skills */}
        {data.skills && Array.isArray(data.skills) && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">スキル</h3>
            {data.skills.map((skill: any, index: number) => (
              <div key={index} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>カテゴリ</Label>
                  <Input
                    value={skill.category || ''}
                    onChange={(e) => {
                      const newSkills = [...data.skills];
                      newSkills[index] = { ...newSkills[index], category: e.target.value };
                      setData({ ...data, skills: newSkills });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>スキル</Label>
                  <Input
                    value={skill.items || ''}
                    onChange={(e) => {
                      const newSkills = [...data.skills];
                      newSkills[index] = { ...newSkills[index], items: e.target.value };
                      setData({ ...data, skills: newSkills });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Self PR */}
        {data.self_pr && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">自己PR</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEnhance('self_pr')}
                disabled={enhancing}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                ブラッシュアップ
              </Button>
            </div>
            <Textarea
              value={getField('self_pr')}
              onChange={(e) => updateField('self_pr', e.target.value)}
              rows={6}
              className="max-h-[400px] overflow-y-auto resize-y"
            />
            {data.self_pr_improved && (
              <div>
                <Label>改善版</Label>
                <Textarea
                  value={getField('self_pr_improved')}
                  onChange={(e) => updateField('self_pr_improved', e.target.value)}
                  rows={6}
                  className="mt-2 border-green-300 max-h-[400px] overflow-y-auto resize-y"
                />
              </div>
            )}
          </div>
        )}

        {/* Generated Introduction */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">営業用紹介文</h3>
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
                  <FileText className="mr-2 h-4 w-4" />
                  紹介文を生成
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            構造化データ全体から営業用の紹介文を自動生成します
          </div>
          {data.generated_introduction ? (
            <Textarea
              value={getField('generated_introduction')}
              onChange={(e) => updateField('generated_introduction', e.target.value)}
              rows={8}
              className="max-h-[500px] overflow-y-auto resize-y"
              placeholder="「紹介文を生成」ボタンをクリックして紹介文を作成してください"
            />
          ) : (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              まだ紹介文が生成されていません。<br />
              「紹介文を生成」ボタンをクリックして作成してください。
            </div>
          )}
        </div>
        </>
        )}
      </CardContent>
    </Card>
  );
}
