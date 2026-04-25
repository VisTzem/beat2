import type { Metadata } from "next";
import { DotGothic16 } from "next/font/google";
import "./globals.css";

// 引入像素風格字體
const pixelFont = DotGothic16({ 
  weight: '400', 
  subsets: ["latin"] 
});

export const metadata: Metadata = {
  title: "原始部落 | 陣營對決",
  description: "迎新營隊即時積分系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${pixelFont.className} bg-stone-900 text-stone-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}