import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_INIT_SCRIPT } from "@/context/theme-context";

export const metadata: Metadata = {
  title: "Notes",
  description: "Personal notes and tasks",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Notes",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set the theme before first paint, so a dark-mode user does not get a
            flash of the light one while React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
