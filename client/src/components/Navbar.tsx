import React from 'react';
import { Volume2, VolumeX, Moon, Sun, Flame, User, LogIn, LogOut, Home, History, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useJap } from '../context/JapContext';
import { useAuth } from '../context/AuthContext';
import { SyncBadge } from './SyncBadge';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { soundEnabled, toggleSound } = useJap();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-saffron-50/90 dark:bg-stone-950/90 border-b border-saffron-200/60 dark:border-stone-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-saffron-600 to-amber-500 flex items-center justify-center text-white font-sacred text-2xl font-bold shadow-md shadow-saffron-500/20 group-hover:scale-105 transition-transform">
            राम
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-tight text-saffron-950 dark:text-amber-100">
              {t.appTitle}
            </h1>
            <p className="text-[11px] text-saffron-700 dark:text-amber-300 font-sacred">
              {t.ramMantra}
            </p>
          </div>
        </div>

        {/* Center Desktop & Tablet Navigation */}
        <nav className="hidden sm:flex items-center gap-1 bg-saffron-100/70 dark:bg-stone-900/90 p-1 rounded-xl border border-saffron-200/80 dark:border-stone-800 shadow-sm">
          <button
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPage === 'home'
                ? 'bg-gradient-to-r from-saffron-600 to-amber-600 text-white shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:bg-saffron-200/60 dark:hover:bg-stone-800'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t.home}</span>
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPage === 'history'
                ? 'bg-gradient-to-r from-saffron-600 to-amber-600 text-white shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:bg-saffron-200/60 dark:hover:bg-stone-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t.history}</span>
          </button>

          <button
            onClick={() => onNavigate('darshan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPage === 'darshan'
                ? 'bg-gradient-to-r from-saffron-600 to-amber-600 text-white shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:bg-saffron-200/60 dark:hover:bg-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.darshan}</span>
          </button>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Cloud Sync Status Badge */}
          <SyncBadge />

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Chimes' : 'Unmute Chimes'}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-saffron-100 dark:hover:bg-stone-800 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-saffron-600 dark:text-saffron-400" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-saffron-100 dark:bg-stone-800 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-md transition-all ${
                language === 'en'
                  ? 'bg-white dark:bg-stone-700 text-saffron-700 dark:text-amber-200 shadow-sm font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('gu')}
              className={`px-2 py-1 rounded-md transition-all ${
                language === 'gu'
                  ? 'bg-white dark:bg-stone-700 text-saffron-700 dark:text-amber-200 shadow-sm font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              ગુજ
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2 py-1 rounded-md transition-all ${
                language === 'hi'
                  ? 'bg-white dark:bg-stone-700 text-saffron-700 dark:text-amber-200 shadow-sm font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              हिं
            </button>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'saffron' ? 'dark' : theme === 'dark' ? 'light' : 'saffron')}
            title={`Current Theme: ${theme}. Click to switch.`}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-saffron-100 dark:hover:bg-stone-800 transition-colors"
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-600" />
            ) : (
              <Flame className="w-4 h-4 text-saffron-600" />
            )}
          </button>

          {/* User / Profile Link & Logout */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onNavigate('profile')}
                title={user?.fullName || t.profile}
                className={`flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  currentPage === 'profile'
                    ? 'bg-saffron-600 text-white border-saffron-600'
                    : 'border-saffron-300 dark:border-stone-700 text-saffron-900 dark:text-amber-100 hover:bg-saffron-100 dark:hover:bg-stone-800'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-saffron-200 dark:bg-stone-700 text-saffron-800 dark:text-amber-200 flex items-center justify-center font-bold text-[10px]">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline truncate max-w-[80px]">{user?.fullName?.split(' ')[0]}</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  if (currentPage === 'profile') {
                    onNavigate('home');
                  }
                }}
                title={t.logout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-semibold transition-all active:scale-95 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="flex items-center gap-1 bg-gradient-to-r from-saffron-600 to-amber-600 hover:from-saffron-700 hover:to-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.login}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
