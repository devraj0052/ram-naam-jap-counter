import React from 'react';
import { Home, History, User, Sparkles, LogIn } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface FooterNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const FooterNav: React.FC<FooterNavProps> = ({ currentPage, onNavigate }) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'history', label: t.history.split(' ')[0], icon: History },
    { id: 'darshan', label: t.darshan.split(' ')[0], icon: Sparkles },
    {
      id: isAuthenticated ? 'profile' : 'login',
      label: isAuthenticated ? t.profile.split(' ')[0] : t.login,
      icon: isAuthenticated ? User : LogIn,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-saffron-200 dark:border-stone-800 pb-safe pt-1 sm:hidden">
      <div className="max-w-md mx-auto grid grid-cols-4 h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || (item.id === 'login' && ['login', 'register', 'verify-email', 'forgot-password', 'reset-password'].includes(currentPage));

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive
                  ? 'text-saffron-600 dark:text-amber-400 font-bold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
