# プロジェクトセットアップガイド

このドキュメントでは、`sheet-convert-system` リポジトリを利用する際の初期設定、ローカル開発、デプロイ、テナント管理の手順をまとめています。環境に応じて不要なステップはスキップしてください。

**関連ドキュメント**:
- [Excelテンプレート使用ガイド](TEMPLATE_GUIDE.md) - テンプレート作成方法と変数記法

## 前提条件

- Node.js 18 以降（AWS CDK v2 の実行に利用）
- npm
- Python 3.11
- AWS CLI v2 と適切な認証情報
- Docker と Docker Compose：ローカルでの AWS サービス模擬環境とWorker実行

**注意**: このプロジェクトは npm scripts を使用しており、Windows/Mac/Linux 全ての環境で動作します。

## 初回セットアップ

1. CDK ブートストラップ（AWS アカウントごとに 1 度のみ）

   プロジェクトルートで以下を実行します:
   ```sh
   npm run bootstrap
   ```

   このコマンドは自動的に依存パッケージのインストールとCDKブートストラップを実行します。

2. Python 依存をインストール（必要に応じて仮想環境を利用）

   Windows (PowerShell):
   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r services/api/requirements.txt
   pip install -r services/workers/requirements.txt
   pip install -r services/auth/authorizer/requirements.txt
   ```

   Mac/Linux:
   ```sh
   python -m venv .venv
   source .venv/bin/activate
   pip install -r services/api/requirements.txt
   pip install -r services/workers/requirements.txt
   pip install -r services/auth/authorizer/requirements.txt
   ```

## ローカル開発

LocalStack を使用してローカル環境で AWS サービスをエミュレートし、FastAPI アプリケーションを実行できます。

### 1. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成します:

```sh
cp .env.example .env
```

`.env` ファイルの内容（例）:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566
IS_LOCAL=true
QUEUE_URL=http://localhost:4566/000000000000/jobs-queue
TENANTS_TABLE=tenants
LOCAL_TENANT=local-dev
```

### 2. LocalStack の起動（Docker Compose使用）

Docker Compose で LocalStack を起動します:

```sh
# LocalStack を起動
docker-compose up -d localstack

# ログを確認
docker-compose logs -f localstack
```

または npm scripts で:
```sh
# LocalStack を起動
npm run local:start

# ログを確認（別ターミナルで）
npm run local:logs
```

### 3. ローカルリソースの作成

DynamoDB テーブル、S3 バケット、SQS キューを作成します:

```sh
npm run dev:setup
```

このコマンドは以下のリソースを作成します:
- `tenants` DynamoDB テーブル
- `local-dev-jobs` DynamoDB テーブル
- `local-dev-artifacts` S3 バケット
- `jobs-queue` SQS キュー

### 4. FastAPI アプリケーションの起動

```sh
npm run dev:api
```

または手動で:
```sh
cd services/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

アプリケーションは http://localhost:8000 で起動します。

### 5. API のテスト

FastAPI の自動生成ドキュメントにアクセス:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

APIをテスト:
```sh
# ジョブを投入
curl -X POST "http://localhost:8000/sheets/test-sheet-123/ingest?mode=auto"

# ジョブステータスを確認
curl "http://localhost:8000/jobs/{job_id}"
```

### ローカル開発のヒント

**ローカルモードの特徴:**
- 認証はスキップされ、`LOCAL_TENANT` が自動的に使用されます
- 全ての AWS サービスは LocalStack を経由します
- コードの変更は自動的にリロードされます（`--reload` オプション）

**LocalStack の停止:**
```sh
docker-compose down
# または
npm run local:stop
```

**トラブルシューティング:**
- LocalStack が起動しない場合、ポート 4566 が使用されていないか確認してください
- リソース作成に失敗する場合、LocalStack のログを確認してください: `docker-compose logs localstack`
- 環境変数が正しく読み込まれない場合、`.env` ファイルがプロジェクトルートにあるか確認してください

### 6. Worker処理の実行（Docker）

Worker処理はDockerコンテナで実行します。これにより、Popplerなどの外部依存関係が自動的にインストールされます。

**ローカル開発環境では、1つのWorkerコンテナが全てのタスクを処理します:**

- **OCR_EXTRACT**: Textractで文字認識（Ingest Worker）
- **IMAGE_CONVERT**: PDF→画像変換（Ingest Worker、Poppler使用）
- **AI_STRUCTURE**: OCRテキストをOpenAIで構造化（AI Worker）
- **AI_VISION_STRUCTURE**: 画像をOpenAI Vision APIで構造化（AI Worker）
- **CONVERT**: 構造化データをExcelテンプレートに変換（Convert Worker）

#### Workerイメージのビルド

```sh
# npm scriptsを使用
npm run worker:build

# またはdocker-composeコマンドを直接使用
docker-compose build worker
```

#### Worker実行（手動トリガー）

SQSキューからメッセージを1回だけ取得して処理（どのタスクでも自動で適切なハンドラーが実行されます）:

```sh
# npm scriptsを使用
npm run worker:run

# またはdocker-composeコマンドを直接使用
docker-compose run --rm worker python run_worker_once.py
```

#### 実API（Textract/OpenAI）を使用する場合

`.env` ファイルで以下を設定:

```sh
# 実APIを使用する設定
USE_REAL_APIS=true

# Textract設定（OCR_EXTRACTタスクで使用）
AWS_TEXTRACT_ACCESS_KEY_ID=<AWSアクセスキー>
AWS_TEXTRACT_SECRET_ACCESS_KEY=<AWSシークレットキー>
AWS_TEXTRACT_REGION=ap-northeast-1

# OpenAI設定（AI_STRUCTURE、AI_VISION_STRUCTUREタスクで使用）
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o
```

その後、Workerを実行すると、キューにあるタスクの種類に応じて自動的に実APIが使用されます:

```sh
npm run worker:run
```

#### Worker処理のデバッグ

コンテナ内に入ってデバッグ:

```sh
# npm scriptsを使用
npm run worker:debug

# コンテナ内で確認
pdftoppm -h  # Poppler確認（IMAGE_CONVERTタスクで必要）
python -c "import pdf2image; print('OK')"  # Python環境確認
python -c "import openpyxl; print('OK')"  # Excel処理ライブラリ確認
python run_worker_once.py  # 手動実行
```

#### Workerイメージの再ビルド

コードや依存関係を変更した場合:

```sh
# キャッシュなしで再ビルド
docker-compose build --no-cache worker

# 通常の再ビルド
npm run worker:build
```

### Worker処理の流れ

1. **FastAPIからSQSへジョブ投入**
   ```sh
   curl -X POST "http://localhost:8000/documents/upload" \
     -F "file=@test.pdf" \
     -F "analysis_type=ocr"
   ```

2. **SQSキューの確認**
   ```sh
   python scripts/view-local-resources.py
   ```

3. **Workerで処理実行**
   ```sh
   docker-compose run --rm worker
   ```

4. **処理結果の確認**
   - DynamoDBでジョブステータス確認
   - S3で出力ファイル確認

### Dockerコンテナ使用のメリット

✅ **Popplerが自動インストール** - 手動インストール不要
✅ **環境の統一** - チーム全員が同じ環境で開発
✅ **クリーンな環境** - ホストマシンを汚さない
✅ **本番環境との互換性** - 同じベースイメージ（AWS Lambda Python 3.11）を使用
✅ **簡単なセットアップ** - `docker-compose build`だけ

### CDK の検証

- テンプレートの合成:
  ```sh
  npm run synth
  ```
- 変更差分の確認:
  ```sh
  npm run cdk -- diff
  ```

## デプロイ手順

### Worker Lambda のアーキテクチャ

本番環境のWorker Lambda関数は **ECR（Elastic Container Registry）ベースのコンテナイメージ** としてデプロイされます。

**メリット**:
- ✅ Popplerなどのシステム依存関係を含めることができる
- ✅ Lambda Layerのサイズ制限（250MB）を回避
- ✅ コンテナイメージサイズ上限: 10GB
- ✅ 各Worker（ingest、ai、convert）ごとに最適化されたイメージ

**ローカル開発環境との違い**:
- **ローカル**: `Dockerfile`（通常のPython 3.11イメージ、全Workerを1つのコンテナに含む）
- **本番**: `Dockerfile.lambda`（AWS Lambda Python 3.11イメージ、各Worker個別にビルド）

**デプロイの流れ**:
1. CDKが`Dockerfile.lambda`を使用してDockerイメージをビルド（各Worker: ingest, convert, ai）
2. ECRリポジトリに自動プッシュ
3. Lambda関数がECRイメージを参照

### 1. 初回デプロイ

デプロイ先の AWS アカウントとリージョンをプロファイルで指定します。

**重要**: 初回デプロイ時はDockerイメージのビルドとプッシュが行われるため、通常より時間がかかります（5-10分程度）。

### 2. CDKデプロイの実行

テナント一覧を `tenants` コンテキストで指定し、CDK をデプロイします。

プロジェクトルートで以下を実行します:
```sh
npm run deploy
```

特定のテナントを指定する場合:
```sh
npm run cdk -- deploy -c tenants='["tenant-a","tenant-b"]'
```

**デプロイ中の処理**:
```
[1/3] Building Docker image for IngestWorker...
[2/3] Pushing image to ECR...
[3/3] Creating Lambda function...
```

### 3. デプロイ完了後の確認

デプロイ完了後、CloudFormation 出力 (`HttpApiUrl`, `UserPoolId`, `UserPoolClientId`, `TenantsTableName`) をメモします。

### 4. Cognito ユーザーの設定

Cognito にユーザーを作成し、`custom:tenant` 属性にテナント ID を設定します。

### 5. API のテスト

取得したトークンを `Authorization: Bearer <JWT>` として API Gateway に付与し、エンドポイントを呼び出します。

### Worker の更新デプロイ

Workerのコードや依存関係を変更した場合:

```sh
# 変更をコミット後
npm run deploy
```

CDKは自動的に以下を実行します:
1. Dockerイメージの再ビルド
2. 変更差分のみをECRにプッシュ（高速化）
3. Lambda関数の更新

## テナント運用

- 新しいテナントを追加する場合は、以下のように一覧を更新して再デプロイします:
  ```sh
  npm run cdk -- deploy -c tenants='["tenant-a","tenant-b"]'
  ```
- 既存テナントの S3 バケット名や DynamoDB テーブル名は Tenants テーブルから参照できます。
- テナントの削除やリソース解体を行う際は、関連するオブジェクト／レコードが存在しないことを確認し、以下でスタックを削除してください:
  ```sh
  npm run destroy
  ```

## トラブルシューティング

| 症状 | 確認ポイント |
| ---- | ------------ |
| オーソライザーで 401 | Cognito JWT の `aud` と User Pool クライアント ID が一致しているか、`custom:tenant` が登録済みかを確認 |
| ワーカーがエラー | CloudWatch Logs を確認し、必要に応じて DLQ のメッセージを調査 |
| テナント追加が反映されない | `tenants` コンテキストに新しいテナントを含めたか、スタックを再デプロイしたかを確認 |

## 参考

- AWS CDK v2 ドキュメント: <https://docs.aws.amazon.com/cdk/v2/guide/home.html>
- FastAPI ドキュメント: <https://fastapi.tiangolo.com/>
- AWS Lambda Powertools (観測性向上に役立つ): <https://awslabs.github.io/aws-lambda-powertools-python/latest/>

