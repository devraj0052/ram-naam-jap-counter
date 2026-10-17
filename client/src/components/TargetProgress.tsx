import React, { useState } from 'react';
import { Target, Flame, Trophy, Edit3, Check } from 'lucide-react';
import { useJap } from '../context/JapContext';
import { useLanguage } from '../context/LanguageContext';

interface TargetProgressProps {
  onNavigate?: (page: string) => void;
}

export const TargetProgress: React.FC<TargetProgressProps> = ({ onNavigate }) => {
  const {
    todayCount,
    todayMalas,
    targetMalas,
    targetCount,
    setTargetMalas,
    currentStreak,
    longestStreak,
  } = useJap();

  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(targetMalas.toString());

  const progressPct = Math.min(100, Math.round((todayCount / targetCount) * 100));
  const isTargetAchieved = todayCount >= targetCount;

  const handleSaveTarget = () => {
    const parsed = parseInt(editVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setTargetMalas(parsed);
    }
    setIsEditing(false);
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm mt-4">
      {/* Target Title & Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-saffron-100 dark:bg-stone-800 text-saffron-600 dark:text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-stone-800 dark:text-stone-100">
              {t.dailyTarget}
            </h3>
            <p className="text-xs text-stone-500">
              {todayMalas} / {targetMalas} {t.targetMalas} ({todayCount.toLocaleString()} / {targetCount.toLocaleString()} counts)
            </p>
          </div>
        </div>

        {/* Edit Target Button */}
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="5000"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              className="w-16 px-2 py-1 text-xs border rounded-lg dark:bg-stone-800 dark:border-stone-700 dark:text-white"
            />
            <button
              onClick={handleSaveTarget}
              className="p-1.5 rounded-lg bg-saffron-600 text-white hover:bg-saffron-700"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditVal(targetMalas.toString());
              setIsEditing(true);
            }}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Edit Daily Target"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-3.5 overflow-hidden p-0.5 mb-2 relative">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isTargetAchieved
              ? 'bg-gradient-to-r from-emerald-500 to-green-600'
              : 'bg-gradient-to-r from-amber-400 to-saffron-600'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs font-medium text-stone-600 dark:text-stone-400 mb-4">
        <span>{progressPct}% Completed</span>
        {isTargetAchieved ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            🚩 {t.targetReached}
          </span>
        ) : (
          <span>{Math.max(0, targetCount - todayCount).toLocaleString()} more to goal</span>
        )}
      </div>

      {/* Streaks Banner */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
        <div
          onClick={() => onNavigate?.('history')}
          className={`flex items-center gap-2 bg-saffron-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-transparent transition-all ${
            onNavigate ? 'cursor-pointer hover:border-saffron-300 dark:hover:border-stone-700 hover:scale-[1.01]' : ''
          }`}
          title="Click to view daily streak history in audit log"
        >
          <Flame className="w-4 h-4 text-orange-500 shrink-0" />
          <div>
            <span className="text-stone-500 dark:text-stone-400 block text-[10px]">{t.dayStreak}</span>
            <span className="font-bold text-stone-800 dark:text-stone-100">{currentStreak} Days</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate?.('history')}
          className={`flex items-center gap-2 bg-amber-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-transparent transition-all ${
            onNavigate ? 'cursor-pointer hover:border-amber-300 dark:hover:border-stone-700 hover:scale-[1.01]' : ''
          }`}
          title="Click to view longest streak history in audit log"
        >
          <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <span className="text-stone-500 dark:text-stone-400 block text-[10px]">{t.longestStreak}</span>
            <span className="font-bold text-stone-800 dark:text-stone-100">{longestStreak} Days</span>
          </div>
        </div>
      </div>
    </div>
  );
};
