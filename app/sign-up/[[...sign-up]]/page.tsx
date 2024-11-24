import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: 'bg-slate-900 hover:bg-slate-800',
          },
        }}
      />
    </div>
  );
}
