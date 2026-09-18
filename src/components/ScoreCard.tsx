import React from 'react';
import { ArrowHit, GameMode } from '../types';
import { Target, Trophy, Wind, Sparkles, Move, Zap, Flame } from 'lucide-react';
import { archeryAudio } from '../utils/audio';

interface ScoreCardProps {
  arrowHistory: ArrowHit[];
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  currentDistance: number;
  onSelectDistance: (distance: number) => void;
  onReset: () => void;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  arrowHistory,
  currentMode,
  onSelectMode,
  currentDistance,
  onSelectDistance,
  onReset,
}) => {
  const totalScore = arrowHistory.reduce((acc, curr) => acc + curr.score, 0);
  const avgScore = arrowHistory.length > 0 ? (totalScore / arrowHistory.length).toFixed(1) : '0.0';
  const tensCount = arrowHistory.filter(a => a.score === 10).length;
  const xCount = arrowHistory.filter(a => a.isX).length;

  const distances = [18, 30, 50, 70];

  const modes: { id: GameMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'horseback', label: '마상궁술 (기사 騎射)', icon: <Flame className="w-4 h-4 text-amber-400" />, desc: '100m 주로 전속력 질주 마상 사격' },
    { id: 'olympic', label: '올림픽 공식 룰', icon: <Target className="w-4 h-4" />, desc: '정통 10링 타겟' },
    { id: 'wind_challenge', label: '돌풍 챌린지', icon: <Wind className="w-4 h-4" />, desc: '강풍 & 풍향 변화' },
    { id: 'moving_target', label: '이동 과녁', icon: <Move className="w-4 h-4" />, desc: '좌우 왕복 타겟' },
    { id: 'free_practice', label: '자유 연습', icon: <Sparkles className="w-4 h-4" />, desc: '무제한 편안한 사격' },
  ];

  const getScoreBadgeColor = (score: number, isX: boolean) => {
    if (isX) return 'bg-amber-400 text-stone-950 font-black border-amber-300';
    if (score === 10 || score === 9) return 'bg-amber-500 text-stone-950 font-black';
    if (score === 8 || score === 7) return 'bg-red-600 text-white font-bold';
    if (score === 6 || score === 5) return 'bg-blue-600 text-white font-bold';
    if (score === 4 || score === 3) return 'bg-stone-900 text-white font-bold border border-stone-600';
    if (score === 2 || score === 1) return 'bg-white text-stone-900 font-bold';
    return 'bg-stone-800 text-stone-400';
  };

  return (
    <div id="archery-scorecard" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Game Mode & Distance Selector Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        {/* Modes */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            게임 모드 선택
          </span>
          <div className="flex flex-wrap gap-2">
            {modes.map(m => (
              <button
                key={m.id}
                id={`mode-btn-${m.id}`}
                type="button"
                onClick={() => {
                  archeryAudio.playClickSound();
                  onSelectMode(m.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  currentMode === m.id
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                    : 'bg-stone-800/60 border-stone-700 text-stone-300 hover:bg-stone-800'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Distances */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            사격 거리 (Distance)
          </span>
          <div className="flex items-center gap-1.5">
            {distances.map(d => (
              <button
                key={d}
                id={`dist-btn-${d}m`}
                type="button"
                onClick={() => {
                  archeryAudio.playClickSound();
                  onSelectDistance(d);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                  currentDistance === d
                    ? 'bg-stone-100 text-stone-950 border-white shadow'
                    : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-500'
                }`}
              >
                {d}M
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Score Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-950/80 rounded-xl p-3.5 border border-stone-800">
          <span className="text-xs text-stone-400 block font-medium">총 점수</span>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{totalScore}</div>
          <span className="text-[10px] text-stone-400">
            {arrowHistory.length > 0 ? `${arrowHistory.length}발 누적 합계` : '사격 전'}
          </span>
        </div>

        <div className="bg-stone-950/80 rounded-xl p-3.5 border border-stone-800">
          <span className="text-xs text-stone-400 block font-medium">화살당 평균</span>
          <div className="text-2xl font-black text-white mt-0.5">{avgScore}</div>
          <span className="text-[10px] text-stone-400">발당 평균 득점</span>
        </div>

        <div className="bg-stone-950/80 rounded-xl p-3.5 border border-stone-800">
          <span className="text-xs text-stone-400 block font-medium">10점 / X-Ring</span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">
            {tensCount}회 <span className="text-xs text-amber-400 font-bold">(X: {xCount})</span>
          </div>
          <span className="text-[10px] text-stone-400">골드 존 적중 횟수</span>
        </div>

        <div className="bg-stone-950/80 rounded-xl p-3.5 border border-stone-800">
          <span className="text-xs text-stone-400 block font-medium">발사 기록 초기화</span>
          <button
            id="reset-scores-btn"
            type="button"
            onClick={() => {
              archeryAudio.playClickSound();
              onReset();
            }}
            className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            기록 리셋 (새 경기)
          </button>
          <span className="text-[10px] text-stone-400 block mt-1">스코어카드 비우기</span>
        </div>
      </div>

      {/* Individual Arrow Log Rings Sheet */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>화살별 기록지 (Score Log)</span>
          </span>
          <span className="text-xs text-stone-400">최근 12발 표시</span>
        </div>

        {arrowHistory.length === 0 ? (
          <div className="bg-stone-950/40 rounded-xl p-8 border border-dashed border-stone-800 text-center text-stone-400 text-xs">
            아직 발사된 화살이 없습니다. 화면을 터치/클릭하여 첫 화살을 쏘아보세요!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {arrowHistory.slice(-18).map((hit, idx) => (
              <div
                key={hit.id || idx}
                className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border shadow ${getScoreBadgeColor(
                  hit.score,
                  hit.isX
                )}`}
              >
                <span className="text-[10px] opacity-75 leading-none">#{idx + 1}</span>
                <span className="text-sm leading-none mt-0.5">
                  {hit.isX ? 'X' : hit.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
