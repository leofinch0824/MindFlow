import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/daily-digest', label: 'Daily Digest' },
  { path: '/now', label: 'Now' },
  { path: '/interests', label: 'Interests' },
  { path: '/sources', label: 'Sources' },
  { path: '/settings', label: 'Settings' },
];

export default function TopNav() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-transparent">
      <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 xl:px-10">
        {/* Brand */}
        <div className="flex items-center gap-4 lg:gap-8">
          <Link to="/" className="font-serif italic text-2xl text-on-surface hover:text-primary transition-colors lg:hidden">
            MindFlow
          </Link>
          <nav className="hidden md:flex gap-4 lg:gap-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    text-sm font-sans transition-colors
                    ${isActive
                      ? 'text-primary font-bold border-b-2 border-primary pb-1'
                      : 'text-secondary hover:text-primary'
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          {/* Search (hidden on mobile) */}
          <div className="hidden sm:block relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Search insights..."
              className="w-[clamp(11rem,23vw,16rem)] rounded-lg border-none bg-surface-container-lowest py-2 pl-10 pr-4 text-sm ring-1 ring-outline/10 transition-all outline-none focus:ring-primary/20"
            />
          </div>

          {/* User avatar */}
          <button className="material-symbols-outlined text-primary text-3xl hover:scale-95 transition-transform">
            account_circle
          </button>
        </div>
      </div>
    </header>
  );
}
