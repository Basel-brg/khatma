import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Amiri } from 'next/font/google';
import './globals.css';

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-arabic',
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri-quran',
  display: 'swap',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://khatma-a9e15.web.app';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'ختمة | تنظيم قراءة وختمات القرآن الكريم الجماعية',
  description: 'تنظيم ختمات القرآن الكريم الجماعية ومتابعة الأجزاء وقراءتها مباشرة بالرسم العثماني وبدون تسجيل.',
  keywords: ['ختمة', 'قرآن كريم', 'ختمة جماعية', 'أجزاء القرآن', 'رسم عثماني', 'رمضان'],
  authors: [{ name: 'Khatma' }],
  openGraph: {
    title: 'ختمة | تنظيم قراءة وختمات القرآن الكريم الجماعية',
    description: 'شارك الأجر واختم القرآن مع أهلك وأصحابك برابط واحد سهل ومباشر وبدون تسجيل.',
    url: appUrl,
    siteName: 'ختمة',
    images: [
      {
        url: `${appUrl}/og-image.png`,
        secureUrl: `${appUrl}/og-image.png`,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'تطبيق ختمة - تنظيم قراءة وختمات القرآن الكريم الجماعية',
      },
    ],
    locale: 'ar_SA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ختمة | تنظيم قراءة وختمات القرآن الكريم الجماعية',
    description: 'شارك الأجر واختم القرآن مع أهلك وأصحابك برابط واحد سهل ومباشر وبدون تسجيل.',
    images: [`${appUrl}/og-image.png`],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
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
      <body className="bg-[#FBF8F3] dark:bg-[#07120E] text-[#0F2922] dark:text-[#F4EFE6] font-sans antialiased min-h-screen selection:bg-[#FDF6E7] dark:selection:bg-[#B48327]/30 selection:text-[#B48327] dark:selection:text-[#FDE68A] transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
