// apps/web/app/dashboard/page.tsx
import { Suspense } from "react";
import Dashboard from "./DashboardClient";

export default function Page() {
  return (
    // This Suspense boundary allows Next.js to build the page successfully
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">
          Initializing Command Center...
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
