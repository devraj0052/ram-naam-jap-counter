import React from 'react';
import { Sparkles, Check, Heart } from 'lucide-react';
import { useJap } from '../context/JapContext';
import { useLanguage } from '../context/LanguageContext';

export const DarshanPage: React.FC = () => {
  const { selectedDarshanId, setSelectedDarshanId } = useJap();
  const { t } = useLanguage();

  const darshanIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 sm:pb-8">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl text-stone-900 dark:text-white flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" />
          <span>{t.darshan}</span>
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Select your favorite divine Shri Ram darshan wallpaper for your Jap Counter
        </p>
      </div>

      {/* Devotional Chaupai Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-saffron-500/15 to-orange-500/10 border border-saffron-300 dark:border-stone-700 rounded-2xl p-4 text-center mb-6 shadow-sm">
        <p className="font-sacred text-base sm:text-lg text-saffron-900 dark:text-amber-200 font-bold mb-1">
          मंगल भवन अमंगल हारी । द्रवहु सुदसरथ अजिर बिहारी ॥
        </p>
        <p className="font-sacred text-xs sm:text-sm text-saffron-800 dark:text-amber-300">
          श्री रामचन्द्र कृपालु भजु मन हरण भवभय दारुणम् ।
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {darshanIds.map((id) => {
          const isSelected = selectedDarshanId === id;
          return (
            <div
              key={id}
              onClick={() => setSelectedDarshanId(id)}
              className={`group relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-200 aspect-[4/5] bg-stone-100 dark:bg-stone-800 ${
                isSelected
                  ? 'border-saffron-500 ring-4 ring-saffron-500/20 scale-[1.02] shadow-xl'
                  : 'border-transparent hover:border-saffron-300 hover:scale-[1.01]'
              }`}
            >
              <img
                src={`/assets/ram/darshan_${id}.png`}
                alt={`Shri Ram Darshan ${id}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-90 group-hover:opacity-100 transition-opacity" />

              {/* Selection Badge */}
              <div className="absolute top-2.5 right-2.5">
                {isSelected ? (
                  <div className="bg-saffron-500 text-white p-1 rounded-full shadow-lg">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="bg-black/40 backdrop-blur-sm text-white/70 p-1 rounded-full group-hover:text-white transition-colors">
                    <Heart className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Title label */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 text-center">
                <span className="font-sacred text-white text-xs font-bold drop-shadow-md">
                  श्री राम दर्शन #{id}
                </span>
                {isSelected && (
                  <span className="block text-[10px] text-amber-300 font-medium">
                    (Active Wallpaper)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
