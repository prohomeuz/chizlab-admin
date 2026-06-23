import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  {
    to: '/materials',
    label: 'Materiallar',
    icon: (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"/>
      </svg>
    ),
  },
  {
    to: '/categories',
    label: 'Kategoriyalar',
    icon: (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
      </svg>
    ),
  },
];

export function Sidebar({ onClose }: SidebarProps) {
  const { logout } = useAuth();

  return (
    <aside
      data-surface="dark"
      className="flex flex-col h-full bg-primary w-[240px] relative overflow-hidden"
    >
      {/* Naqsh decorative — sidebar bottom */}
      <img
        src="/brand/naqsh.svg"
        alt=""
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full opacity-[0.08] pointer-events-none select-none"
      />

      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2">
        <NavLink to="/materials" onClick={onClose}>
          <img src="/brand/logo-white.svg" alt="Chizlab" width={100} height="auto" />
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-1" aria-label="Asosiy menyu">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-[150ms] ${
                isActive
                  ? 'bg-accent-muted text-accent border-l-[3px] border-accent pl-[9px]'
                  : 'text-text-onPrimary hover:bg-[rgba(255,255,246,0.06)]'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-[rgba(255,255,246,0.12)]">
        <button
          onClick={() => { void logout(); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-[rgba(255,255,246,0.6)] hover:bg-[rgba(255,255,246,0.06)] hover:text-text-onPrimary transition-colors duration-[150ms]"
          aria-label="Tizimdan chiqish"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 000-2H4V5h6a1 1 0 000-2H3zm11.293 4.293a1 1 0 011.414 1.414L13.414 10l2.293 2.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3z"
              clipRule="evenodd"
            />
          </svg>
          Chiqish
        </button>
      </div>
    </aside>
  );
}
