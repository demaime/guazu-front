import { ClientThemeWrapper } from '@/components/ClientThemeWrapper';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ClientThemeWrapper>
          {children}
        </ClientThemeWrapper>
      </body>
    </html>
  );
} 