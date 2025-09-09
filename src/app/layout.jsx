import "./globals.css";
import "survey-core/survey-core.css";
import "react-toastify/dist/ReactToastify.css";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light.css";
import { Mulish } from "next/font/google";
import { ClientThemeWrapper } from "@/components/ClientThemeWrapper";
import { ToastContainer } from "react-toastify";
import Script from "next/script";
import AnalyticsProvider from "@/components/AnalyticsProvider";

const mulish = Mulish({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Guazu App",
  description: "Descarga Guazú para responder encuestas en el momento!",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Guazu App",
    description: "Descarga Guazú para responder encuestas en el momento!",
    images: [
      {
        url: "/logo-squarel.png",
        alt: "Guazu App Logo",
      },
    ],
    type: "website",
    url: "https://guazu2.vercel.app",
  },
  twitter: {
    card: "summary",
    title: "Guazu App",
    description: "Descarga Guazú para responder encuestas en el momento!",
    images: ["/logo-solo.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo-mini.png" />
        <meta name="theme-color" content="#3f51b5" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2ZV4LVXFNY"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2ZV4LVXFNY');
          `}
        </Script>
      </head>
      <body className={mulish.className}>
        <ClientThemeWrapper>
          <AnalyticsProvider />
          {children}
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </ClientThemeWrapper>
      </body>
    </html>
  );
}
