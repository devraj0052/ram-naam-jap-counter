import React from 'react';
import { MalaCounter } from '../components/MalaCounter';
import { TargetProgress } from '../components/TargetProgress';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="w-full flex flex-col items-center pb-20 sm:pb-8">
      {/* Installable PWA Banner */}
      <PwaInstallPrompt />

      {/* Main Mala Counter */}
      <MalaCounter onNavigate={onNavigate} />

      {/* Target Progress & Streaks */}
      <TargetProgress onNavigate={onNavigate} />
    </div>
  );
};
