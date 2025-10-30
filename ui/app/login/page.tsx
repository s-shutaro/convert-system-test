'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useAuth();

  // Debug: Check environment variables
  console.log('Cognito Config:', {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      console.log('Login result:', result);

      if (result.isSignedIn) {
        toast.success('ログインに成功しました');
        // Refresh user state in AuthContext
        await refreshUser();
        // Navigate to home page
        router.push('/');
        router.refresh();
      } else {
        toast.error('ログインに失敗しました。もう一度お試しください。');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      // より詳細なエラーメッセージを表示
      let errorMessage = 'ログインに失敗しました';

      if (error.name === 'UserNotFoundException') {
        errorMessage = 'ユーザーが見つかりません';
      } else if (error.name === 'NotAuthorizedException') {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'ユーザーが確認されていません';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold">ログイン</h2>
          <p className="mt-2 text-sm text-gray-600">
            Document Processing System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>
      </div>
    </div>
  );
}
