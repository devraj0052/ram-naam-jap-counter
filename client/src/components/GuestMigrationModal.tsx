import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const GuestMigrationModal: React.FC = () => {
  const { guestCountToMigrate, confirmGuestMigration, dismissGuestMigration } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  if (guestCountToMigrate <= 0) return null;

  const handleMerge = async () => {
    setLoading(true);
    try {
      await confirmGuestMigration();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-stone-900 border border-saffron-300 dark:border-stone-700 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
        <button
          onClick={dismissGuestMigration}
          className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-saffron-100 dark:bg-stone-800 text-saffron-600 dark:text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-stone-900 dark:text-white">
              {t.guestMergeTitle}
            </h3>
            <p className="text-xs text-stone-500">{t.guestMergeDesc}</p>
          </div>
        </div>

        {/* Data Preview Card */}
        <div className="bg-saffron-50 dark:bg-stone-800/80 border border-saffron-200 dark:border-stone-700 rounded-2xl p-4 my-4 text-center">
          <span className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
            Offline Guest Jap Count
          </span>
          <span className="font-heading text-3xl font-extrabold text-saffron-600 dark:text-amber-400">
            {guestCountToMigrate.toLocaleString()}
          </span>
          <span className="text-xs text-stone-500 block mt-1">
            (~{Math.floor(guestCountToMigrate / 108)} Malas)
          </span>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-300 mb-6 leading-relaxed">
          Merging will safely sync these repetitions into your verified cloud account without duplicating or overwriting existing history.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleMerge}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-saffron-600 to-amber-600 text-white font-bold text-sm shadow-md hover:from-saffron-700 hover:to-amber-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Syncing to Cloud...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.mergeData}</span>
              </>
            )}
          </button>

          <button
            onClick={dismissGuestMigration}
            className="w-full py-2.5 px-4 rounded-xl text-stone-500 dark:text-stone-400 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            {t.keepCloudOnly}
          </button>
        </div>
      </div>
    </div>
  );
};
