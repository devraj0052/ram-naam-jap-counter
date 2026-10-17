import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserPreferences } from '../types/shared';
import { api } from '../services/api';
import { syncEngine } from '../services/syncEngine';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  loading: boolean;
  guestCountToMigrate: number;
  login: (email: string, pass: string) => Promise<void>;
  register: (fullName: string, email: string, pass: string, confirm: string) => Promise<{ email: string; message: string; simulated?: boolean; devOtp?: string }>;
  verifyEmail: (email: string, code?: string, token?: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ message: string; simulated?: boolean; devOtp?: string }>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (email: string, newPass: string, code?: string, token?: string) => Promise<string>;
  changePassword: (cur: string, newPass: string) => Promise<string>;
  logout: () => Promise<void> | void;
  deleteAccount: (pass: string) => Promise<void>;
  dismissGuestMigration: () => void;
  confirmGuestMigration: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [guestCountToMigrate, setGuestCountToMigrate] = useState<number>(0);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    const existingToken = api.getToken();
    if (!existingToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setToken(existingToken);
      // Auto pull cloud state upon verified session
      syncEngine.pullAuthoritative();
    } catch (err) {
      console.warn('[AuthContext] Session invalid or expired:', err);
      api.setToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkForGuestData = () => {
    const guestData = syncEngine.getGuestData();
    if (guestData.lifetimeCount > 0) {
      setGuestCountToMigrate(guestData.lifetimeCount);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      api.setToken(res.token);
      setToken(res.token);
      setUser(res.user);

      checkForGuestData();
      await syncEngine.pullAuthoritative();
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, pass: string, confirm: string) => {
    setLoading(true);
    try {
      const res = await api.register({
        fullName,
        email,
        password: pass,
        confirmPassword: confirm,
      });
      return {
        email: res.email,
        message: res.message,
        simulated: res.simulated,
        devOtp: res.devOtp,
      };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (email: string, code?: string, tokenVal?: string) => {
    setLoading(true);
    try {
      const res = await api.verifyEmail({ email, code, token: tokenVal });
      api.setToken(res.token);
      setToken(res.token);
      setUser(res.user);

      checkForGuestData();
      await syncEngine.pullAuthoritative();
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async (email: string) => {
    const res = await api.resendVerification(email);
    return {
      message: res.message,
      simulated: res.simulated,
      devOtp: res.devOtp,
    };
  };

  const forgotPassword = async (email: string) => {
    const res = await api.forgotPassword(email);
    return res.message;
  };

  const resetPassword = async (email: string, newPass: string, code?: string, tokenVal?: string) => {
    const res = await api.resetPassword({ email, newPassword: newPass, code, token: tokenVal });
    return res.message;
  };

  const changePassword = async (cur: string, newPass: string) => {
    const res = await api.changePassword({ currentPassword: cur, newPassword: newPass });
    return res.message;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    api.setToken(null);
    setToken(null);
    setUser(null);
    setGuestCountToMigrate(0);
    syncEngine.handleLogout();
  };

  const deleteAccount = async (pass: string) => {
    await api.deleteAccount(pass);
    logout();
    syncEngine.clearGuestData();
  };

  const dismissGuestMigration = () => {
    setGuestCountToMigrate(0);
  };

  const confirmGuestMigration = async (): Promise<boolean> => {
    const success = await syncEngine.migrateGuestDataToAccount();
    if (success) {
      setGuestCountToMigrate(0);
      await refreshProfile();
    }
    return success;
  };

  const refreshProfile = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isVerified: Boolean(user?.isVerified),
        loading,
        guestCountToMigrate,
        login,
        register,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        changePassword,
        logout,
        deleteAccount,
        dismissGuestMigration,
        confirmGuestMigration,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
