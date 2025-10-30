# API仕様書

## 概要

マルチテナント対応のドキュメント処理APIです。スキルシートPDFのアップロード、OCR/Vision解析、OpenAI処理、Excelテンプレート変換などの機能を提供します。

### 主な機能

- **ドキュメント管理**: PDFアップロード（OCR/Vision選択可）、構造化データ編集、ファイルダウンロード、削除
- **AI処理**: OpenAIによる構造化、フィールドブラッシュアップ、営業用紹介文自動生成
- **テンプレート変換**: Excelテンプレートへの変換（変数置換: `{{basic_info.name}}` 等）
- **ジョブ管理**: 非同期処理の状態確認とロングポーリング

### 処理方式

- **OCR方式**: Amazon Textract でテキスト抽出 → OpenAI で構造化
- **Vision方式**: PDF を OpenAI GPT-4/5 Vision で直接分析・構造化（署名付きURL使用）
- **BASE64方式**: PDF を BASE64 エンコード → OpenAI GPT-4/5 で直接分析・構造化

### テンプレート変数

Excelテンプレート内で以下の形式で変数を使用できます:
- `{{basic_info.name}}` - 氏名
- `{{work_experience.0.company}}` - 最初の職務経歴の会社名
- `{{skills.0.items}}` - 最初のスキルカテゴリの項目リスト

詳細は [TEMPLATE_GUIDE.md](TEMPLATE_GUIDE.md) を参照してください。

---

## 認証・認可

### 認証方式

このAPIは **Amazon Cognito** と **Lambda Authorizer** による認証を使用します。

#### 認証フロー

1. Cognito User Pool でユーザー認証
2. JWTトークンを取得
3. リクエストヘッダーに `Authorization: Bearer <JWT>` を付与
4. Lambda Authorizer が JWT を検証し、テナント情報を抽出
5. APIはテナント情報を使用してリソースにアクセス

### テナント分離

- 各ユーザーは `custom:tenant` 属性にテナントIDを保持
- すべてのAPIエンドポイントはテナント情報を必須とする
- テナントごとに専用のS3バケットとDynamoDBテーブルを使用
- 他のテナントのデータへのアクセスは自動的にブロックされる

### ローカル開発

ローカル開発時は `.env` に `LOCAL_TENANT` を設定することで認証をスキップできます。

```env
LOCAL_TENANT=local-dev
```

---

## ベースURL

### 本番環境
```
https://{api-id}.execute-api.{region}.amazonaws.com
```

### ローカル開発
```
http://localhost:8000
```

---

## エラーレスポンス

すべてのエラーは以下の形式で返されます:

```json
{
  "detail": "エラーメッセージ"
}
```

### 主なHTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 400 | 不正なリクエスト |
| 401 | 認証エラー |
| 403 | アクセス拒否 |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |

---

## API エンドポイント一覧

### Documents（ドキュメント管理）

| メソッド | パス | 概要 |
|----------|------|------|
| POST | `/documents/upload` | PDFファイルアップロード |
| POST | `/documents/{document_id}/extract` | 構造抽出開始 |
| GET | `/documents/{document_id}` | ドキュメント詳細取得 |
| GET | `/documents` | ドキュメント一覧取得 |
| DELETE | `/documents/{document_id}` | ドキュメント削除 |
| POST | `/documents/{document_id}/reanalyze` | AI構造化リトライ |
| GET | `/documents/{document_id}/structures/{template_id}` | 特定テンプレートの構造化データ取得 |
| GET | `/documents/{document_id}/structures` | 全テンプレートの構造化データ一覧取得 |
| PUT | `/documents/{document_id}/structures/{template_id}` | 特定テンプレートの構造化データ編集 |

### Templates（テンプレート管理）

| メソッド | パス | 概要 |
|----------|------|------|
| POST | `/templates` | テンプレート登録 |
| GET | `/templates/{template_id}` | テンプレート詳細取得 |
| GET | `/templates` | テンプレート一覧取得 |
| DELETE | `/templates/{template_id}` | テンプレート削除 |

### Conversion（変換処理）

| メソッド | パス | 概要 |
|----------|------|------|
| POST | `/documents/{document_id}/convert` | Excelテンプレート変換 |

### AI Processing（AI処理）

| メソッド | パス | 概要 |
|----------|------|------|
| POST | `/documents/{document_id}/enhance` | 文章ブラッシュアップ |
| POST | `/documents/{document_id}/summary` | 営業用紹介文作成 |

### Files（ファイル操作）

| メソッド | パス | 概要 |
|----------|------|------|
| GET | `/files/{file_id}/download` | ファイルダウンロード（署名付きURL） |

### Jobs（ジョブ管理）

| メソッド | パス | 概要 |
|----------|------|------|
| GET | `/jobs/{job_id}` | ジョブ状態取得 |
| GET | `/jobs/{job_id}/poll` | ジョブ状態ポーリング |

---

## Documents API

### 1. PDFファイルアップロード

PDFファイルをS3にアップロードします。

#### エンドポイント

```
POST /documents/upload
```

#### リクエスト

**Content-Type**: `multipart/form-data`

| パラメータ | 型 | 必須 | 説明 |
|------------|-------|------|------|
| file | File | ✓ | アップロードするPDFファイル |

#### 制限事項

- ファイル形式: PDF のみ
- 最大ファイルサイズ: 10MB
- 空ファイルは不可

#### レスポンス例

**成功 (200 OK)**

```json
{
  "document_id": "doc-123e4567-e89b-12d3-a456-426614174000",
  "filename": "skillsheet_sample.pdf"
}
```

#### cURLサンプル

```bash
curl -X POST "https://api.example.com/documents/upload" \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@skillsheet.pdf"
```

#### 処理フロー

1. ファイル検証（拡張子、サイズ、内容）
2. S3にアップロード（`documents/{tenant}/{document_id}/{filename}`）
3. DynamoDBにメタデータを保存
4. document_idを返却

**次のステップ**: `POST /documents/{document_id}/extract` で構造抽出を実行

---

### 2. 構造抽出開始

PDFから構造化データを抽出します。

#### エンドポイント

```
POST /documents/{document_id}/extract
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |

**Request Body**

```json
{
  "template_id": "template-123e4567-e89b-12d3-a456-426614174000",
  "analysis_type": "vision"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-------|------|------|
| template_id | string | ✓ | 使用するテンプレートのID（変数定義を取得するため） |
| analysis_type | string | ✓ | 処理方式: `ocr`, `vision`, `base64` |

#### 処理方式の詳細

| 方式 | 説明 | メリット | デメリット |
|------|------|----------|----------|
| **ocr** | Textract → OpenAI | 高速、テキスト抽出精度が高い | レイアウト情報が失われる |
| **vision** | 署名付きURL → GPT-4 Vision | レイアウトを保持、手書き文字も認識 | コスト高、処理時間長 |
| **base64** | BASE64 → GPT-4 Vision | visionと同様 | ファイルサイズに制限 |

#### レスポンス例

**成功 (200 OK)**

```json
{
  "job_id": "job-123e4567-e89b-12d3-a456-426614174000",
  "status": "queued"
}
```

#### cURLサンプル

```bash
curl -X POST "https://api.example.com/documents/doc-123/extract" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "template-456",
    "analysis_type": "vision"
  }'
```

#### 処理フロー

```
[API] → [SQSキュー] → [Worker Lambda] → [DynamoDB/S3更新]
                            ↓
                    (OCR/Vision処理)
                            ↓
                    (OpenAI構造化)
                            ↓
                    (結果をDynamoDBに保存)
```

**次のステップ**: `GET /jobs/{job_id}` または `GET /jobs/{job_id}/poll` でジョブの完了を確認

---

### 3. ドキュメント詳細取得

指定されたドキュメントの詳細情報を取得します。

#### エンドポイント

```
GET /documents/{document_id}
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |

#### レスポンス例

**成功 (200 OK)**

```json
{
  "document_id": "doc-123e4567-e89b-12d3-a456-426614174000",
  "tenant": "tenant-001",
  "filename": "skillsheet.pdf",
  "created_at": 1234567890,
  "updated_at": 1234567890,
  "file_key": "documents/tenant-001/doc-xxx/skillsheet.pdf",
  "converted_files": {
    "template-456": "documents/tenant-001/doc-xxx/converted_template-456.xlsx"
  }
}
```

#### フィールド説明

| フィールド | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |
| tenant | string | テナントID |
| filename | string | ファイル名 |
| created_at | number | 作成日時（Unixタイムスタンプ） |
| updated_at | number | 更新日時（Unixタイムスタンプ） |
| file_key | string | S3ファイルキー |
| converted_files | object | 変換済みファイル（キー: template_id、値: S3ファイルキー） |

---

### 4. ドキュメント一覧取得

アップロードされたPDFドキュメントの一覧を取得します。

#### エンドポイント

```
GET /documents
```

#### クエリパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|------------|-------|------------|------|
| limit | number | 20 | 取得件数（1-100） |
| last_key | string | - | 次のページ取得用のキー |

#### レスポンス例

**成功 (200 OK)**

```json
{
  "items": [
    {
      "document_id": "doc-123e4567-e89b-12d3-a456-426614174000",
      "filename": "skillsheet.pdf",
      "created_at": 1234567890,
      "updated_at": 1234567890,
      "converted_count": 2
    }
  ],
  "last_evaluated_key": "doc-123e4567-e89b-12d3-a456-426614174001",
  "has_more": true
}
```

#### ページネーション

1. 初回リクエスト: `GET /documents?limit=20`
2. 次のページ: `GET /documents?limit=20&last_key={last_evaluated_key}`
3. `has_more` が `false` になるまで繰り返す

---

### 5. ドキュメント削除

指定されたドキュメントを削除します。

#### エンドポイント

```
DELETE /documents/{document_id}
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |

#### レスポンス例

**成功 (200 OK)**

```json
{
  "document_id": "doc-123e4567-e89b-12d3-a456-426614174000",
  "status": "deleted"
}
```

#### 処理内容

- S3の原本ファイルを削除
- DynamoDBのメタデータレコードを削除
- 削除は即座に実行

---

### 6. AI構造化リトライ

AI構造化処理が失敗した場合、またはより良い結果を得たい場合に再実行します。

#### エンドポイント

```
POST /documents/{document_id}/reanalyze
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |

#### 利点

- OCRデータまたは画像データは再利用するため、高速かつ低コスト
- AI構造化処理（OpenAI API呼び出し）のみ再実行されます
- 新しいジョブIDが返されます

#### 使用例

- AI構造化ジョブがエラーで失敗した場合
- 構造化結果の精度を改善したい場合
- OpenAI APIのレート制限エラーからリトライする場合

#### レスポンス例

**成功 (200 OK)**

```json
{
  "job_id": "job-789e4567-e89b-12d3-a456-426614174000",
  "status": "queued"
}
```

---

### 7. 特定テンプレートの構造化データ取得

指定されたドキュメントとテンプレートの組み合わせで抽出された構造化データを取得します。

#### エンドポイント

```
GET /documents/{document_id}/structures/{template_id}
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |
| template_id | string | テンプレートID |

#### 前提条件

`POST /documents/{document_id}/extract` による構造抽出が完了していること

#### レスポンス例

**成功 (200 OK)**

```json
{
  "document_id": "doc-123e4567-e89b-12d3-a456-426614174000",
  "template_id": "template-456",
  "structured_data": {
    "document_type": "skill_sheet",
    "created_date": "2025/1/15",
    "basic_info": {
      "furigana": "ヤマダタロウ",
      "name": "山田太郎",
      "age": "30歳"
    },
    "work_experience": [
      {
        "index": 1,
        "period": {
          "start": "2020年4月",
          "end": "2023年3月"
        },
        "company": "株式会社サンプル",
        "project": {
          "overview": "プロジェクト概要"
        }
      }
    ],
    "skills": [
      {
        "category": "プログラミング言語",
        "items": "Python, JavaScript, TypeScript"
      }
    ]
  },
  "status": "completed",
  "created_at": 1234567890,
  "updated_at": 1234567890
}
```

#### cURLサンプル

```bash
curl "https://api.example.com/documents/doc-123/structures/template-456" \
  -H "Authorization: Bearer <JWT>"
```

#### 注意事項

- 構造化データのスキーマは、テンプレート登録時の `variables` 定義に依存します
- 処理中の場合は404エラーが返ります
- 同じドキュメントに対して複数のテンプレートで抽出可能です

---

### 8. 全テンプレートの構造化データ一覧取得

指定されたドキュメントに対して抽出されたすべての構造化データを一覧取得します。

#### エンドポイント

```
GET /documents/{document_id}/structures
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |

#### レスポンス例

**成功 (200 OK)**

```json
{
  "items": [
    {
      "document_id": "doc-123e4567-e89b-12d3-a456-426614174000",
      "template_id": "template-456",
      "status": "completed",
      "created_at": 1234567890,
      "updated_at": 1234567890
    },
    {
      "document_id": "doc-123e4567-e89b-12d3-a456-426614174000",
      "template_id": "template-789",
      "status": "completed",
      "created_at": 1234567900,
      "updated_at": 1234567900
    }
  ]
}
```

#### cURLサンプル

```bash
curl "https://api.example.com/documents/doc-123/structures" \
  -H "Authorization: Bearer <JWT>"
```

#### 使用例

- ドキュメント詳細画面で、利用可能な構造化データ一覧を表示する
- 異なるテンプレートで抽出した結果を比較する

---

### 9. 特定テンプレートの構造化データ編集

指定されたドキュメントとテンプレートの構造化データを更新します。

#### エンドポイント

```
PUT /documents/{document_id}/structures/{template_id}
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |
| template_id | string | テンプレートID |

**Request Body**

構造化データのJSONオブジェクト（スキーマはテンプレートのvariables定義に依存）

```json
{
  "basic_info": {
    "name": "山田太郎",
    "age": "32歳",
    "furigana": "ヤマダタロウ"
  },
  "work_experience": [
    {
      "index": 1,
      "period": {
        "start": "2020年4月",
        "end": "2023年3月"
      },
      "company": "株式会社サンプル",
      "project": {
        "overview": "Webシステム開発"
      }
    }
  ],
  "skills": [
    {
      "category": "プログラミング言語",
      "items": "Python, JavaScript, TypeScript, Go"
    }
  ]
}
```

#### レスポンス例

**成功 (200 OK)**

```json
{
  "document_id": "doc-123e4567-e89b-12d3-a456-426614174000",
  "template_id": "template-456",
  "status": "updated"
}
```

#### cURLサンプル

```bash
curl -X PUT "https://api.example.com/documents/doc-123/structures/template-456" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d @structured_data.json
```

#### 注意事項

- 更新後、このテンプレートでの変換処理には更新後のデータが使用されます
- 他のテンプレートで抽出した構造化データには影響しません

---

## Templates API

### 1. テンプレート登録

新しいExcelテンプレートを登録します。

#### エンドポイント

```
POST /templates
```

#### リクエスト

**Content-Type**: `multipart/form-data`

| パラメータ | 型 | 必須 | 説明 |
|------------|-------|------|------|
| file | File | ✓ | アップロードするExcelファイル (.xlsx) |
| name | string | ✓ | テンプレート名 |
| description | string | - | テンプレートの説明 |
| variables | string | - | テンプレート変数定義（JSON文字列） |

#### variables の例

```json
{
  "basic_info": {
    "name": "",
    "age": "",
    "furigana": ""
  },
  "work_experience": [
    {
      "index": 0,
      "period": {
        "start": "",
        "end": ""
      },
      "company": "",
      "project": {
        "overview": ""
      }
    }
  ],
  "skills": [
    {
      "category": "",
      "items": ""
    }
  ]
}
```

#### テンプレート変数の記法

Excelテンプレート内で以下の形式で変数を使用できます:
- `{{basic_info.name}}` → 氏名
- `{{basic_info.age}}` → 年齢
- `{{work_experience.0.company}}` → 最初の職務経歴の会社名

詳細は [TEMPLATE_GUIDE.md](TEMPLATE_GUIDE.md) を参照してください。

#### レスポンス例

**成功 (200 OK)**

```json
{
  "template_id": "template-123e4567-e89b-12d3-a456-426614174000",
  "name": "標準テンプレート",
  "status": "created",
  "variables": "{\"basic_info\": {\"name\": \"\", \"age\": \"\"}}"
}
```

#### cURLサンプル

```bash
curl -X POST "https://api.example.com/templates" \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@template.xlsx" \
  -F "name=標準テンプレート" \
  -F "description=スキルシート標準フォーマット" \
  -F 'variables={"basic_info": {"name": "", "age": ""}}'
```

---

### 2. テンプレート詳細取得

指定されたテンプレートの詳細情報を取得します。

#### エンドポイント

```
GET /templates/{template_id}
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| template_id | string | テンプレートID |

#### レスポンス例

**成功 (200 OK)**

```json
{
  "template_id": "template-123e4567-e89b-12d3-a456-426614174000",
  "tenant": "tenant-001",
  "name": "標準テンプレート",
  "description": "スキルシート標準フォーマット",
  "filename": "template.xlsx",
  "file_key": "templates/tenant-001/tpl-123/template.xlsx",
  "created_at": 1234567890,
  "updated_at": 1234567890,
  "variables": "{\"basic_info\": {\"name\": \"\", \"age\": \"\"}}"
}
```

---

### 3. テンプレート一覧取得

登録されているExcelテンプレートの一覧を取得します。

#### エンドポイント

```
GET /templates
```

#### クエリパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|------------|-------|------------|------|
| limit | number | 20 | 取得件数（1-100） |
| last_key | string | - | 次のページ取得用のキー |

#### レスポンス例

**成功 (200 OK)**

```json
{
  "items": [
    {
      "template_id": "template-123e4567-e89b-12d3-a456-426614174000",
      "name": "標準テンプレート",
      "description": "スキルシート標準フォーマット",
      "filename": "template.xlsx",
      "created_at": 1234567890,
      "updated_at": 1234567890,
      "variables": "{\"basic_info\": {\"name\": \"\", \"age\": \"\"}}"
    }
  ],
  "last_evaluated_key": "template-123e4567-e89b-12d3-a456-426614174001",
  "has_more": false
}
```

---

### 4. テンプレート削除

指定されたテンプレートを削除します。

#### エンドポイント

```
DELETE /templates/{template_id}
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| template_id | string | テンプレートID |

#### レスポンス例

**成功 (200 OK)**

```json
{
  "template_id": "template-123e4567-e89b-12d3-a456-426614174000",
  "status": "deleted"
}
```

#### 注意事項

- 削除は即座に実行されます
- 使用中のテンプレートでも削除可能
- 既に開始された変換ジョブには影響しません

---

## Conversion API

### Excelテンプレート変換

構造化データを指定されたExcelテンプレートに埋め込んで変換します。

#### エンドポイント

```
POST /documents/{document_id}/convert
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |

**Request Body**

```json
{
  "template_id": "template-123e4567-e89b-12d3-a456-426614174000"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-------|------|------|
| template_id | string | ✓ | 変換に使用するテンプレートのID |

#### 変数置換の仕組み

テンプレート内の変数プレースホルダー（`{{field_path}}`）が構造化データの実際の値に置き換わります。

**例:**
- `{{basic_info.name}}` → 「山田太郎」
- `{{basic_info.age}}` → 「30歳」
- `{{work_experience.0.company}}` → 「株式会社サンプル」
- `{{skills.0.items}}` → 「Python, JavaScript, TypeScript」

#### レスポンス例

**成功 (200 OK)**

```json
{
  "job_id": "job-123e4567-e89b-12d3-a456-426614174000",
  "status": "queued"
}
```

#### 処理フロー

```
[API] → [SQSキュー] → [Convert Worker] → [S3に保存]
                            ↓
                    (テンプレート読み込み)
                            ↓
                    (変数置換処理)
                            ↓
                    (Excel出力)
```

**次のステップ**:
1. `GET /jobs/{job_id}` でジョブの完了を確認
2. `GET /files/{document_id}/download?type=converted&template_id={template_id}` でダウンロード

---

## AI Processing API

### 1. 文章ブラッシュアップ

構造化データの特定フィールドを改善します。

#### エンドポイント

```
POST /documents/{document_id}/enhance
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |

**Request Body**

```json
{
  "field_path": "self_pr",
  "instructions": "より具体的に、成果を強調して"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-------|------|------|
| field_path | string | ✓ | 改善対象フィールドのパス（例: `self_pr`, `work_experience.0.description`） |
| instructions | string | - | 改善の具体的な指示（省略可） |

#### 処理内容

- 指定したフィールドの内容を、より読みやすく洗練された表現に変換
- 全体の構造化データをコンテキストとして使用し、整合性を保つ
- 改善結果は元のフィールドを上書きせず、「_improved」サフィックス付きの新しいフィールドに保存

**例:**
- `field_path='self_pr'` → `self_pr_improved` フィールドが追加される

#### レスポンス例

**成功 (200 OK)**

```json
{
  "job_id": "job-123e4567-e89b-12d3-a456-426614174000",
  "status": "queued"
}
```

---

### 2. 営業用紹介文作成

構造化データから営業用の紹介文を自動生成します。

#### エンドポイント

```
POST /documents/{document_id}/summary
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| document_id | string | ドキュメントID |

#### 処理内容

- 構造化データ全体（基本情報、スキル、職務経歴など）から紹介文を生成
- 生成結果は DynamoDB の `generated_introduction` フィールドに保存される
- 処理は非同期で実行される

#### レスポンス例

**成功 (200 OK)**

```json
{
  "job_id": "job-123e4567-e89b-12d3-a456-426614174000",
  "status": "queued"
}
```

---

## Files API

### ファイルダウンロード

指定されたファイルのS3署名付きダウンロードURLを返します。

#### エンドポイント

```
GET /files/{file_id}/download
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| file_id | string | ファイルID（document_id または template_id） |

**Query Parameters**

| パラメータ | 型 | 必須 | 説明 |
|------------|-------|------|------|
| type | string | ✓ | ファイルタイプ: `original`, `template`, `converted` |
| template_id | string | △ | type=converted の場合に必要 |

#### ファイルタイプ

| タイプ | 説明 | file_id | template_id |
|--------|------|---------|-------------|
| **original** | オリジナルPDFファイル | document_id | 不要 |
| **template** | テンプレートExcelファイル | template_id | 不要 |
| **converted** | 変換済みExcelファイル | document_id | 必要 |

#### 使用例

**オリジナルPDF:**
```
GET /files/{document_id}/download?type=original
```

**テンプレート:**
```
GET /files/{template_id}/download?type=template
```

**変換済みExcel:**
```
GET /files/{document_id}/download?type=converted&template_id={template_id}
```

#### レスポンス例

**成功 (200 OK)**

```json
{
  "download_url": "https://bucket.s3.amazonaws.com/...",
  "filename": "skillsheet.pdf",
  "expires_in": 3600,
  "expires_at": 1234571490
}
```

#### フィールド説明

| フィールド | 型 | 説明 |
|------------|-------|------|
| download_url | string | S3署名付きダウンロードURL |
| filename | string | ファイル名 |
| expires_in | number | URL有効期限（秒） |
| expires_at | number | URL有効期限（Unixタイムスタンプ） |

#### cURLサンプル

```bash
curl "https://api.example.com/files/doc-123/download?type=original" \
  -H "Authorization: Bearer <JWT>"
```

#### 注意事項

- 返却されたURLは3600秒（1時間）有効です
- クライアントはこのURLから直接S3からファイルをダウンロードできます
- URLは使い捨てで、再利用する場合は再度API呼び出しが必要です

---

## Jobs API

### 1. ジョブ状態取得

指定されたジョブIDの現在の状態を取得します。

#### エンドポイント

```
GET /jobs/{job_id}
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| job_id | string | ジョブID |

#### レスポンス例

**成功 (200 OK)**

```json
{
  "job_id": "job-123e4567-e89b-12d3-a456-426614174000",
  "status": "succeeded",
  "step": "ai_structure",
  "output": {
    "structured_data": {
      "basic_info": {
        "name": "山田太郎"
      }
    }
  },
  "error": null,
  "updated_at": 1234567890,
  "tenant": "tenant-001"
}
```

#### ジョブステータス

| ステータス | 説明 |
|-----------|------|
| **queued** | キューに追加済み |
| **running** | 処理中 |
| **succeeded** | 成功 |
| **failed** | 失敗 |
| **completed** | 完了 |

---

### 2. ジョブ状態ポーリング

ジョブの状態をロングポーリング方式で確認します。

#### エンドポイント

```
GET /jobs/{job_id}/poll
```

#### パラメータ

**Path Parameters**

| パラメータ | 型 | 説明 |
|------------|-------|------|
| job_id | string | ジョブID |

**Query Parameters**

| パラメータ | 型 | デフォルト | 説明 |
|------------|-------|------------|------|
| timeout | number | 30 | ポーリングのタイムアウト時間（秒、最大60） |

#### 仕組み

- 指定されたタイムアウト時間内にジョブが完了するまで待機
- 完了したらすぐに結果を返す
- タイムアウトした場合は現在の状態を返す
- 2秒ごとにジョブ状態をチェック

#### レスポンス例

**成功 (200 OK)**

```json
{
  "job_id": "job-123e4567-e89b-12d3-a456-426614174000",
  "status": "succeeded",
  "step": "ai_structure",
  "output": {
    "structured_data": {
      "basic_info": {
        "name": "山田太郎"
      }
    }
  },
  "error": null,
  "updated_at": 1234567890,
  "tenant": "tenant-001"
}
```

#### cURLサンプル

```bash
# 最大30秒待機
curl "https://api.example.com/jobs/job-123/poll?timeout=30" \
  -H "Authorization: Bearer <JWT>"
```

#### 使用例（JavaScript）

```javascript
async function waitForJob(jobId) {
  const response = await fetch(
    `https://api.example.com/jobs/${jobId}/poll?timeout=30`,
    {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    }
  );

  const job = await response.json();

  if (job.status === 'succeeded' || job.status === 'completed') {
    console.log('Job completed:', job.output);
  } else if (job.status === 'failed') {
    console.error('Job failed:', job.error);
  } else {
    // まだ処理中の場合は再度ポーリング
    await waitForJob(jobId);
  }
}
```

---

## 完全なワークフロー例

### 1. PDFアップロード → AI構造化 → Excel変換

#### ステップ1: テンプレート登録

```bash
curl -X POST "https://api.example.com/templates" \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@template.xlsx" \
  -F "name=標準テンプレート" \
  -F 'variables={"basic_info": {"name": "", "age": ""}}'
```

**レスポンス:**
```json
{
  "template_id": "template-456",
  "name": "標準テンプレート",
  "status": "created"
}
```

#### ステップ2: PDFアップロード

```bash
curl -X POST "https://api.example.com/documents/upload" \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@skillsheet.pdf"
```

**レスポンス:**
```json
{
  "document_id": "doc-123",
  "filename": "skillsheet.pdf"
}
```

#### ステップ3: 構造抽出開始

```bash
curl -X POST "https://api.example.com/documents/doc-123/extract" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "template-456",
    "analysis_type": "vision"
  }'
```

**レスポンス:**
```json
{
  "job_id": "job-789",
  "status": "queued"
}
```

#### ステップ4: ジョブの完了を待機

```bash
curl "https://api.example.com/jobs/job-789/poll?timeout=60" \
  -H "Authorization: Bearer <JWT>"
```

**レスポンス:**
```json
{
  "job_id": "job-789",
  "status": "succeeded",
  "output": {
    "structured_data": {
      "basic_info": {
        "name": "山田太郎",
        "age": "30歳"
      }
    }
  }
}
```

#### ステップ5: 構造化データを取得

```bash
curl "https://api.example.com/documents/doc-123/structures/template-456" \
  -H "Authorization: Bearer <JWT>"
```

#### ステップ6: （オプション）構造化データを編集

```bash
curl -X PUT "https://api.example.com/documents/doc-123/structures/template-456" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "basic_info": {
      "name": "山田太郎",
      "age": "32歳"
    }
  }'
```

#### ステップ7: Excel変換

```bash
curl -X POST "https://api.example.com/documents/doc-123/convert" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "template-456"
  }'
```

**レスポンス:**
```json
{
  "job_id": "job-999",
  "status": "queued"
}
```

#### ステップ8: 変換完了を待機

```bash
curl "https://api.example.com/jobs/job-999/poll?timeout=60" \
  -H "Authorization: Bearer <JWT>"
```

#### ステップ9: 変換済みExcelをダウンロード

```bash
curl "https://api.example.com/files/doc-123/download?type=converted&template_id=template-456" \
  -H "Authorization: Bearer <JWT>"
```

**レスポンス:**
```json
{
  "download_url": "https://bucket.s3.amazonaws.com/...",
  "filename": "skillsheet_converted.xlsx",
  "expires_in": 3600,
  "expires_at": 1234571490
}
```

#### ステップ10: S3から直接ダウンロード

```bash
curl -O "{download_url}"
```

---

## UI実装のポイント

### 1. 認証フロー

```javascript
// Cognitoでログイン
const { idToken } = await Auth.signIn(username, password);

// 全てのリクエストにトークンを付与
const headers = {
  'Authorization': `Bearer ${idToken}`,
  'Content-Type': 'application/json'
};
```

### 2. ファイルアップロード

```javascript
const formData = new FormData();
formData.append('file', file);

const response = await fetch(`${API_BASE_URL}/documents/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`
  },
  body: formData
});

const { document_id } = await response.json();
```

### 3. ジョブポーリング

```javascript
async function pollJob(jobId) {
  while (true) {
    const response = await fetch(
      `${API_BASE_URL}/jobs/${jobId}/poll?timeout=30`,
      {
        headers: { 'Authorization': `Bearer ${jwt}` }
      }
    );

    const job = await response.json();

    if (job.status === 'succeeded' || job.status === 'completed') {
      return job;
    } else if (job.status === 'failed') {
      throw new Error(job.error);
    }

    // タイムアウトした場合は再ポーリング
  }
}
```

### 4. プログレス表示

```javascript
// ステータスに応じてUIを更新
const statusMessages = {
  'queued': 'キューに追加されました...',
  'running': '処理中...',
  'succeeded': '完了しました！',
  'failed': 'エラーが発生しました',
  'completed': '完了しました！'
};

const message = statusMessages[job.status];
```

### 5. エラーハンドリング

```javascript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  return await response.json();
} catch (error) {
  console.error('API Error:', error.message);
  // ユーザーにエラーを表示
}
```

---

## レート制限

現在、レート制限は実装されていませんが、以下の点に注意してください:

- OpenAI APIのレート制限に依存
- 大量のリクエストを短時間に送信しない
- ポーリング間隔は最低2秒を推奨

---

## サポート

### Swagger UI

本番環境またはローカル環境で、以下のURLにアクセスして対話的なAPIドキュメントを確認できます:

- Swagger UI: `{BASE_URL}/docs`
- ReDoc: `{BASE_URL}/redoc`

### 問い合わせ

技術的な質問や問題が発生した場合は、プロジェクトのREADMEまたはSETUP.mdを参照してください。

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 3.0.0 | 2025-01-29 | マルチテンプレート対応: structured_data_tableの導入、新しい構造化データAPI追加 |
| 2.0.0 | 2025-01-XX | 初版作成 |

---

## 付録

### データモデル

#### Document（ドキュメント）

```typescript
interface Document {
  document_id: string;
  tenant: string;
  filename: string;
  file_key: string;
  converted_files?: { [template_id: string]: string };
  created_at: number;
  updated_at: number;
}
```

#### StructuredData（構造化データ）

```typescript
interface StructuredData {
  document_id: string;      // パーティションキー
  template_id: string;      // ソートキー
  tenant: string;
  structured_data: any;     // テンプレートのvariables定義に依存
  status: 'processing' | 'completed' | 'failed';
  created_at: number;
  updated_at: number;
}
```

#### Template（テンプレート）

```typescript
interface Template {
  template_id: string;
  tenant: string;
  name: string;
  description?: string;
  filename: string;
  file_key: string;
  variables?: string; // JSON文字列 - AI抽出のスキーマ定義
  created_at: number;
  updated_at: number;
}
```

#### Job（ジョブ）

```typescript
interface Job {
  job_id: string;
  tenant: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'completed';
  step: string;
  output?: any;
  error?: string;
  updated_at: number;
}
```

### 環境変数

#### API

```env
AWS_REGION=us-east-1
QUEUE_URL=https://sqs.{region}.amazonaws.com/{account-id}/jobs-queue
TENANTS_TABLE=tenants
LOCAL_TENANT=local-dev  # ローカル開発時のみ
```

#### Worker

```env
AWS_REGION=us-east-1
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o
USE_REAL_APIS=true
```

---

以上がAPI仕様書です。このドキュメントを使用して、別プロジェクトでUIを実装できます。
