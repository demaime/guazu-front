import "./globals.css";
import "survey-core/survey-core.min.css";
import { Mulish } from "next/font/google";
import { ClientThemeWrapper } from "@/components/ClientThemeWrapper";

const mulish = Mulish({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={mulish.className}>
        <ClientThemeWrapper>{children}</ClientThemeWrapper>
      </body>
    </html>
  );
}
