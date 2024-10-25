import { SignIn } from '@clerk/nextjs';

import { Container } from '@/components/layouts/container';

export default function SignInPage() {
  return (
    <Container size="sm">
      <div className="flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-8">Welcome Back</h1>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-slate-900 hover:bg-slate-800',
            },
          }}
        />
      </div>
    </Container>
  );
}
