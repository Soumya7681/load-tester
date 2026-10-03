import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { Nav } from '@/components/Nav';
import './globals.css';

const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'] });
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Load Tester', template: '%s · Load Tester' },
  description: 'Find how many concurrent users your site can handle before it slows down or fails.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} antialiased`}>
      <body className="min-h-dvh font-sans text-[15px] leading-relaxed">
        <Nav />
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
