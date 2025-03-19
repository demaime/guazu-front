import './globals.css';

export const metadata = {
  title: 'Guazu 2.0',
  description: 'Guazu - Tu plataforma de aprendizaje',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
} 