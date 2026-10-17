import React from 'react';
import { History, Smartphone, Trophy, Flame, RefreshCw, Award, Sparkles } from 'lucide-react';
import { useJap } from '../context/JapContext';
import { useLanguage } from '../context/LanguageContext';
import { MonthlyJapChart } from '../components/MonthlyJapChart';
import { CroreGoalProgress } from '../components/CroreGoalProgress';
import { JapHistoryTimeline } from '../components/JapHistoryTimeline';

export const HistoryPage: React.FC = () => {
  const {
    sessions,
    lifetimeCount,
    totalMalas,
    currentStreak,
    longestStreak,
    syncNow,
    syncState,
  } = useJap();
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 sm:pb-12 animate-fade-in">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading font-bold text-2xl text-stone-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-saffron-600 dark:text-amber-400" />
            <span>{t.history}</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Complete daily audit log, interactive graphs, and 1 Crore Mahayajna tracking
          </p>
        </div>
        <button
          onClick={() => syncNow()}
          className="p-2.5 rounded-xl border border-saffron-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-saffron-50 dark:hover:bg-stone-800 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-saffron-600" />
          <span>{t.syncNow}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1 mb-0.5">
            <Award className="w-3.5 h-3.5 text-saffron-500" />
            <span>{t.lifetimeCount}</span>
          </span>
          <span className="font-heading text-xl font-bold text-saffron-600 dark:text-amber-400">
            {lifetimeCount.toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1 mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.totalMalas}</span>
          </span>
          <span className="font-heading text-xl font-bold text-stone-800 dark:text-stone-100">
            {totalMalas.toLocaleString()} 📿
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1 mb-0.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>{t.dayStreak}</span>
          </span>
          <span className="font-heading text-xl font-bold text-orange-500 flex items-center justify-center gap-1">
            {currentStreak} d
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1 mb-0.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.longestStreak}</span>
          </span>
          <span className="font-heading text-xl font-bold text-amber-500 flex items-center justify-center gap-1">
            {longestStreak} d
          </span>
        </div>
      </div>

      {/* 1. 1 Crore Ram Naam Mahayajna Goal Tracker */}
      <CroreGoalProgress currentCount={lifetimeCount} />

      {/* 2. Interactive Monthly & Yearly Graphs */}
      <MonthlyJapChart currentLifetime={lifetimeCount} />

      {/* 3. Granular Date and Time Chanting Audit Timeline with Search & Filters */}
      <div className="mb-6">
        <JapHistoryTimeline
          currentLifetime={lifetimeCount}
          onSync={syncNow}
          syncState={syncState}
        />
      </div>

      {/* 4. Cross-Device Chanting Sessions List */}
      <div className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-3xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100 mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-saffron-600" />
          <span>Cross-Device Chanting Sessions</span>
        </h3>
        {sessions.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {sessions.map((sess, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/80"
              >
                <div>
                  <span className="font-medium text-stone-700 dark:text-stone-200">
                    {sess.deviceName || 'Web Client'}
                  </span>
                  <span className="text-[10px] text-stone-400 block">
                    {new Date(sess.startTime).toLocaleString()}
                  </span>
                </div>
                <span className="font-bold text-saffron-600 dark:text-amber-400 font-mono">
                  +{sess.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 italic">
            Cross-device sessions automatically register here when you chant from multiple devices signed into your account.
          </p>
        )}
      </div>
    </div>
  );
};
