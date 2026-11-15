import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
const authenticate = clerkMiddleware(async (auth, req) => {
  if (
    req.nextUrl.pathname.startsWith("/app") ||
    req.nextUrl.pathname.startsWith("/onboarding")
  )
    await auth.protect();
});
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  )
    return NextResponse.next();
  return authenticate(req, event);
}
export const config = {
  matcher: [
    "/((?!_next|.well-known/workflow/|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api)(.*)",
  ],
};
