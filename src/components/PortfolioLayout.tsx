import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { Compass, Menu } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';

interface PortfolioLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const PortfolioLayout: React.FC<PortfolioLayoutProps> = ({
  title,
  subtitle,
  children,
}) => {
  const { settings, setDrawerOpen } = useAppState();
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el || settings.reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.36, ease: 'power2.out', clearProps: 'transform' },
      );
    }, mainRef);
    return () => ctx.revert();
  }, [location.pathname, settings.reducedMotion]);

  const topLinks = [
    { to: '/about', label: 'About' },
    { to: '/projects', label: 'Projects' },
    { to: '/skills', label: 'Skills' },
    { to: '/journey', label: 'Journey' },
    { to: '/services', label: 'Services' },
    { to: '/garage', label: 'Garage' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#26211E] flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#26211E] focus:text-[#FFF9F0] focus:text-sm focus:font-extrabold"
      >
        Skip to main content
      </a>

      {/* Shared Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#FFF9F0]/96 border-b border-[#D9C3A3] shadow-[0_1px_6px_rgba(38,33,30,0.05)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-2 sm:gap-5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open full route directory"
              className="ui-btn ui-btn-secondary w-9 h-9 p-0 shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <Link
              to="/"
              className="font-display text-2xl sm:text-3xl font-bold text-[#26211E] whitespace-nowrap truncate hover:text-[#EC6D2C] transition-colors"
            >
              SANJAYA&apos;S WORLD
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-[#61564E]">
            {topLinks.map((lnk) => {
              const active = location.pathname.startsWith(lnk.to);
              return (
                <Link
                  key={lnk.to}
                  to={lnk.to}
                  className={`whitespace-nowrap shrink-0 py-1 hover:text-[#26211E] transition-colors ${
                    active
                      ? 'text-[#26211E] underline decoration-2 decoration-[#EC6D2C] underline-offset-[6px]'
                      : ''
                  }`}
                >
                  {lnk.label}
                </Link>
              );
            })}
          </nav>

          <Link
            to="/?autostart=1"
            aria-label="Return to 3D World"
            className="ui-btn ui-btn-primary px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap shrink-0"
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">3D World</span>
            <span className="hidden sm:inline">Return to 3D World</span>
          </Link>
        </div>
      </header>

      {/* Editorial Hero Strip + Page Content */}
      <section className="bg-[#F5E9D4]/55 border-b border-[#E6D3B5]">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-9 sm:py-12">
          {subtitle && (
            <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#21968B] mb-1.5">
              {subtitle}
            </p>
          )}
          <h1 className="font-display text-5xl sm:text-7xl font-bold text-[#26211E] leading-[0.94] text-balance">
            {title}
          </h1>
        </div>
      </section>

      <main
        id="main-content"
        ref={mainRef}
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12"
      >
        {children}
      </main>

      <footer className="border-t border-[#E6D3B5] bg-[#F5E9D4]/65">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[#61564E]">
          <span>Sanjaya&apos;s World · Sanjaya Lakshan · Anuradhapura, Sri Lanka</span>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/classic" className="hover:text-[#26211E] transition-colors">Classic Mode</Link>
            <Link to="/achievements" className="hover:text-[#26211E] transition-colors">Achievements</Link>
            <Link to="/leaderboard" className="hover:text-[#26211E] transition-colors">Leaderboard</Link>
            <Link to="/whispers" className="hover:text-[#26211E] transition-colors">Whispers</Link>
            <Link to="/guide" className="hover:text-[#26211E] transition-colors">How to Play</Link>
            <Link to="/behind-the-scenes" className="hover:text-[#26211E] transition-colors">Behind the Scenes</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
