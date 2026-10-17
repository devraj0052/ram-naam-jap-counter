import React from 'react';
import { Sparkles, Trophy, CheckCircle2, Flame, Award } from 'lucide-react';

interface CroreGoalProgressProps {
  currentCount: number;
}

const CRORE_TARGET = 10000000; // 1,00,00,000 (1 Crore) Ram Naam

const MILESTONES = [
  { count: 100000, label: '1 Lakh' },
  { count: 1000000, label: '10 Lakh' },
  { count: 2500000, label: '25 Lakh' },
  { count: 5000000, label: '50 Lakh' },
  { count: 10000000, label: '1 Crore' },
];

export const CroreGoalProgress: React.FC<CroreGoalProgressProps> = ({ currentCount }) => {
  const percentage = Math.min(100, (currentCount / CRORE_TARGET) * 100);
  const formattedPct = percentage < 0.01 && currentCount > 0 ? percentage.toFixed(4) : percentage.toFixed(2);
  const remaining = Math.max(0, CRORE_TARGET - currentCount);

  return (
    <div className="w-full bg-gradient-to-br from-amber-50 via-saffron-50/40 to-orange-50 dark:from-stone-900 dark:via-stone-900/90 dark:to-stone-950 border border-amber-200 dark:border-stone-800 rounded-3xl p-5 shadow-sm mb-6 relative overflow-hidden">
      {/* Sacred Decorative Background Ornament */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-saffron-400/10 dark:bg-amber-400/5 blur-xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-saffron-600 to-amber-500 text-white shadow-md shadow-saffron-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-stone-900 dark:text-white flex items-center gap-1.5">
              <span>1 Crore Ram Naam Mahayajna</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Sacred milestone target of 1,00,00,000 (10 Million) Ram Naam chants
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-extrabold text-saffron-700 dark:text-amber-300 bg-saffron-100 dark:bg-stone-800 px-3 py-1 rounded-full border border-saffron-300/50">
          {formattedPct}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-200/70 dark:bg-stone-800 rounded-full h-4 overflow-hidden p-0.5 relative mb-3 shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-saffron-500 to-orange-600 rounded-full transition-all duration-500 ease-out shadow-sm"
          style={{ width: `${Math.max(1, percentage)}%` }}
        />
      </div>

      {/* Count Details */}
      <div className="flex items-center justify-between text-xs mb-4">
        <div>
          <span className="text-stone-400 text-[10px] block">Completed So Far</span>
          <span className="font-heading font-bold text-saffron-700 dark:text-amber-300 text-sm">
            {currentCount.toLocaleString()}
          </span>
        </div>
        <div className="text-right">
          <span className="text-stone-400 text-[10px] block">Remaining to 1 Crore</span>
          <span className="font-mono font-bold text-stone-700 dark:text-stone-300 text-xs">
            {remaining.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Milestone Checkpoints */}
      <div className="border-t border-saffron-200/60 dark:border-stone-800 pt-3">
        <span className="text-[10px] font-semibold text-stone-400 block mb-2 uppercase tracking-wider">
          Mahayajna Milestones
        </span>
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {MILESTONES.map((m) => {
            const isReached = currentCount >= m.count;
            return (
              <div
                key={m.label}
                className={`p-1.5 rounded-xl border text-[10px] transition-all ${
                  isReached
                    ? 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-bold'
                    : 'bg-white/60 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex justify-center mb-0.5">
                  {isReached ? (
                    <CheckCircle2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Award className="w-3 h-3 text-stone-300 dark:text-stone-600" />
                  )}
                </div>
                <span className="block leading-tight">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
