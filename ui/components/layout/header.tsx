'use client';

import Link from 'next/link';
import { FileText, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  // Don't show header on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            <FileText className="h-6 w-6" />
            Document Processing
          </Link>

          <div className="flex items-center gap-6">
            <nav className="flex gap-6">
              <Link
                href="/"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                ドキュメント
              </Link>
              <Link
                href="/templates"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                テンプレート
              </Link>
            </nav>

            {!loading && user && (
              <div className="flex items-center gap-4 border-l pl-6">
                <span className="text-sm text-muted-foreground">
                  {user.username}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
