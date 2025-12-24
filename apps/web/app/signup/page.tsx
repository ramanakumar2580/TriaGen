// apps/web/app/signup/page.tsx
import { Suspense } from "react";
import SignupForm from "./SignupClient";

export default function SignupPage() {
  return (
    // This allows Next.js to skip pre-rendering the search-param dependent parts
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">
          Preparing Account Setup...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
