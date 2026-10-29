import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Amiri } from 'next/font/google';
import './globals.css';

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-quran',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ختمة | تنظيم قراءة وختمات القرآن الكريم الجماعية',
  description: 'تنظيم ختمات القرآن الكريم الجماعية ومتابعة الأجزاء وقراءتها مباشرة بالرسم العثماني وبدون تسجيل.',
  keywords: ['ختمة', 'قرآن كريم', 'ختمة جماعية', 'أجزاء القرآن', 'رسم عثماني', 'رمضان'],
  authors: [{ name: 'Khatma' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F2922',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexSansArabic.variable} ${amiri.variable}`}>
      <body className="bg-[#FBF8F3] text-[#0F2922] font-sans antialiased min-h-screen selection:bg-[#FDF6E7] selection:text-[#B48327]">
        {children}
      </body>
    </html>
  );
}
