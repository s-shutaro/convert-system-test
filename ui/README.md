# Document Processing UI

AIを活用したドキュメント処理システムのWebインターフェース

## 機能

- **ドキュメント管理**
  - PDFファイルのアップロード（ドラッグ&ドロップ対応）
  - アップロード済みドキュメント一覧表示
  - PDFプレビュー機能

- **AI構造抽出**
  - OCR / Vision / BASE64の3つの分析方式に対応
  - テンプレートベースの構造化データ抽出
  - リアルタイム進捗表示

- **データ編集**
  - 抽出された構造化データの確認・編集
  - ユーザーフレンドリーなフォーム形式
  - AIによるフィールドブラッシュアップ機能

- **テンプレート管理**
  - Excelテンプレートの登録
  - 変数定義の管理
  - テンプレートのダウンロード・削除

- **Excel変換**
  - 構造化データをExcelテンプレートに変換
  - 変換済みファイルのダウンロード
  - 変換履歴の表示

## 技術スタック

- **Next.js 15** - Reactフレームワーク（App Router）
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **shadcn/ui** - UIコンポーネントライブラリ
- **Zustand** - 状態管理
- **React Hook Form** - フォーム管理
- **Axios** - HTTP通信
- **react-pdf** - PDFプレビュー
- **sonner** - トースト通知

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn
- バックエンドAPI (FastAPI) が `http://localhost:8000` で稼働していること

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

### 環境変数

`.env.local` ファイルで以下の環境変数を設定できます：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 使い方

### 1. PDFアップロード

1. ホーム画面でPDFファイルをドラッグ&ドロップまたは選択
2. 「アップロード」ボタンをクリック

### 2. 構造抽出

1. アップロードしたドキュメントの「詳細を見る」をクリック
2. テンプレートと分析方式を選択
3. 「構造抽出を開始」をクリック
4. 進捗が表示され、完了すると構造化データが表示されます

### 3. データ編集

1. 構造化データのフィールドを直接編集
2. 必要に応じて「ブラッシュアップ」機能で文章を改善
3. 「保存」ボタンで変更を保存

### 4. Excel変換

1. テンプレートを選択
2. 「変換を開始」をクリック
3. 変換完了後、自動でダウンロードが開始されます

### 5. テンプレート管理

1. ナビゲーションから「テンプレート」へ移動
2. 「テンプレートを登録」をクリック
3. Excelファイル、名前、説明、変数定義を入力して登録

## プロジェクト構造

```
ui/
├── app/                      # Next.js App Router
│   ├── documents/[id]/      # ドキュメント詳細ページ
│   ├── templates/           # テンプレート管理ページ
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # ホームページ
│   └── globals.css          # グローバルスタイル
├── components/              # Reactコンポーネント
│   ├── ui/                  # shadcn/uiコンポーネント
│   ├── documents/           # ドキュメント関連コンポーネント
│   └── templates/           # テンプレート関連コンポーネント
├── lib/                     # ユーティリティ
│   ├── api-client.ts        # API通信クライアント
│   ├── store.ts             # Zustandストア
│   └── utils.ts             # ヘルパー関数
└── types/                   # TypeScript型定義
```

## API接続

このUIは以下のFastAPI エンドポイントに接続します：

- `POST /documents/upload` - ドキュメントアップロード
- `POST /documents/{id}/extract` - 構造抽出
- `GET /documents/{id}/structure` - 構造化データ取得
- `PUT /documents/{id}/content` - 構造化データ更新
- `POST /documents/{id}/convert` - Excel変換
- `POST /templates` - テンプレート登録
- `GET /templates` - テンプレート一覧
- `GET /jobs/{id}/poll` - ジョブ状態ポーリング
- `GET /files/{id}/download` - ファイルダウンロード

詳細は `/docs/API_SPECIFICATION.md` を参照してください。

## 開発

### ビルド

```bash
npm run build
```

### 本番環境での起動

```bash
npm run start
```

### リント

```bash
npm run lint
```

## トラブルシューティング

### APIに接続できない

- バックエンドAPIが `http://localhost:8000` で稼働しているか確認
- `.env.local` の `NEXT_PUBLIC_API_BASE_URL` が正しいか確認

### PDFが表示されない

- react-pdfの依存関係が正しくインストールされているか確認
- ブラウザのコンソールでエラーを確認

### ファイルアップロードが失敗する

- ファイルサイズが10MB以下か確認
- ファイル形式がPDF(.pdf)またはExcel(.xlsx)か確認

## ライセンス

Private

## サポート

問題が発生した場合は、プロジェクトのIssueを作成してください。
