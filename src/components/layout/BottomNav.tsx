"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_NAV, isActive } from "@/lib/nav";
import { useTheme } from "@/context/theme-context";
import { useLogout } from "@/hooks/use-logout";

const ITEM = "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium min-w-[3.5rem]";

export function BottomNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const logout = useLogout();

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
      <button onClick={toggleTheme} className={cn(ITEM, "text-muted-foreground")}>
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        Theme
      </button>
      <button onClick={logout} className={cn(ITEM, "text-muted-foreground")}>
        <LogOut className="h-5 w-5" />
        Out
      </button>
    </nav>
  );
}
