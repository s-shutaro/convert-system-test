# バックエンド・フロントエンド仕様調整完了報告

## 概要
変換済みファイル一覧の表示について、バックエンドとフロントエンドの仕様を統一しました。

バックエンドは既に配列オブジェクト形式で詳細なメタデータを返す実装になっており、フロントエンドをこの形式に対応させました。

## ✅ 対応完了: converted_files の形式統一

### バックエンドの実装（意図的な設計）
```json
{
  "document_id": "doc-123",
  "tenant": "tenant-001",
  "filename": "skillsheet.pdf",
  "file_key": "documents/...",
  "converted_files": [
    {
      "template_id": "template-456",
      "template_name": "標準テンプレート",
      "file_key": "documents/public/21578be1-b5a8-4f4a-bead-c96132209c0f/converted_c337042a.xlsx",
      "converted_at": 1234567890
    },
    {
      "template_id": "template-789",
      "template_name": "詳細テンプレート",
      "file_key": "documents/public/21578be1-b5a8-4f4a-bead-c96132209c0f/converted_a6760477.xlsx",
      "converted_at": 1234567891
    }
  ],
  "created_at": 1234567890,
  "updated_at": 1234567890
}
```

### フロントエンドの対応（2025-11-05完了）

#### 1. 型定義の追加
**ファイル:** `ui/types/index.ts`

```typescript
export interface ConvertedFile {
  template_id: string;
  template_name: string;
  file_key: string;
  converted_at: number;
}

export interface Document {
  // ...
  converted_files?: ConvertedFile[];
  // ...
}
```

#### 2. コンポーネントの修正
**ファイル:** `ui/components/documents/convert-form.tsx`

- 配列オブジェクト形式に対応
- `template_name` を直接表示（確実に表示可能）
- S3パスからファイル名を抽出して表示
- 不要なパターンマッチングロジックを削除

### メリット
1. **テンプレート名が確実に表示される** - `template_name` フィールドを直接使用
2. **信頼性の向上** - ファイル名パターンマッチングが不要
3. **将来の拡張性** - `converted_at` でソートや日時表示が可能
4. **シンプルなコード** - 条件分岐が不要で保守しやすい

---

## 残りの推奨修正事項

以下のAPI仕様の不一致については、引き続き対応が必要です。

## API仕様書の更新が必要

**ファイル:** `docs/API_SPECIFICATION.md`

### 修正箇所1: converted_files の形式（317-319行目）

**現在の仕様書（誤り）:**
```json
"converted_files": {
  "template-456": "documents/tenant-001/doc-xxx/converted_template-456.xlsx"
}
```

**実際の実装（正しい）:**
```json
"converted_files": [
  {
    "template_id": "template-456",
    "template_name": "標準テンプレート",
    "file_key": "documents/tenant-001/doc-xxx/converted_template-456.xlsx",
    "converted_at": 1234567890
  }
]
```

**対応:** API仕様書を実装に合わせて更新する必要があります。

## 2. AI処理APIのエンドポイント不一致

### 概要
ブラッシュアップAPI（文章改善）と紹介文生成APIのエンドポイントパスとレスポンス形式が、仕様書とバックエンド実装で異なります。

### 問題点

#### 2.1 エンドポイントパスの不一致

| API | 仕様書 | バックエンド実装 | 状況 |
|-----|--------|----------------|------|
| ブラッシュアップ | `POST /documents/{document_id}/enhance` | `POST /sheets/{sheet_id}/brushup` | ⚠️ 不一致 |
| 紹介文生成 | `POST /documents/{document_id}/summary` | `POST /sheets/{sheet_id}/intro` | ⚠️ 不一致 |

**影響:**
- フロントエンドは `/documents` パスを呼び出すが、バックエンドは `/sheets` で実装されている
- 404エラーが発生する可能性がある

#### 2.2 レスポンス形式の不一致

**ブラッシュアップAPI:**

仕様書（非同期）:
```json
{
  "job_id": "job-123e4567-e89b-12d3-a456-426614174000",
  "status": "queued"
}
```

バックエンド実装（同期）:
```json
{
  "candidates": [
    "改善された文章1",
    "改善された文章2",
    "改善された文章3"
  ]
}
```

**紹介文生成API:**

仕様書（非同期）:
```json
{
  "job_id": "job-123e4567-e89b-12d3-a456-426614174000",
  "status": "queued"
}
```

バックエンド実装（同期）:
```json
{
  "text": "生成された紹介文..."
}
```

**影響:**
- フロントエンドはジョブポーリングを試みるが、バックエンドは即座に結果を返す
- OpenAI APIの処理時間が長い場合、タイムアウトが発生する可能性がある
- スケーラビリティに問題がある

#### 2.3 リクエストボディの不一致

**ブラッシュアップAPI:**

仕様書:
```json
{
  "field_path": "self_pr",
  "instructions": "より具体的に、成果を強調して"
}
```

バックエンド実装:
```json
{
  "text": "改善したい文章"
}
```

**影響:**
- バックエンドは `field_path` と `instructions` パラメータをサポートしていない
- 構造化データの特定フィールドを指定してブラッシュアップできない
- ユーザーの指示に基づいたカスタマイズができない

### 推奨される修正内容

#### 修正案1: バックエンドを仕様書に合わせる（推奨）

**ファイル:** `src/services/api/app/routers/sheets.py` または該当するルーターファイル

```python
# 現在のエンドポイント
@router.post("/{sheet_id}/brushup")
async def brush_up(
    sheet_id: str,
    payload: BrushUpRequest,
    request: Request,
    ctx: TenantContext = Depends(get_tenant_context),
) -> dict:
    _ensure_sheet_exists(request, ctx, sheet_id)
    ai: AIService = request.app.state.ai
    candidates = ai.brush_up(payload.text)
    return {"candidates": candidates}

@router.post("/{sheet_id}/intro")
async def intro(
    sheet_id: str,
    request: Request,
    ctx: TenantContext = Depends(get_tenant_context),
) -> IntroResponse:
    # ... 同期処理 ...
    return IntroResponse(text=text)

# 修正後: /documents パスで非同期ジョブベースに変更
@router.post("/{document_id}/enhance")
async def enhance_field(
    document_id: str,
    payload: EnhanceRequest,  # field_path と instructions を含む
    request: Request,
    ctx: TenantContext = Depends(get_tenant_context),
) -> ExtractResponse:
    """特定フィールドをブラッシュアップ（非同期処理）"""
    repository: Repository = request.app.state.repository

    # ドキュメントの存在確認
    document = repository.get_document(ctx.tenant_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # ジョブIDを生成
    job_id = repository.new_identifier("job")

    # ジョブをキューに追加
    job = Job(
        job_id=job_id,
        tenant_id=ctx.tenant_id,
        document_id=document_id,
        type=JobType.ENHANCE,
        status="queued",
        metadata={
            "field_path": payload.field_path,
            "instructions": payload.instructions
        }
    )
    await enqueue_job(job)

    return ExtractResponse(job_id=job_id, status="queued")

@router.post("/{document_id}/summary")
async def generate_summary(
    document_id: str,
    request: Request,
    ctx: TenantContext = Depends(get_tenant_context),
) -> ExtractResponse:
    """営業用紹介文を生成（非同期処理）"""
    repository: Repository = request.app.state.repository

    # ドキュメントの存在確認
    document = repository.get_document(ctx.tenant_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # ジョブIDを生成
    job_id = repository.new_identifier("job")

    # ジョブをキューに追加
    job = Job(
        job_id=job_id,
        tenant_id=ctx.tenant_id,
        document_id=document_id,
        type=JobType.SUMMARY,
        status="queued"
    )
    await enqueue_job(job)

    return ExtractResponse(job_id=job_id, status="queued")
```

**リクエストモデルの追加:**

```python
class EnhanceRequest(BaseModel):
    field_path: str
    instructions: Optional[str] = None

class ExtractResponse(BaseModel):
    job_id: str
    status: str
```

**ワーカー側の処理:**

```python
async def process_enhance_job(job: Job):
    """ブラッシュアップジョブの処理"""
    # メタデータから情報取得
    field_path = job.metadata["field_path"]
    instructions = job.metadata.get("instructions")

    # 構造化データを取得
    structured_data = repository.get_structured_data(job.tenant_id, job.document_id, job.template_id)

    # field_pathで指定されたフィールドを取得
    field_value = get_nested_field(structured_data, field_path)

    # AI処理
    ai: AIService = get_ai_service()
    improved_value = await ai.brush_up_field(
        field_value=field_value,
        context=structured_data,
        instructions=instructions
    )

    # 結果を保存（_improvedサフィックス付き）
    improved_field_path = f"{field_path}_improved"
    set_nested_field(structured_data, improved_field_path, improved_value)
    repository.save_structured_data(job.tenant_id, job.document_id, job.template_id, structured_data)

    # ジョブを成功として更新
    job.status = "succeeded"
    job.output = {"improved_field": improved_field_path, "value": improved_value}
    repository.update_job(job)

async def process_summary_job(job: Job):
    """紹介文生成ジョブの処理"""
    # 構造化データを取得
    structured_data = repository.get_structured_data(job.tenant_id, job.document_id, job.template_id)

    # AI処理
    ai: AIService = get_ai_service()
    introduction = await ai.generate_introduction(structured_data)

    # 結果を保存（generated_introductionフィールド）
    structured_data["generated_introduction"] = introduction
    repository.save_structured_data(job.tenant_id, job.document_id, job.template_id, structured_data)

    # ジョブを成功として更新
    job.status = "succeeded"
    job.output = {"generated_introduction": introduction}
    repository.update_job(job)
```

#### メリット

1. **仕様書に準拠**: フロントエンドが期待する動作になる
2. **スケーラビリティ**: 長時間のAI処理でもタイムアウトしない
3. **一貫性**: 他のAPIエンドポイント（extract, convertなど）と同じ非同期パターン
4. **柔軟性**: `field_path` と `instructions` により、ユーザーの意図に応じたブラッシュアップが可能

### フロントエンドの対応状況

✅ **既に仕様書通りに実装済み**

**ファイル:** `ui/lib/api-client.ts` (行202-217)
```typescript
async enhanceField(
  documentId: string,
  fieldPath: string,
  instructions?: string
): Promise<ExtractResponse> {
  const { data } = await this.client.post<ExtractResponse>(
    `/documents/${documentId}/enhance`,
    { field_path: fieldPath, instructions }
  );
  return data;
}

async generateSummary(documentId: string): Promise<ExtractResponse> {
  const { data } = await this.client.post<ExtractResponse>(`/documents/${documentId}/summary`);
  return data;
}
```

**ファイル:** `ui/components/documents/structure-editor.tsx` (行44-66)
- ブラッシュアップ機能は実装済み・UI使用中
- 紹介文生成機能は未使用（今回追加予定）

## 実装優先度

### ✅ 優先度1: 完了（converted_files形式統一）

**対応日:** 2025-11-05
**対応内容:**
- フロントエンドを配列オブジェクト形式に対応
- 型定義の追加（`ConvertedFile` インターフェース）
- コンポーネントの修正（`convert-form.tsx`）

**残タスク:**
- API仕様書の更新（実装に合わせて記述を修正）

### 優先度2: 高（AI処理APIエンドポイント修正）

理由:
- フロントエンドの機能が正しく動作しない可能性
- 仕様書との重大な不一致
- スケーラビリティとユーザー体験の向上
- 紹介文生成機能を追加する際にも必要

---

**作成日:** 2025-11-05
**最終更新:** 2025-11-05
**フロントエンド対応:** ✅ 完了
**バックエンド対応:** ✅ 既に実装済み（配列オブジェクト形式）
**API仕様書更新:** ⚠️ 未実施（要更新）
