import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { Setup } from "@/components/setup";
import { AuthFrame } from "@/components/auth-frame";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return (
      <Setup
        missing={["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]}
      />
    );
  return (
    <AuthFrame>
      <Suspense>
        <SignIn
          forceRedirectUrl="/app"
          signUpForceRedirectUrl="/app"
          signUpUrl="/sign-up"
        />
      </Suspense>
    </AuthFrame>
  );
}
