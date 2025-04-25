import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { users, db } from '@/lib/db';

export async function middleware(request: NextRequest) {
  const session = await auth();

  // 未認証の場合はログインページへ
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ユーザーのメールアドレスが存在する場合
  if (session.user.email && db) {
    // DBでユーザーを検索
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    // ユーザーがDBに存在しない場合は設定ページへリダイレクト
    if (dbUser.length === 0 && !request.nextUrl.pathname.startsWith('/settings')) {
      return NextResponse.redirect(new URL('/settings', request.url));
    }
  }

  return NextResponse.next();
}

// 保護するパスを指定
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/products/:path*',
    '/orders/:path*',
    '/customers/:path*'
  ]
};

