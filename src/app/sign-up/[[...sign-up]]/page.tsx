import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { Setup } from "@/components/setup";
import { AuthFrame } from "@/components/auth-frame";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return (
      <Setup
        missing={["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]}
      />
    );
  return (
    <AuthFrame signingUp>
      <Suspense>
        <SignUp
          forceRedirectUrl="/app"
          signInForceRedirectUrl="/app"
          signInUrl="/sign-in"
        />
      </Suspense>
    </AuthFrame>
  );
}
