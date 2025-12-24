// apps/web/app/login/page.tsx
import { Suspense } from "react";
import LoginForm from "./LoginClient";

export default function LoginPage() {
  return (
    // This allows the Docker build to pre-render the static shell of the page
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">
          Loading Auth...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
