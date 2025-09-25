import { NextResponse } from "next/server";
import { createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

export default async function middleware(req) {
  // Import Clerk + Arcjet dynamically to avoid bloating the top-level bundle
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  const arcjet = (await import("@arcjet/next")).default;
  const { createMiddleware, detectBot, shield } = await import("@arcjet/next");

  // Setup Arcjet
  const aj = arcjet({
    key: process.env.ARCJET_KEY,
    rules: [
      shield({ mode: "LIVE" }),
      detectBot({
        mode: "LIVE",
        allow: ["CATEGORY:SEARCH_ENGINE", "GO_HTTP"], // Inngest + search engines
      }),
    ],
  });

  // Setup Clerk
  const clerk = clerkMiddleware(async (auth, req) => {
    const { userId, redirectToSignIn } = await auth();

    if (!userId && isProtectedRoute(req)) {
      return redirectToSignIn();
    }

    return NextResponse.next();
  });

  // Chain Arcjet first, then Clerk
  return createMiddleware(aj, clerk)(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
