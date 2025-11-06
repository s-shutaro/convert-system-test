/**
 * ジョブエラーメッセージをユーザーフレンドリーな日本語に変換
 */
export function getUserFriendlyErrorMessage(error: string | undefined | null): string {
  if (!error) {
    return '処理中にエラーが発生しました。';
  }

  const errorLower = error.toLowerCase();

  // OpenAI API関連のエラー
  if (errorLower.includes('rate limit')) {
    const waitMatch = error.match(/(\d+)\s*seconds?/i);
    if (waitMatch) {
      const seconds = parseInt(waitMatch[1]);
      if (seconds >= 60) {
        const minutes = Math.ceil(seconds / 60);
        return `AI処理の利用上限に達しました。${minutes}分後に再度お試しください。`;
      }
      return `AI処理の利用上限に達しました。${seconds}秒後に再度お試しください。`;
    }
    return 'AI処理の利用上限に達しました。しばらく待ってから再度お試しください。';
  }

  if (errorLower.includes('quota') || errorLower.includes('billing')) {
    return 'AI処理のクォータが不足しています。システム管理者にお問い合わせください。';
  }

  if (errorLower.includes('authentication') || errorLower.includes('api key')) {
    return 'AI処理の認証に失敗しました。システム管理者にお問い合わせください。';
  }

  if (errorLower.includes('timeout')) {
    return '処理がタイムアウトしました。もう一度お試しください。';
  }

  // PDF/ドキュメント関連のエラー
  if (errorLower.includes('pdf') && errorLower.includes('corrupt')) {
    return 'PDFファイルが破損しています。別のファイルをアップロードしてください。';
  }

  if (errorLower.includes('file not found') || errorLower.includes('document not found')) {
    return 'ファイルが見つかりませんでした。再度アップロードしてください。';
  }

  if (errorLower.includes('file size') || errorLower.includes('too large')) {
    return 'ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。';
  }

  // OCR/Vision関連のエラー
  if (errorLower.includes('textract')) {
    return 'テキスト抽出に失敗しました。別の抽出方式をお試しください。';
  }

  if (errorLower.includes('vision') && errorLower.includes('failed')) {
    return 'ビジョンAIでの解析に失敗しました。別の抽出方式をお試しください。';
  }

  // 構造化関連のエラー
  if (errorLower.includes('structure') || errorLower.includes('parsing')) {
    return 'データの構造化に失敗しました。PDFの内容が読み取れない可能性があります。';
  }

  // テンプレート関連のエラー
  if (errorLower.includes('template not found')) {
    return 'テンプレートが見つかりませんでした。テンプレートを再度選択してください。';
  }

  if (errorLower.includes('template') && errorLower.includes('invalid')) {
    return 'テンプレートの形式が正しくありません。テンプレートを確認してください。';
  }

  // 変換関連のエラー
  if (errorLower.includes('conversion') || errorLower.includes('convert')) {
    return 'Excel変換に失敗しました。構造化データを確認してください。';
  }

  // ネットワーク関連のエラー
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
  }

  // S3関連のエラー
  if (errorLower.includes('s3') || errorLower.includes('storage')) {
    return 'ファイルの保存に失敗しました。もう一度お試しください。';
  }

  // DynamoDB関連のエラー
  if (errorLower.includes('dynamodb') || errorLower.includes('database')) {
    return 'データベースエラーが発生しました。もう一度お試しください。';
  }

  // 権限関連のエラー
  if (errorLower.includes('permission') || errorLower.includes('access denied') || errorLower.includes('forbidden')) {
    return 'アクセス権限がありません。システム管理者にお問い合わせください。';
  }

  // その他の一般的なエラー
  if (errorLower.includes('invalid') || errorLower.includes('malformed')) {
    return '入力データの形式が正しくありません。内容を確認してください。';
  }

  // エラーメッセージが長すぎる場合は短縮
  if (error.length > 200) {
    return '処理中にエラーが発生しました。詳細はログをご確認ください。';
  }

  // デフォルト: 元のエラーメッセージを返す（英語の場合は前処理）
  return `エラー: ${error}`;
}

/**
 * ジョブステータスに応じたメッセージを取得
 */
export function getJobStatusMessage(status: string, step?: string): string {
  switch (status) {
    case 'queued':
      return '処理を開始します...';
    case 'running':
      if (step === 'ocr') return 'テキストを抽出しています...';
      if (step === 'vision') return 'PDFを解析しています...';
      if (step === 'ai_structure') return 'AIが構造化しています...';
      if (step === 'ai_vision_structure') return 'AIがPDFから構造化しています...';
      if (step === 'convert') return 'Excelに変換しています...';
      if (step === 'enhance') return '文章を改善しています...';
      if (step === 'summary') return '紹介文を生成しています...';
      return '処理中です...';
    case 'succeeded':
    case 'completed':
      return '処理が完了しました！';
    case 'failed':
      return '処理に失敗しました';
    default:
      return '処理中です...';
  }
}
