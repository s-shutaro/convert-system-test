# Excelテンプレート使用ガイド

このシステムでは、Excelテンプレートを使用してスキルシートを自動生成できます。
テンプレートには変数プレースホルダーと繰り返しセクションを配置できます。

## 目次

- [基本的な変数置換](#基本的な変数置換)
- [繰り返しセクション（配列データの展開）](#繰り返しセクション配列データの展開)
- [JSONスキーマ](#jsonスキーマ)
- [テンプレート例](#テンプレート例)

---

## 基本的な変数置換

### 変数の記法

Excelセル内に `{{変数名}}` の形式で変数を記述します。

```excel
氏名: {{basic_info.name}}
年齢: {{basic_info.age}}
```

### ネストされたオブジェクトへのアクセス

ドット記法を使用して、ネストされたデータにアクセスできます。

```excel
{{basic_info.name}}          → "山田太郎"
{{basic_info.age}}           → "29歳"
{{period.start}}             → "2025年3月"
{{project.overview}}         → "【プロジェクト概要】..."
```

---

## 繰り返しセクション（配列データの展開）

配列データ（職務経歴など）を複数行に自動展開できます。

### マーカーの配置

#### 開始マーカー
```excel
{{#repeat:array_name}}
```

#### 終了マーカー
```excel
{{#end:array_name}}
```

### テンプレート構造

```
行N:    {{#repeat:work_experience}}
行N+1:  業務期間: {{period.start}} 〜 {{period.end}} {{period.duration}}
行N+2:  【プロジェクト概要】
行N+3:  {{project.overview}}
行N+4:  【実績・取り組み等】
行N+5:  {{project.responsibilities}}
...
行M:    {{#end:work_experience}}
```

### 動作

1. システムは `{{#repeat:work_experience}}` を検出
2. `work_experience` 配列の要素数を確認
3. マーカー間の行を配列の要素数分複製
4. 各複製行で変数を対応する配列要素の値に置換
5. マーカー行を削除

### 特殊変数

#### `{{index}}`
繰り返しセクション内で使用可能な連番（1始まり）

```excel
{{index}}  → 1, 2, 3, ...
```

### データがない場合

配列が空の場合、セクション全体（マーカー含む）が自動的に削除されます。

---

## JSONスキーマ

AIが抽出する構造化データのスキーマ：

```json
{
  "document_type": "skill_sheet",
  "created_date": "2025/9/1",
  "basic_info": {
    "furigana": "カキマン",
    "name": "K.J",
    "age": "29歳",
    "gender": "男",
    "experience_years": "3年9ヶ月",
    "nearest_station": "渋谷駅"
  },
  "qualifications": "Google Associate Cloud Engineer",
  "skills": {
    "machines": "Windows, Mac",
    "tools": "Python(Flask, Django, FastAPI), Vue.js, HTML/CSS"
  },
  "self_pr": "激務な業後25歳まで芸事をしつつ、アルバイトで生計を立てて...",
  "work_experience": [
    {
      "index": 1,
      "period": {
        "start": "2025年3月",
        "end": "2025年9月",
        "duration": "7ヶ月"
      },
      "project": {
        "overview": "【プロジェクト概要】\n消費者向け保険シミュレーション...",
        "responsibilities": "【実績・取り組み等】\n既存の申込み機能に新たな商品を追加..."
      },
      "role_phase": "役割・役職",
      "team_size": "4-5人規模のチームが3チーム",
      "phases": {
        "コンサル": "",
        "要件定義": "○",
        "基本設計": "○",
        "詳細設計": "○",
        "製造": "○",
        "構築": "",
        "テスト": "○",
        "運用保守": "○",
        "サポート": ""
      },
      "technologies": "Python(Django Rest Framework)\nVue.js\nAWS(Lambda, ECS, S3)\nCode Commit"
    },
    {
      "index": 2,
      "period": { ... },
      ...
    }
  ],
  "internal_development": [
    // work_experienceと同じ構造
  ]
}
```

---

## テンプレート例

### 例1: 基本情報セクション

```
| フリガナ | {{basic_info.furigana}} | 年齢 | {{basic_info.age}} | 性別 | {{basic_info.gender}} |
| 氏名     | {{basic_info.name}}     | 経験年数 | {{basic_info.experience_years}} | 最寄り駅 | {{basic_info.nearest_station}} |
```

### 例2: スキルセクション

```
保有資格: {{qualifications}}

機種/OS: {{skills.machines}}
言語/ツール: {{skills.tools}}
```

### 例3: 職務経歴セクション（繰り返し）

```
{{#repeat:work_experience}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
番号: {{index}}
業務期間: {{period.start}} 〜 {{period.end}}  {{period.duration}}

{{project.overview}}

{{project.responsibilities}}

役割・役職: {{role_phase}}
人数・規模: {{team_size}}

【担当工程】
コンサル: {{phases.コンサル}}
要件定義: {{phases.要件定義}}
基本設計: {{phases.基本設計}}
詳細設計: {{phases.詳細設計}}
製造: {{phases.製造}}
構築: {{phases.構築}}
テスト: {{phases.テスト}}
運用保守: {{phases.運用保守}}
サポート: {{phases.サポート}}

【環境・言語】
{{technologies}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{#end:work_experience}}
```

---

## 注意事項

### マーカー配置のベストプラクティス

1. **非表示列の使用を推奨**
   - A列などにマーカーを配置し、列を非表示にすると見た目がきれいです

2. **マーカー行は空行推奨**
   - マーカー以外の内容がない行に配置するのが安全です

3. **セル結合の考慮**
   - 繰り返しセクション内のセル結合は正しく複製されます
   - セクション外からセクション内へ跨るセル結合は避けてください

### トラブルシューティング

#### 変数が置換されない
- 変数名のスペルを確認
- JSONスキーマとのパスの一致を確認
- `{{` と `}}` の記述ミスがないか確認

#### 繰り返しセクションが動作しない
- マーカーのスペルを確認（`{{#repeat:...}}` と `{{#end:...}}`）
- 開始・終了マーカーの配列名が一致しているか確認
- マーカーがセル内で単独で記述されているか確認（他のテキストと混在させない）

#### セル結合が崩れる
- セル結合が繰り返しセクションの境界を跨いでいないか確認
- 複雑なセル結合は事前に検証を推奨

---

## サンプルテンプレート

`docs/samples/` ディレクトリにサンプルテンプレートを用意しています：

- `skill_sheet_template_with_markers.xlsx` - マーカー配置済みテンプレート

### サンプルテンプレートの再生成

サンプルテンプレートを再生成したい場合は、以下のスクリプトを実行してください：

```bash
python scripts/create_sample_template.py
```

このスクリプトは、以下の機能を持つExcelテンプレートを生成します：
- 基本情報セクション（フリガナ、氏名、年齢、性別等）
- 保有資格セクション
- 保有スキルセクション（機種/OS、言語/ツール）
- 自己PRセクション
- 現場経歴/研修セクション（繰り返しマーカー付き）
- 適切なセル結合とスタイリング

---

## 技術仕様

### 処理順序

1. テンプレートExcelファイルを読み込み
2. 各シートで繰り返しセクションマーカーを検索
3. 繰り返しセクションを下から順に処理（行番号のズレ防止）
4. 配列データを行複製で展開
5. 繰り返しセクション外の変数を置換
6. マーカー行を削除
7. 最終的なExcelファイルを出力

### 実装詳細

- **言語**: Python 3.11+
- **ライブラリ**: openpyxl
- **セル結合**: `openpyxl.worksheet.merge.MergedCell` で処理
- **スタイル複製**: `copy.copy()` で深いコピー

---

## 更新履歴

- **2025/10/28**: 初版作成、繰り返しセクション機能追加
