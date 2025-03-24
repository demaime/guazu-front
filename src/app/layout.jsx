import { ClientThemeWrapper } from '@/components/ClientThemeWrapper';
import { Mulish } from 'next/font/google';
import './globals.css';

const mulish = Mulish({ 
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={mulish.className}>
        <ClientThemeWrapper>
          {children}
        </ClientThemeWrapper>
      </body>
    </html>
  );
} 