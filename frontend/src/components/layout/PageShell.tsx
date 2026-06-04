import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showHero?: boolean;
}

export function PageShell({ children, title, description, showHero = true }: PageShellProps) {
  return (
    <div className="layout">
      <Header />
      <main>
        {showHero && title && (
          <section className="hero">
            <div className="container">
              <div className="hero-content">
                <h1>{title}</h1>
                {description && <p>{description}</p>}
              </div>
            </div>
          </section>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}
