import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { JapProvider } from './context/JapContext';
import { Navbar } from './components/Navbar';
import { FooterNav } from './components/FooterNav';
import { GuestMigrationModal } from './components/GuestMigrationModal';

import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { DarshanPage } from './pages/DarshanPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';

export const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [navParams, setNavParams] = useState<any>({});

  // Detect URL query routing (e.g. /verify-email, /reset-password)
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path.includes('verify-email') || params.get('token') && !path.includes('reset')) {
      setCurrentPage('verify-email');
      setNavParams({
        email: params.get('email') || '',
        code: params.get('code') || '',
        token: params.get('token') || '',
      });
    } else if (path.includes('reset-password') || (params.get('token') && path.includes('reset'))) {
      setCurrentPage('reset-password');
      setNavParams({
        email: params.get('email') || '',
        code: params.get('code') || '',
        token: params.get('token') || '',
      });
    }
  }, []);

  const navigate = (page: string, params: any = {}) => {
    setCurrentPage(page);
    setNavParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={navigate} />;
      case 'history':
        return <HistoryPage />;
      case 'darshan':
        return <DarshanPage />;
      case 'login':
        return <LoginPage onNavigate={navigate} />;
      case 'register':
        return <RegisterPage onNavigate={navigate} />;
      case 'verify-email':
        return (
          <VerifyEmailPage
            onNavigate={navigate}
            email={navParams.email}
            initialMessage={navParams.message}
            simulated={navParams.simulated}
            devOtp={navParams.devOtp}
          />
        );
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={navigate} />;
      case 'reset-password':
        return <ResetPasswordPage onNavigate={navigate} email={navParams.email} />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-saffron-50/40 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <Navbar onNavigate={navigate} currentPage={currentPage} />
      
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {renderPage()}
      </main>

      <GuestMigrationModal />
      <FooterNav currentPage={currentPage} onNavigate={navigate} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <JapProvider>
            <AppContent />
          </JapProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
