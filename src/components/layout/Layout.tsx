import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { HelpButton } from '@/components/home/HelpButton';

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export function Layout({ children, hideFooter }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      <HelpButton />
    </div>
  );
}