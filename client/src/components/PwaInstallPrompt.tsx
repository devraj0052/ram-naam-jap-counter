import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const PwaInstallPrompt: React.FC = () => {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(Boolean(standalone));

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for beforeinstallprompt event (Chrome, Android, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // If already installed or dismissed, don't show prompt banner
  if (isStandalone || dismissed) return null;

  return (
    <div className="w-full max-w-md bg-gradient-to-r from-saffron-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg mb-6 relative overflow-hidden">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-full bg-black/10 hover:bg-black/20 text-white/80 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md shrink-0">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-sm leading-snug">{t.installApp}</h4>
          <p className="text-xs text-white/90 mt-0.5 leading-relaxed">
            {t.installAppDesc}
          </p>

          {/* Android / Desktop Chrome Install */}
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="mt-3 flex items-center gap-1.5 bg-white text-saffron-800 font-bold text-xs px-4 py-2 rounded-xl shadow hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install PWA to Home Screen</span>
            </button>
          )}

          {/* Fallback Install Tip when deferredPrompt has not fired yet */}
          {!deferredPrompt && !isIos && (
            <div className="mt-2 text-[11px] bg-black/20 rounded-xl p-2 leading-relaxed flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Tip: Tap browser menu (⋮) & select "Add to Home screen" or "Install App"</span>
            </div>
          )}

          {/* iOS Safari Instructions */}
          {isIos && !deferredPrompt && (
            <div className="mt-2.5 text-[11px] bg-black/20 rounded-xl p-2.5 leading-relaxed">
              <span>On iOS Safari: Tap </span>
              <Share className="w-3.5 h-3.5 inline mx-1" />
              <span>Share below, then select </span>
              <span className="font-bold inline-flex items-center gap-0.5">
                <PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen
              </span>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
