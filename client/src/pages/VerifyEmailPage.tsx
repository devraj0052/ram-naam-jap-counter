import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Sparkles, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

interface VerifyEmailPageProps {
  onNavigate: (page: string) => void;
  email?: string;
  initialMessage?: string;
  simulated?: boolean;
  devOtp?: string;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({
  onNavigate,
  email: initialEmail = '',
  initialMessage,
  simulated: initialSimulated = false,
  devOtp: initialDevOtp = '',
}) => {
  const { verifyEmail, resendVerification } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialDevOtp || '');
  const [message, setMessage] = useState<string | null>(initialMessage || null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [devOtp, setDevOtp] = useState<string>(initialDevOtp);
  const [isSimulated, setIsSimulated] = useState<boolean>(initialSimulated);
  const [smtpStatus, setSmtpStatus] = useState<any>(null);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (initialDevOtp) {
      setDevOtp(initialDevOtp);
      setIsSimulated(true);
      setCode(initialDevOtp);
    }
  }, [initialDevOtp]);

  // Load SMTP diagnostic status on mount
  useEffect(() => {
    api.getSmtpStatus()
      .then((res) => setSmtpStatus(res))
      .catch(() => {});
  }, []);

  // Check URL params for token & code verification link support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pEmail = params.get('email');
    const pCode = params.get('code');
    const pToken = params.get('token');

    if (pEmail) setEmail(pEmail);
    if (pCode) setCode(pCode);

    if (pEmail && (pCode || pToken)) {
      handleAutoVerify(pEmail, pCode || undefined, pToken || undefined);
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleAutoVerify = async (eVal: string, cVal?: string, tVal?: string) => {
    setLoading(true);
    setError(null);
    try {
      await verifyEmail(eVal, cVal, tVal);
      setMessage('Email verified successfully! Welcome to Shri Ram Naam Jap.');
      setTimeout(() => onNavigate('home'), 1200);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please enter the code manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      setError('Please provide both email and 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verifyEmail(email, code);
      setMessage('Email verified successfully! Welcome.');
      setTimeout(() => onNavigate('home'), 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please request a new code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email address is required to resend verification code.');
      return;
    }
    if (cooldown > 0) return;

    setResending(true);
    setError(null);
    try {
      const res = await resendVerification(email);
      setMessage(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
        setIsSimulated(true);
        setCode(res.devOtp);
      }
      setCooldown(60); // 60 second cooldown
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto pt-4 pb-24 sm:pb-8">
      <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-saffron-100 dark:bg-stone-800 flex items-center justify-center text-saffron-600 dark:text-amber-400 mb-3 shadow-sm">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-stone-900 dark:text-white">
            {t.verifyEmail}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {email ? (
              <>
                A 6-digit verification code was sent to <strong className="text-stone-800 dark:text-stone-200">{email}</strong>
              </>
            ) : (
              'Enter the 6-digit verification code sent to your email address.'
            )}
          </p>
        </div>

        {/* Development Mode Helper Banner */}
        {devOtp && isSimulated && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800 dark:text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Development Mode Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed mb-2 text-stone-600 dark:text-stone-300">
              SMTP is not configured in <code className="bg-amber-100 dark:bg-stone-800 px-1 py-0.5 rounded">backend/.env</code>. Your verification OTP code is:
            </p>
            <div className="flex items-center justify-between bg-white dark:bg-stone-800 p-2 rounded-xl border border-amber-200 dark:border-stone-700">
              <span className="font-mono text-base font-extrabold tracking-widest text-saffron-600 dark:text-amber-400">
                {devOtp}
              </span>
              <button
                type="button"
                onClick={() => setCode(devOtp)}
                className="text-[11px] font-bold text-saffron-700 dark:text-amber-300 underline hover:text-saffron-900"
              >
                Auto-fill Code
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-2">
              💡 To deliver real emails to your Gmail inbox, add your Gmail App Password to <code className="font-mono">.env</code>.
            </p>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {t.email}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {t.verificationCode}
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 582914"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-2xl tracking-[8px] font-mono text-center focus:outline-none focus:ring-2 focus:ring-saffron-500 font-bold shadow-inner"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length !== 6}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-saffron-600 to-amber-600 hover:from-saffron-700 hover:to-amber-700 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Verifying OTP...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Verify Account</span>
              </>
            )}
          </button>
        </form>

        {/* Resend Code with 60s cooldown */}
        <div className="mt-6 pt-5 border-t border-stone-100 dark:border-stone-800 text-center">
          <button
            type="button"
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            className="text-xs text-saffron-600 dark:text-amber-400 font-semibold hover:underline disabled:text-stone-400 disabled:no-underline flex items-center justify-center gap-1.5 mx-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? (
              <span>Resend code in {cooldown}s</span>
            ) : (
              <span>{t.resendCode}</span>
            )}
          </button>

          {/* Diagnostic SMTP Indicator */}
          {smtpStatus && (
            <p className="text-[10px] text-stone-400 mt-4">
              SMTP Provider: {smtpStatus.status.provider} • Real Delivery:{' '}
              <strong className={smtpStatus.status.isConfigured ? 'text-emerald-600' : 'text-amber-600'}>
                {smtpStatus.status.isConfigured ? 'Active' : 'Dev Simulator Mode'}
              </strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
