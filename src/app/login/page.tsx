import { redirect } from "next/navigation";

import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: rawNext, error } = await searchParams;
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const session = await auth();
  if (session?.personId) {
    redirect(next);
  }

  // AccessDenied is what Auth.js reports when the backend refuses the email,
  // i.e. the account is not in GOOGLE_EMAIL_MAP.
  const denied = error === "AccessDenied";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">My Workspace</h1>
          <p className="text-sm text-muted-foreground">Sign in with your Google account</p>
        </div>

        {denied && (
          <p className="text-sm text-destructive text-center">
            That account isn&apos;t allowed to use this workspace.
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: next });
          }}
        >
          <Button type="submit" className="w-full">
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
