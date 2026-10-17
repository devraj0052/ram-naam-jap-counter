import React, { useState } from 'react';
import {
  User,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Target,
  Globe,
  Palette,
  Cloud,
  Lock,
  Download,
  Upload,
  Trash2,
  LogOut,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useJap } from '../context/JapContext';
import { api } from '../services/api';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, isVerified, logout, changePassword, deleteAccount } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const {
    targetMalas,
    setTargetMalas,
    syncState,
    lastSyncedAt,
    syncNow,
    applyImportedState,
    lifetimeCount,
  } = useJap();

  // Modals & form state
  const [showChangePass, setShowChangePass] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePass, setDeletePass] = useState('');
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [smtpInfo, setSmtpInfo] = useState<any>(null);

  React.useEffect(() => {
    api.getSmtpStatus().then(setSmtpInfo).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto pt-8 text-center">
        <p className="text-sm text-stone-500 mb-4">Please log in to view your profile.</p>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-2 rounded-xl bg-saffron-600 text-white font-bold text-sm shadow hover:bg-saffron-700"
        >
          {t.login}
        </button>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErr(null);
    setPassMsg(null);
    setPassLoading(true);
    try {
      const msg = await changePassword(currentPassword, newPassword);
      setPassMsg(msg);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setShowChangePass(false), 1500);
    } catch (err: any) {
      setPassErr(err.message || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePass) {
      setDeleteErr('Please enter your password to confirm account deletion.');
      return;
    }
    setDeleteErr(null);
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePass);
      onNavigate('home');
    } catch (err: any) {
      setDeleteErr(err.message || 'Incorrect password. Account deletion aborted.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const data = await api.exportData();

      // Download JSON backup
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `ramjap_backup_${new Date().toISOString().slice(0, 10)}.json`;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // Also download legacy compatible .txt file if available
      if (data.legacyBackupFormat) {
        setTimeout(() => {
          const txtBlob = new Blob([data.legacyBackupFormat], { type: 'text/plain' });
          const txtUrl = URL.createObjectURL(txtBlob);
          const txtLink = document.createElement('a');
          txtLink.href = txtUrl;
          txtLink.download = `ramjap_backup_${new Date().toISOString().slice(0, 10)}.txt`;
          txtLink.click();
          URL.revokeObjectURL(txtUrl);
        }, 300);
      }
    } catch (err: any) {
      alert('Failed to export data: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportStatus(null);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let res;

        if (text.includes('~#@@#~')) {
          // Legacy format
          res = await api.importData({ legacyString: text });
        } else {
          // Standard JSON format
          res = await api.importData({ jsonString: text });
        }

        applyImportedState(res);
        setImportStatus(res.message);
      } catch (err: any) {
        setImportStatus('Error: ' + (err.message || 'Failed to parse backup'));
      } finally {
        setImportLoading(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto pb-24 sm:pb-8">
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-saffron-600 to-amber-500 text-white font-heading font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-saffron-500/20">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-stone-900 dark:text-white">
                {user.fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <button
                    onClick={() => onNavigate('verify-email')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:underline"
                  >
                    Verify Email
                  </button>
                )}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                Joined: {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              onNavigate('home');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            title={t.logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </div>

      {/* Account Settings List */}
      <div className="space-y-4">
        {/* Cloud Sync Status */}
        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-saffron-100 dark:bg-stone-800 text-saffron-600 dark:text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-xs text-stone-800 dark:text-stone-100 block">
                Cloud Sync Status: <span className="capitalize font-bold text-saffron-600">{syncState}</span>
              </span>
              <span className="text-[11px] text-stone-400">
                {lastSyncedAt ? `${t.lastSynced}: ${new Date(lastSyncedAt).toLocaleString()}` : 'Connected to cloud'}
              </span>
            </div>
          </div>
          <button
            onClick={() => syncNow()}
            className="px-3 py-1.5 rounded-xl border border-saffron-300 dark:border-stone-700 text-xs font-semibold text-saffron-700 dark:text-amber-300 hover:bg-saffron-50 dark:hover:bg-stone-800 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.syncNow}</span>
          </button>
        </div>

        {/* Daily Target Setting */}
        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-stone-800 text-amber-600 dark:text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-xs text-stone-800 dark:text-stone-100 block">
                {t.dailyTarget}
              </span>
              <span className="text-[11px] text-stone-400">
                {targetMalas} malas ({targetMalas * 108} Ram Naam)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTargetMalas(Math.max(1, targetMalas - 10))}
              className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold"
            >
              -
            </button>
            <span className="w-12 text-center text-xs font-bold font-mono">{targetMalas}</span>
            <button
              onClick={() => setTargetMalas(targetMalas + 10)}
              className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Language Preference */}
        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-stone-800 text-blue-600 dark:text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-xs text-stone-800 dark:text-stone-100 block">
                {t.language}
              </span>
              <span className="text-[11px] text-stone-400">
                {language === 'en' ? 'English' : language === 'gu' ? 'ગુજરાતી' : 'हिन्दी'}
              </span>
            </div>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200"
          >
            <option value="en">English</option>
            <option value="gu">ગુજરાતી</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>

        {/* Theme Preference */}
        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-stone-800 text-orange-600 dark:text-orange-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-xs text-stone-800 dark:text-stone-100 block">
                {t.theme}
              </span>
              <span className="text-[11px] text-stone-400 capitalize">{theme} Devotion</span>
            </div>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200 capitalize"
          >
            <option value="saffron">{t.saffronTheme}</option>
            <option value="dark">{t.darkTheme}</option>
            <option value="light">{t.lightTheme}</option>
          </select>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-stone-800 text-purple-600 dark:text-purple-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-xs text-stone-800 dark:text-stone-100 block">
                  {t.changePassword}
                </span>
                <span className="text-[11px] text-stone-400">
                  Update your authentication credentials
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowChangePass(!showChangePass)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              {showChangePass ? 'Close' : 'Change'}
            </button>
          </div>

          {showChangePass && (
            <form onSubmit={handleChangePassword} className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 space-y-3">
              {passMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                  {passMsg}
                </div>
              )}
              {passErr && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium">
                  {passErr}
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  {t.currentPassword}
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-stone-800 dark:border-stone-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  {t.newPassword}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-stone-800 dark:border-stone-700"
                />
              </div>
              <button
                type="submit"
                disabled={passLoading}
                className="w-full py-2 rounded-xl bg-saffron-600 text-white font-bold text-xs shadow hover:bg-saffron-700 transition-all"
              >
                {passLoading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}
        </div>

        {/* Email & SMTP Diagnostics */}
        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-stone-800 text-amber-600 dark:text-amber-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-stone-800 dark:text-stone-100 block">
                    Email Delivery & SMTP Service
                  </span>
                  {smtpInfo && (
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        smtpInfo.status.isConfigured
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {smtpInfo.status.isConfigured ? 'Live SMTP Active' : 'Dev Simulator Mode'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-stone-400">
                  Verify your SMTP setup or dispatch a live test OTP
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await api.testSmtp(user.email);
                  alert(res.message);
                } catch (e: any) {
                  alert(e.message || 'SMTP test failed');
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-saffron-300 dark:border-stone-700 bg-saffron-50 dark:bg-stone-800 text-saffron-700 dark:text-amber-300 text-xs font-semibold hover:bg-saffron-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Test Email</span>
            </button>
          </div>
          <p className="text-[11px] text-stone-500">
            To receive live OTPs directly in Gmail, configure <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-saffron-700 font-mono">SMTP_USER</code> and your 16-character Google App Password in <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-saffron-700 font-mono">backend/.env</code>.
          </p>
        </div>

        {/* Data Backup & Restore */}
        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm">
          <h4 className="font-semibold text-xs text-stone-800 dark:text-stone-100 mb-2">
            Data Portability & Backup
          </h4>
          <p className="text-[11px] text-stone-500 mb-4">
            Export all your cloud records or import from an existing backup (supports modern JSON and your legacy .txt backup).
          </p>

          {importStatus && (
            <div className="mb-3 p-2.5 rounded-lg bg-saffron-50 dark:bg-stone-800 text-saffron-700 dark:text-amber-300 text-xs font-medium">
              {importStatus}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportData}
              disabled={exportLoading}
              className="py-2.5 px-3 rounded-xl border border-saffron-300 dark:border-stone-700 bg-saffron-50/50 dark:bg-stone-800/50 hover:bg-saffron-100 text-saffron-800 dark:text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportLoading ? 'Exporting...' : 'Export Backup'}</span>
            </button>

            <label className="py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 text-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>{importLoading ? 'Importing...' : 'Restore File'}</span>
              <input
                type="file"
                accept=".json,.txt,.bk"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Log Out Option */}
        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-xs text-stone-800 dark:text-stone-100 block">
                {t.logout}
              </span>
              <span className="text-[11px] text-stone-400">
                Safely sign out of your account on this device
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              onNavigate('home');
            }}
            className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.logout}</span>
          </button>
        </div>

        {/* Delete Account */}
        <div className="bg-red-50/40 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-red-700 dark:text-red-400 block">
                  {t.deleteAccount}
                </span>
                <span className="text-[11px] text-red-600/80 dark:text-red-400/80">
                  Permanently erase your account, sessions, and cloud data
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow hover:bg-red-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-stone-900 border border-red-300 dark:border-red-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  {t.deleteAccount}
                </h3>
                <p className="text-xs text-red-600 font-semibold">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 mb-4 leading-relaxed">
              {t.deleteWarning} To proceed, please enter your password below to confirm your identity.
            </p>

            {deleteErr && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium">
                {deleteErr}
              </div>
            )}

            <input
              type="password"
              value={deletePass}
              onChange={(e) => setDeletePass(e.target.value)}
              placeholder="Enter your account password"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm mb-4 focus:ring-2 focus:ring-red-500"
            />

            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow hover:bg-red-700 transition-colors"
              >
                {deleteLoading ? 'Deleting Account...' : t.confirmDelete}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
