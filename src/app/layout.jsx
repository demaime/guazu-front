import "./globals.css";
import "survey-core/survey-core.min.css";
import "react-toastify/dist/ReactToastify.css";
import { Mulish } from "next/font/google";
import { ClientThemeWrapper } from "@/components/ClientThemeWrapper";
import { ToastContainer } from "react-toastify";

const mulish = Mulish({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={mulish.className}>
        <ClientThemeWrapper>
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
