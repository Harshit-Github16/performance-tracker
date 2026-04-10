"use client";

import { useTheme } from "@/components/ThemeContext";

export default function DashboardPage() {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-700">
      <div className="text-center space-y-4">

      </div>
    </div>
  );
}
