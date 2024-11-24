import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: 'bg-slate-900 hover:bg-slate-800',
          },
        }}
      />
    </div>
  );
}
