import React from 'react';
import { BowConfig, ArcheryTheme } from '../types';
import { archeryAudio } from '../utils/audio';
import { Target, Sliders, Volume2, VolumeX, Sparkles, Landmark } from 'lucide-react';

interface GameHeaderProps {
  activeView: 'workshop' | 'archery';
  onSelectView: (view: 'workshop' | 'archery') => void;
  currentBow: BowConfig;
  theme?: ArcheryTheme;
  onToggleTheme?: (theme: ArcheryTheme) => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  activeView,
  onSelectView,
  currentBow,
  theme = 'traditional',
  onToggleTheme,
}) => {
  const [isMuted, setIsMuted] = React.useState<boolean>(archeryAudio.getMuted());

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    archeryAudio.setMuted(next);
  };

  return (
    <header className="w-full bg-stone-950/90 border-b border-stone-800 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* App Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-700 flex items-center justify-center text-stone-950 shadow-md">
            <Target className="w-5 h-5 stroke-[2.5] text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-white">
                조선 국궁 & 활 커스텀
              </h1>
              <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                부천활박물관 유물 소장
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden sm:block">
              장착 활: <strong className="text-amber-200">{currentBow.name}</strong> ({currentBow.drawWeight} lbs)
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & Sound Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Switcher */}
          {onToggleTheme && (
            <button
              id="toggle-range-theme-btn"
              type="button"
              onClick={() => {
                archeryAudio.playClickSound();
                onToggleTheme(theme === 'traditional' ? 'olympic' : 'traditional');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 text-xs font-bold transition-all shadow cursor-pointer"
              title="배경 풍경 테마 전환 (조선 활터 / 올림픽)"
            >
              {theme === 'traditional' ? (
                <>
                  <span className="text-amber-400">🏛️</span>
                  <span className="hidden sm:inline">조선 활터 (풍락헌)</span>
                </>
              ) : (
                <>
                  <span className="text-sky-400">🏟️</span>
                  <span className="hidden sm:inline">올림픽 경기장</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center p-1 bg-stone-900 rounded-xl border border-stone-800">
            <button
              id="nav-workshop-btn"
              type="button"
              onClick={() => {
                archeryAudio.playClickSound();
                onSelectView('workshop');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                activeView === 'workshop'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>활 공방</span>
            </button>

            <button
              id="nav-archery-btn"
              type="button"
              onClick={() => {
                archeryAudio.playClickSound();
                onSelectView('archery');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                activeView === 'archery'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>활터 사격</span>
            </button>
          </div>

          <button
            id="global-audio-btn"
            type="button"
            onClick={toggleSound}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-white cursor-pointer transition-colors"
            title={isMuted ? '음소거 해제' : '사운드 끄기'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
