import { SignInConfirm } from "@/components/SignInConfirm";

export const metadata = { title: "Sign in", robots: { index: false } };

export default async function SignIn({ params }: { params: Promise<{ token: string }> }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <SignInConfirm token={(await params).token} />
    </div>
  );
}
