import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { signIn } from '@/lib/auth';
import { Github, Mail } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex justify-center items-start md:items-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>
            以下の方法でログインしてください
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          <form
            action={async () => {
              'use server';
              await signIn('github', {
                redirectTo: '/'
              });
            }}
            className="w-full"
          >
            <Button className="w-full" variant="outline">
              <Github className="mr-2 h-4 w-4" />
              GitHubでログイン
            </Button>
          </form>
          <form
            action={async () => {
              'use server';
              await signIn('google', {
                redirectTo: '/'
              });
            }}
            className="w-full"
          >
            <Button className="w-full" variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Googleでログイン
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
