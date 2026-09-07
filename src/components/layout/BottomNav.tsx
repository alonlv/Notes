"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ALL_NAV, isActive } from "@/lib/nav";

const ITEM = "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium min-w-[3.5rem]";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background overflow-x-auto">
      {ALL_NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            ITEM,
            "transition-colors",
            isActive(href, pathname) ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
