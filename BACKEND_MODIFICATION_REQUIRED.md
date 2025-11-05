# バックエンド修正推奨事項

## 概要
現在、変換済みファイル一覧のAPIレスポンスが配列形式で返されているため、テンプレート情報との紐付けができません。
フロントエンドでは暫定対応を行いましたが、根本的な解決のためにバックエンドAPIの修正を推奨します。

## 現在の問題点

### 現在のAPIレスポンス形式
```json
{
  "document_id": "doc-123",
  "tenant": "tenant-001",
  "filename": "skillsheet.pdf",
  "file_key": "documents/...",
  "converted_files": [
    "documents/public/21578be1-b5a8-4f4a-bead-c96132209c0f/converted_c337042a-1910-43b2-8f33-15e4524fcde1.xlsx",
    "documents/public/21578be1-b5a8-4f4a-bead-c96132209c0f/converted_a6760477-e348-4a83-9ff3-925e497b1bed.xlsx"
  ],
  "created_at": 1234567890,
  "updated_at": 1234567890
}
```

### 問題点
1. **配列形式** のため、どのファイルがどのテンプレートで変換されたか不明
2. **インデックス番号** (0, 1) がキーになるため、テンプレート情報と紐付けできない
3. **ファイル名** がS3パス全体のため、ユーザーに分かりづらい
4. **変換日時** などのメタデータが含まれていない

## 推奨される修正内容

### 推奨APIレスポンス形式（オプション1: シンプル）
```json
{
  "document_id": "doc-123",
  "tenant": "tenant-001",
  "filename": "skillsheet.pdf",
  "file_key": "documents/...",
  "converted_files": {
    "template-456": "documents/public/21578be1-b5a8-4f4a-bead-c96132209c0f/converted_c337042a-1910-43b2-8f33-15e4524fcde1.xlsx",
    "template-789": "documents/public/21578be1-b5a8-4f4a-bead-c96132209c0f/converted_a6760477-e348-4a83-9ff3-925e497b1bed.xlsx"
  },
  "created_at": 1234567890,
  "updated_at": 1234567890
}
```

### 推奨APIレスポンス形式（オプション2: 詳細メタデータ付き）
```json
{
  "document_id": "doc-123",
  "tenant": "tenant-001",
  "filename": "skillsheet.pdf",
  "file_key": "documents/...",
  "converted_files": {
    "template-456": {
      "file_key": "documents/public/21578be1-b5a8-4f4a-bead-c96132209c0f/converted_c337042a-1910-43b2-8f33-15e4524fcde1.xlsx",
      "filename": "skillsheet_converted_standard.xlsx",
      "template_name": "標準テンプレート",
      "template_id": "template-456",
      "converted_at": 1234567890,
      "file_size": 45678
    },
    "template-789": {
      "file_key": "documents/public/21578be1-b5a8-4f4a-bead-c96132209c0f/converted_a6760477-e348-4a83-9ff3-925e497b1bed.xlsx",
      "filename": "skillsheet_converted_detailed.xlsx",
      "template_name": "詳細テンプレート",
      "template_id": "template-789",
      "converted_at": 1234567891,
      "file_size": 67890
    }
  },
  "created_at": 1234567890,
  "updated_at": 1234567890
}
```

## 修正が必要な箇所

### 1. データ型定義の修正
**ファイル:** `src/models.py` または該当するモデル定義ファイル

```python
# 現在（推測）
converted_files: List[str] = []

# 修正後（オプション1: シンプル）
converted_files: Dict[str, str] = {}  # template_id -> file_key

# 修正後（オプション2: 詳細）
converted_files: Dict[str, ConvertedFileInfo] = {}

class ConvertedFileInfo(BaseModel):
    file_key: str
    filename: str
    template_name: str
    template_id: str
    converted_at: int
    file_size: Optional[int] = None
```

### 2. 変換処理の修正
**変換完了時にテンプレートIDをキーとして保存**

```python
# 現在（推測）
document.converted_files.append(s3_file_key)

# 修正後（オプション1）
document.converted_files[template_id] = s3_file_key

# 修正後（オプション2）
document.converted_files[template_id] = {
    "file_key": s3_file_key,
    "filename": generated_filename,
    "template_name": template.name,
    "template_id": template_id,
    "converted_at": int(time.time()),
    "file_size": file_size
}
```

### 3. DynamoDB スキーマの確認
DynamoDBを使用している場合、`converted_files` の型がMap型になっているか確認してください。

## メリット

### オプション1（シンプル）のメリット
- 最小限の変更で実装可能
- テンプレートIDとの紐付けが可能
- 既存のAPI仕様書に準拠

### オプション2（詳細メタデータ）のメリット
- ユーザーフレンドリーなファイル名を表示可能
- テンプレート情報をフロントエンドで再取得する必要がない
- 変換日時やファイルサイズなどの追加情報を提供可能
- 将来的な機能拡張に対応しやすい

## 互換性の考慮

### 段階的な移行（推奨）
1. **Phase 1:** バックエンドで新しい形式をサポート
2. **Phase 2:** フロントエンドは既に両方の形式に対応済み（今回の修正で実装済み）
3. **Phase 3:** 古い配列形式のサポートを廃止

### フロントエンドの対応状況
✅ 配列形式に対応（現在の形式）
✅ オブジェクト形式に対応（推奨形式）
✅ 文字列値・オブジェクト値の両方に対応

## API仕様書の更新

**ファイル:** `docs/API_SPECIFICATION.md`

既にドキュメントには正しい形式が記載されています（317-319行目）:
```json
"converted_files": {
  "template-456": "documents/tenant-001/doc-xxx/converted_template-456.xlsx"
}
```

この仕様に合わせて実装を修正してください。

## 実装優先度

**優先度: 高**

理由:
- ユーザー体験に直接影響
- API仕様書との不整合がある
- フロントエンドは既に対応済みのため、バックエンド修正のみで完了

## 質問・相談

この修正について質問がある場合は、以下を確認してください:
1. 現在のバックエンド実装（どこで配列に変換されているか）
2. DynamoDBのスキーマ定義
3. 変換処理を行っている関数/メソッド

---

**作成日:** 2025-11-05
**フロントエンド対応:** 完了済み
**バックエンド対応:** 未実施
