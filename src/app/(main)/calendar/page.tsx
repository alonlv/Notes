"use client";

import { CalendarDays } from "lucide-react";
import { CalendarPanel } from "@/components/admin/CalendarPanel";

export default function CalendarConnectionsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Calendar</h1>
      </div>
      <CalendarPanel />
    </div>
  );
}
