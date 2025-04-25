import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import Link from 'next/link';

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex justify-center items-start md:items-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">エラーが発生しました</CardTitle>
          <CardDescription>
            認証中にエラーが発生しました。もう一度お試しください。
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button className="w-full">ログインページに戻る</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 