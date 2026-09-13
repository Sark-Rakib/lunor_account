import Providers from "@/components/providers";
import "./globals.css";

export const metadata = {
  title: {
    default: "LUNOR Business Manager",
    template: "%s | LUNOR Business Manager",
  },
  description:
    "Complete business management platform for LUNOR — sales, orders, inventory, accounting, reports and more.",
  applicationName: "LUNOR Business Manager",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f9",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
