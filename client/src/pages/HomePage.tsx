import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { MalaCounter } from '../components/MalaCounter';
import { TargetProgress } from '../components/TargetProgress';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';
import { useJap } from '../context/JapContext';
import { useLanguage } from '../context/LanguageContext';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { selectedDarshanId } = useJap();
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="w-full flex flex-col items-center pb-20 sm:pb-8">
      {/* Installable PWA Banner */}
      <PwaInstallPrompt />

      {/* Divine Darshan (God's Darshan) Showcase Card */}
      <section
        aria-label="Divine Darshan"
        className="w-full max-w-md mx-auto mb-5 px-1"
      >
        <div className="relative bg-gradient-to-b from-amber-50 via-white to-amber-50/50 dark:from-stone-900 dark:via-stone-900/90 dark:to-stone-950 border border-amber-300/70 dark:border-amber-600/40 rounded-3xl p-3 sm:p-4 shadow-lg shadow-amber-500/5 dark:shadow-black/40 overflow-hidden transition-all duration-300">
          {/* Subtle Decorative Golden Aura */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-saffron-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Header Row: Title & Action Controls */}
          <div className="flex items-center justify-between gap-2 mb-2.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-gradient-to-tr from-amber-500 to-saffron-500 text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-heading font-bold text-sm sm:text-base text-stone-900 dark:text-amber-100 leading-tight">
                  {t.divineDarshanTitle}
                </h2>
                <span className="text-[10px] text-saffron-700 dark:text-amber-400/80 font-sacred font-semibold">
                  ॥ सियावर रामचंद्र की जय ॥
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onNavigate('darshan')}
                className="px-2.5 py-1 text-xs font-semibold text-saffron-700 dark:text-amber-300 bg-saffron-100/80 dark:bg-stone-800 hover:bg-saffron-200/90 dark:hover:bg-stone-700 border border-saffron-300/80 dark:border-stone-700 rounded-full flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                title={t.changeDarshan}
              >
                <ImageIcon className="w-3.5 h-3.5 text-saffron-600 dark:text-amber-400" />
                <span>{t.changeDarshan}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 rounded-full transition-colors cursor-pointer"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible Image Frame */}
          {isExpanded && (
            <div
              onClick={() => onNavigate('darshan')}
              className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden shadow-inner border border-amber-200/60 dark:border-stone-800 cursor-pointer group bg-stone-100 dark:bg-stone-800"
              title="Click to view all Shri Ram wallpapers"
            >
              <img
                src={`/assets/ram/darshan_${selectedDarshanId}.png`}
                alt="Lord Shri Ram Divine Darshan"
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                loading="eager"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('darshan_1.png')) {
                    target.src = '/assets/ram/darshan_1.png';
                  }
                }}
              />

              {/* Devotional Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10 opacity-90 group-hover:opacity-100 transition-opacity" />

              {/* Bottom Caption Pill */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                <span className="font-sacred text-xs sm:text-sm font-bold drop-shadow-md tracking-wide">
                  श्री राम दर्शन #{selectedDarshanId}
                </span>
                <span className="text-[10px] text-amber-200 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber-300/30">
                  {t.changeDarshan} 📿
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Mala Counter */}
      <MalaCounter onNavigate={onNavigate} />

      {/* Target Progress & Streaks */}
      <TargetProgress onNavigate={onNavigate} />
    </div>
  );
};
