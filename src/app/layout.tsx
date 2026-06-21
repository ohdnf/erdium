import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erdium",
  description: "Visualize, explore, and improve your database schema.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
