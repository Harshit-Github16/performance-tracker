"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background-color)]">
      <p className="text-[var(--text-color)] opacity-50">Redirecting to Login...</p>
    </div>
  );
}
