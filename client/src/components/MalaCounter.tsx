import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Hand, Sparkles, CheckCircle2, History, ArrowRight } from 'lucide-react';
import { useJap } from '../context/JapContext';
import { useLanguage } from '../context/LanguageContext';

interface MalaCounterProps {
  onNavigate?: (page: string) => void;
}

export const MalaCounter: React.FC<MalaCounterProps> = ({ onNavigate }) => {
  const {
    lifetimeCount,
    todayCount,
    currentBead,
    todayMalas,
    totalMalas,
    incrementCount,
    selectedDarshanId,
  } = useJap();

  const { language, t } = useLanguage();
  const [mode, setMode] = useState<'tap' | 'likhit'>('tap');
  const [likhitInput, setLikhitInput] = useState('');
  const [writtenNames, setWrittenNames] = useState<string[]>([]);
  const [isTapping, setIsTapping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mantras according to language
  const ramDisplay = language === 'gu' ? 'શ્રી રામ' : language === 'hi' ? 'श्री राम' : 'Shri Ram';
  const lastTapRef = useRef<number>(0);

  const handleTap = () => {
    const now = Date.now();
    // Prevent accidental hardware bounce or double-click jitter under 75ms
    if (now - lastTapRef.current < 75) {
      return;
    }
    lastTapRef.current = now;
    setIsTapping(true);
    incrementCount(1);
    setTimeout(() => setIsTapping(false), 150);
  };

  const handleLikhitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLikhitInput(val);

    const normalized = val.trim().toLowerCase();
    if (
      normalized === 'ram' ||
      normalized === 'shri ram' ||
      val.trim() === 'राम' ||
      val.trim() === 'श्री राम' ||
      val.trim() === 'રામ' ||
      val.trim() === 'શ્રી રામ'
    ) {
      incrementCount(1);
      setWrittenNames((prev) => [ramDisplay, ...prev.slice(0, 15)]);
      setLikhitInput('');
    }
  };

  // Keyboard shortcut: Spacebar or Enter to count when in tap mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'tap' && (e.code === 'Space' || e.key === 'Enter')) {
        // Prevent default spacebar scrolling
        if (e.target === document.body || (e.target as HTMLElement).tagName === 'BUTTON') {
          e.preventDefault();
          handleTap();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Mode Switcher */}
      <div className="flex items-center gap-1 bg-saffron-100 dark:bg-stone-800 p-1 rounded-full text-xs font-semibold mb-6 shadow-inner">
        <button
          onClick={() => setMode('tap')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
            mode === 'tap'
              ? 'bg-gradient-to-r from-saffron-600 to-amber-600 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
          <span>{t.tapJapMode}</span>
        </button>
        <button
          onClick={() => {
            setMode('likhit');
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
            mode === 'likhit'
              ? 'bg-gradient-to-r from-saffron-600 to-amber-600 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>{t.likhitJapMode}</span>
        </button>
      </div>

      {/* Mala & Bead Progress Header */}
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-saffron-500 animate-pulse" />
            <span>
              {t.malaProgress}: <strong className="text-saffron-700 dark:text-amber-300 text-sm">{currentBead} / 108</strong>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-stone-500">{t.todayMalas}:</span>
            <span className="text-saffron-600 dark:text-amber-400 font-bold text-sm bg-saffron-50 dark:bg-stone-800 px-2 py-0.5 rounded-md">
              {todayMalas} 📿
            </span>
          </div>
        </div>

        {/* 108 Mala Beads Mini-Bar */}
        <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-3 overflow-hidden p-0.5 relative">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-saffron-500 to-orange-600 rounded-full transition-all duration-150"
            style={{ width: `${(currentBead / 108) * 100}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-stone-500 dark:text-stone-400 mt-1.5 px-0.5">
          <span>0 (Start)</span>
          <span className="font-semibold text-saffron-600">Sumeru / Meru (108)</span>
          <span>
            {108 - currentBead} {t.beadCount} remaining
          </span>
        </div>
      </div>

      {/* Main Counting Area */}
      {mode === 'tap' ? (
        <div className="relative flex flex-col items-center justify-center my-2">
          {/* Decorative Outer Aura */}
          <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-saffron-500/20 to-amber-400/20 blur-2xl -z-10 animate-pulse" />

          {/* Big Circular Sacred Tap Button */}
          <button
            onClick={handleTap}
            className={`w-64 h-64 sm:w-72 sm:h-72 select-none touch-manipulation cursor-pointer rounded-full bg-gradient-to-b from-saffron-500 via-saffron-600 to-amber-700 text-white shadow-2xl sacred-glow border-4 border-amber-300/80 flex flex-col items-center justify-center relative overflow-hidden transition-all transform active:scale-95 ${
              isTapping ? 'animate-ram-tap scale-95' : 'hover:scale-[1.02]'
            }`}
            style={{
              backgroundImage: `radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25) 0%, rgba(0,0,0,0.15) 100%)`,
            }}
          >
            {/* Sacred Darshan Backdrop Icon / Image */}
            <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay">
              <img
                src={`/assets/ram/darshan_${selectedDarshanId}.png`}
                alt="Shri Ram"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <span className="text-xs uppercase tracking-widest text-amber-200/90 font-medium mb-1">
              {t.ramMantra}
            </span>
            <span className="font-sacred text-5xl sm:text-6xl font-extrabold tracking-wide drop-shadow-md py-2">
              {ramDisplay}
            </span>
            <span className="text-xs text-amber-100/90 font-medium tracking-wide mt-1">
              {t.tapToCount}
            </span>

            {/* Current Bead Floating Badge */}
            <div className="mt-3 bg-black/30 backdrop-blur-sm border border-amber-300/40 px-3 py-1 rounded-full text-xs font-mono font-bold text-amber-200">
              Bead #{currentBead === 0 ? 108 : currentBead}
            </div>
          </button>
        </div>
      ) : (
        /* Likhit Jap Mode */
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-full bg-amber-50 dark:bg-stone-900/90 border-2 border-dashed border-saffron-300 dark:border-stone-700 rounded-2xl p-6 text-center shadow-sm relative min-h-[220px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-center gap-1.5 text-saffron-700 dark:text-amber-300 font-sacred text-lg mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{t.likhitJapMode}</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                Type "Ram" or "राम" or "રામ" below. Each submission increments your sacred count.
              </p>

              {/* Animated Stream of Written Names */}
              <div className="flex flex-wrap gap-2 justify-center mb-4 min-h-[50px] overflow-hidden">
                {writtenNames.map((name, i) => (
                  <span
                    key={i}
                    className="font-sacred text-sm font-bold text-saffron-600 dark:text-amber-300 bg-saffron-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-full animate-fade-in"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={likhitInput}
              onChange={handleLikhitChange}
              placeholder={t.typeRamPlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-saffron-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 font-sacred text-lg text-center focus:outline-none focus:ring-2 focus:ring-saffron-500 shadow-inner"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Summary Counters Bar */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 mt-6">
        <div
          onClick={() => onNavigate?.('history')}
          className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 text-center shadow-sm cursor-pointer hover:border-saffron-400 dark:hover:border-stone-700 transition-all hover:scale-[1.01] group"
          title="Click to view chanting history and graphs"
        >
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium block mb-1 group-hover:text-saffron-600 transition-colors">
            {t.todayCount}
          </span>
          <span className="font-heading text-2xl sm:text-3xl font-bold text-saffron-600 dark:text-amber-400">
            {todayCount.toLocaleString()}
          </span>
          <span className="text-[11px] text-stone-400 block mt-0.5">
            ({todayMalas} malas + {currentBead} beads)
          </span>
        </div>

        <div
          onClick={() => onNavigate?.('history')}
          className="bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-2xl p-4 text-center shadow-sm cursor-pointer hover:border-saffron-400 dark:hover:border-stone-700 transition-all hover:scale-[1.01] group"
          title="Click to view chanting history and graphs"
        >
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium block mb-1 group-hover:text-saffron-600 transition-colors">
            {t.lifetimeCount}
          </span>
          <span className="font-heading text-2xl sm:text-3xl font-bold text-stone-800 dark:text-stone-100">
            {lifetimeCount.toLocaleString()}
          </span>
          <span className="text-[11px] text-stone-400 block mt-0.5">
            ({totalMalas.toLocaleString()} total malas)
          </span>
        </div>
      </div>

      {/* Direct 1-Click History Navigation Link */}
      {onNavigate && (
        <button
          onClick={() => onNavigate('history')}
          className="w-full max-w-md mt-3 py-2.5 px-4 rounded-2xl border border-saffron-300/80 dark:border-stone-800 bg-saffron-100/70 dark:bg-stone-900/90 hover:bg-saffron-200/80 dark:hover:bg-stone-800 text-saffron-900 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 group cursor-pointer"
        >
          <History className="w-4 h-4 text-saffron-600 dark:text-amber-400 group-hover:rotate-[-20deg] transition-transform" />
          <span>View Chanting History & Graphs</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
