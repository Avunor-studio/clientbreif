import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { Setup } from "@/components/setup";
import { Brand } from "@/components/brand";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return (
      <Setup
        missing={["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]}
      />
    );
  return (
    <div className="auth-page">
      <Brand />
      <Suspense>
        <SignIn
          forceRedirectUrl="/app"
          signUpForceRedirectUrl="/app"
          signUpUrl="/sign-up"
        />
      </Suspense>
    </div>
  );
}
