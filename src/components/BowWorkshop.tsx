import React, { useState } from 'react';
import { BowConfig, BowType, LimbMaterial, RiserMaterial, SightStyle, StabilizerStyle } from '../types';
import { COLOR_PALETTES, PRESET_BOWS, calculateBowStats } from '../utils/bowPresets';
import { BowPreview } from './BowPreview';
import { archeryAudio } from '../utils/audio';
import { Sliders, Sparkles, Check, Bookmark, RefreshCw } from 'lucide-react';

interface BowWorkshopProps {
  currentBow: BowConfig;
  onUpdateBow: (bow: BowConfig) => void;
  onStartArchery: () => void;
}

type TabType = 'preset' | 'riser' | 'limbs' | 'accessories' | 'arrow';

export const BowWorkshop: React.FC<BowWorkshopProps> = ({
  currentBow,
  onUpdateBow,
  onStartArchery,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('preset');
  const stats = calculateBowStats(currentBow);

  const handlePresetSelect = (preset: BowConfig) => {
    archeryAudio.playClickSound();
    onUpdateBow({ ...preset, id: `custom_${Date.now()}` });
  };

  const updateField = <K extends keyof BowConfig>(key: K, value: BowConfig[K]) => {
    archeryAudio.playClickSound();
    onUpdateBow({
      ...currentBow,
      [key]: value,
    });
  };

  return (
    <div id="bow-workshop" className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner / Workshop Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                활 공방 (Workshop)
              </span>
              <span className="text-xs text-stone-400">나만의 커스텀 활 제작</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
              활 커스텀 스튜디오
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="go-shooting-btn"
            type="button"
            onClick={() => {
              archeryAudio.playClickSound();
              onStartArchery();
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 fill-stone-950" />
            <span>이 활로 양궁 사격하기</span>
          </button>
        </div>
      </div>

      {/* Main Studio 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Bow Visual Preview */}
        <div className="lg:col-span-6 space-y-4">
          <BowPreview bow={currentBow} stats={stats} />

          {/* Bow Custom Name Input */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center gap-3">
            <Bookmark className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <label htmlFor="bow-name-input" className="text-xs text-stone-400 font-medium block">
                활 이름 설정
              </label>
              <input
                id="bow-name-input"
                type="text"
                value={currentBow.name}
                onChange={e => updateField('name', e.target.value)}
                className="w-full bg-stone-950/80 border border-stone-700/80 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors mt-1"
                placeholder="활의 이름을 지어주세요"
                maxLength={30}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Customization Controls & Navigation */}
        <div className="lg:col-span-6 bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-5">
          {/* Customizer Sub-tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800">
            {[
              { id: 'preset', label: '프리셋 덱' },
              { id: 'riser', label: '라이저 / 본체' },
              { id: 'limbs', label: '활대 / 장력' },
              { id: 'accessories', label: '조준기 / 안정기' },
              { id: 'arrow', label: '시위 / 화살' },
            ].map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                onClick={() => {
                  archeryAudio.playClickSound();
                  setActiveTab(tab.id as TabType);
                }}
                className={`flex-1 min-w-[80px] py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-white hover:bg-stone-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: PRESETS */}
          {activeTab === 'preset' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  인기 보우 프리셋 선택
                </span>
                <span className="text-xs text-stone-400">클릭 시 즉시 커스텀에 적용</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_BOWS.map(preset => {
                  const isSelected = currentBow.id === preset.id || currentBow.name === preset.name;
                  const isJoseon = preset.id.includes('joseon') || preset.id === 'traditional_horn';

                  let bowTag = '전통 활';
                  let bowDesc = '전통 본능 사격 활';
                  const isBucheon = preset.id.startsWith('bucheon_');

                  if (preset.id === 'traditional_horn') {
                    bowTag = '조선 전통 국궁';
                    bowDesc = '물소뿔과 대나무의 탄성, 정통 조선 흑각궁';
                  } else if (preset.id === 'bucheon_donggae') {
                    bowTag = '부천활박물관: 기마 동개활';
                    bowDesc = '마상 기사(騎射) 전용 경량 속사활, 말 위에서 빠른 사격';
                  } else if (preset.id === 'bucheon_pyeonjeon') {
                    bowTag = '부천활박물관: 편전(애기살)';
                    bowDesc = '통아로 쏘는 조선 비밀병기 애기살, 압도적 탄속과 관통력';
                  } else if (preset.id === 'bucheon_cheolgung') {
                    bowTag = '부천활박물관: 단조 철궁';
                    bowDesc = '무쇠를 벼려 만든 60 lbs 전투용 활, 흔들림 없는 강철 안정성';
                  } else if (preset.id === 'bucheon_mokgung') {
                    bowTag = '부천활박물관: 산뽕나무 목궁';
                    bowDesc = '자연 목재를 깎아 기름에 숙성한 순수 목궁, 부드러운 만작감';
                  } else if (preset.id === 'bucheon_sunogung') {
                    bowTag = '부천활박물관: 제갈 수노궁';
                    bowDesc = '탄창 레버 장착 10연발 전통 쇠뇌, 기계식 락킹 안정성';
                  } else if (preset.id === 'joseon_jeongnyang') {
                    bowTag = '조선 무과 대궁';
                    bowDesc = '무과 시험용 65 lbs 초고장력 대궁, 파괴적 관통력';
                  } else if (preset.id === 'joseon_yegung') {
                    bowTag = '조선 왕실 의식궁';
                    bowDesc = '왕실 대사례 주칠 단청궁, 부드럽고 우아한 조준감';
                  } else if (preset.id === 'olympic_gold') {
                    bowTag = '올림픽 국가대표';
                    bowDesc = '세계 최강 46 lbs 카본 폼 리커브 활';
                  } else if (preset.id === 'carbon_compound') {
                    bowTag = '컴파운드 헌터';
                    bowDesc = '62 lbs 듀얼 캠 고탄속 스텔스 활';
                  } else if (preset.id === 'cyber_valkyrie') {
                    bowTag = '사이버 택티컬';
                    bowDesc = '홀로그래픽 레이저 조준경 하이테크 활';
                  }

                  return (
                    <button
                      key={preset.id}
                      id={`preset-btn-${preset.id}`}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                          : 'bg-stone-800/50 border-stone-700/60 hover:border-stone-500 text-stone-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                              isBucheon
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                : isJoseon
                                ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                : 'bg-stone-900/80 text-stone-300 border-stone-700'
                            }`}
                          >
                            {bowTag}
                          </span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-stone-950 shrink-0">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white mt-2 leading-snug">{preset.name}</h4>
                        <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                          {bowDesc}
                        </p>
                      </div>

                      <div className="text-xs text-stone-400 mt-2.5 pt-2 border-t border-stone-800/80 flex items-center gap-2">
                        <span className="font-bold text-amber-400">{preset.drawWeight} lbs</span>
                        <span>•</span>
                        <span>{preset.riserMaterial === 'wood' ? '전통 목재' : preset.riserMaterial === 'gold' ? '왕실 금박주칠' : preset.riserMaterial}</span>
                        <span>•</span>
                        <span className="text-stone-400">
                          {preset.sight === 'none' ? '본능 사격(노 사이트)' : '조준경 장착'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: RISER / BODY */}
          {activeTab === 'riser' && (
            <div className="space-y-5">
              {/* Bow Type selection */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  활 유형 (Bow Architecture)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { type: 'recurve', label: '올림픽 리커브', desc: '균형 잡힌 탄도' },
                      { type: 'compound', label: '컴파운드', desc: '초고속 탄속 & 렛오프' },
                      { type: 'traditional', label: '전통 각궁', desc: '직관적 본능 사격' },
                      { type: 'tactical', label: '택티컬', desc: '현대 하이테크' },
                    ] as const
                  ).map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => updateField('type', item.type as BowType)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        currentBow.type === item.type
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                          : 'bg-stone-800/40 border-stone-700 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Riser Material */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  라이저 소재 (Riser Material)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { mat: 'aluminum', label: '단조 알루미늄', bonus: '강한 내구성' },
                      { mat: 'carbon', label: '고탄성 카본', bonus: '진동 억제' },
                      { mat: 'wood', label: '천연 원목 목재', bonus: '클래식 감성' },
                      { mat: 'gold', label: '골드 티타늄', bonus: '고급 도금' },
                      { mat: 'neon', label: '네온 발광 합금', bonus: '야간 발광' },
                    ] as const
                  ).map(item => (
                    <button
                      key={item.mat}
                      type="button"
                      onClick={() => updateField('riserMaterial', item.mat as RiserMaterial)}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        currentBow.riserMaterial === item.mat
                          ? 'bg-stone-800 border-amber-500 text-amber-400 font-bold shadow'
                          : 'bg-stone-800/40 border-stone-700 text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-stone-400">{item.bonus}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Riser Color Palette */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  라이저 색상 (Riser Color)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => updateField('riserColor', col.hex)}
                      title={col.name}
                      style={{ backgroundColor: col.hex }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                        currentBow.riserColor === col.hex
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-stone-700 hover:scale-105'
                      }`}
                    >
                      {currentBow.riserColor === col.hex && (
                        <Check
                          className={`w-4 h-4 ${
                            col.hex === '#ffffff' || col.hex === '#facc15'
                              ? 'text-stone-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grip Color */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  그립 손잡이 색상 (Grip Wrap)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.slice(0, 6).map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => updateField('gripColor', col.hex)}
                      title={col.name}
                      style={{ backgroundColor: col.hex }}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer ${
                        currentBow.gripColor === col.hex ? 'border-amber-400 scale-110' : 'border-stone-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIMBS & DRAW WEIGHT */}
          {activeTab === 'limbs' && (
            <div className="space-y-5">
              {/* Draw Weight Slider */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-300">
                    활 장력 / 파운드 (Draw Weight)
                  </span>
                  <span className="text-base font-black text-amber-400">
                    {currentBow.drawWeight} lbs
                  </span>
                </div>
                <input
                  id="draw-weight-slider"
                  type="range"
                  min={30}
                  max={70}
                  step={1}
                  value={currentBow.drawWeight}
                  onChange={e => updateField('drawWeight', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-stone-800 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-stone-400 mt-2">
                  <span>30 lbs (부드러운 당김)</span>
                  <span>50 lbs (올림픽 표준)</span>
                  <span>70 lbs (초고속 플랫 탄도)</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-2">
                  * 장력이 높을수록 화살이 빠르고 낙차가 적지만, 조준 시 떨림과 피로도가 빨리 증가합니다.
                </p>
              </div>

              {/* Limb Material */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  활대 날개 재질 (Limb Core)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'carbon_foam', name: '카본 폼 코어', desc: '올림픽 최신 탄성력' },
                      { id: 'titanium', name: '티타늄 컴포짓', desc: '최고 속도 & 강한 복원력' },
                      { id: 'bamboo', name: '적층 대나무 코어', desc: '부드러운 만작감' },
                      { id: 'fiberglass', name: '파이버글래스', desc: '탄력적이고 내구성 우수' },
                    ] as const
                  ).map(limb => (
                    <button
                      key={limb.id}
                      type="button"
                      onClick={() => updateField('limbMaterial', limb.id as LimbMaterial)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        currentBow.limbMaterial === limb.id
                          ? 'bg-stone-800 border-amber-500 text-amber-400 font-bold shadow'
                          : 'bg-stone-800/40 border-stone-700 text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      <div className="text-xs">{limb.name}</div>
                      <div className="text-[10px] text-stone-400">{limb.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Limb Color */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  림 색상 (Limb Color)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => updateField('limbColor', col.hex)}
                      title={col.name}
                      style={{ backgroundColor: col.hex }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                        currentBow.limbColor === col.hex
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-stone-700 hover:scale-105'
                      }`}
                    >
                      {currentBow.limbColor === col.hex && (
                        <Check
                          className={`w-4 h-4 ${
                            col.hex === '#ffffff' || col.hex === '#facc15'
                              ? 'text-stone-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limb Pattern */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  림 패턴 데칼 (Pattern)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'clean', label: '단색 깔끔' },
                      { id: 'stripes', label: '레이싱 스트라이프' },
                      { id: 'camo', label: '카무플라주' },
                      { id: 'dragon', label: '전통 문양' },
                    ] as const
                  ).map(pat => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => updateField('limbPattern', pat.id)}
                      className={`p-2 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-all ${
                        currentBow.limbPattern === pat.id
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'bg-stone-800/40 border-stone-700 text-stone-300'
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SIGHT & STABILIZER */}
          {activeTab === 'accessories' && (
            <div className="space-y-5">
              {/* Sight System */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  조준기 시스템 (Sight Reticle)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'optic_circle', name: '올림픽 스코프 링', desc: '1.45x 배율 정밀 원형 링' },
                      { id: 'pin_single', name: '싱글 핀 조준기', desc: '1.25x 광섬유 단일 핀' },
                      { id: 'pin_multi', name: '다중 거리 핀', desc: '1.35x 거리 보정 다중 핀' },
                      { id: 'laser_dot', name: '사이버 레이저 도트', desc: '1.50x 하이테크 레이저 점' },
                      { id: 'none', name: '베어보우 (노 사이트)', desc: '1.0x 감각 위주 정통 사격' },
                    ] as const
                  ).map(sight => (
                    <button
                      key={sight.id}
                      type="button"
                      onClick={() => updateField('sight', sight.id as SightStyle)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        currentBow.sight === sight.id
                          ? 'bg-stone-800 border-amber-500 text-amber-400 font-bold shadow'
                          : 'bg-stone-800/40 border-stone-700 text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      <div className="text-xs">{sight.name}</div>
                      <div className="text-[10px] text-stone-400">{sight.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sight Reticle Color */}
              {currentBow.sight !== 'none' && (
                <div>
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                    조준 핀/발광 색상
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#06b6d4'].map(hex => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => updateField('sightColor', hex)}
                        style={{ backgroundColor: hex }}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                          currentBow.sightColor === hex ? 'border-white scale-110' : 'border-stone-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stabilizer System */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  스태빌라이저 안정기 (Stabilizer & Damper)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'olympic_long', name: '올림픽 롱로드 카본', desc: '안정성 +35% (손떨림 극소화)' },
                      { id: 'vbar_multi', name: 'V-바 3방향 스태빌라이저', desc: '안정성 +42% (최상급 밸런스)' },
                      { id: 'short_hunter', name: '쇼트 헌터 댐퍼', desc: '안정성 +18% (가벼운 조작)' },
                      { id: 'none', name: '스태빌라이저 없음', desc: '경량화 (자연스러운 흔들림)' },
                    ] as const
                  ).map(stab => (
                    <button
                      key={stab.id}
                      type="button"
                      onClick={() => updateField('stabilizer', stab.id as StabilizerStyle)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        currentBow.stabilizer === stab.id
                          ? 'bg-stone-800 border-amber-500 text-amber-400 font-bold shadow'
                          : 'bg-stone-800/40 border-stone-700 text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      <div className="text-xs">{stab.name}</div>
                      <div className="text-[10px] text-stone-400">{stab.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BOWSTRING & ARROW */}
          {activeTab === 'arrow' && (
            <div className="space-y-5">
              {/* Bowstring color */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  활시위 색상 (FastFlight Bowstring)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => updateField('stringColor', col.hex)}
                      title={col.name}
                      style={{ backgroundColor: col.hex }}
                      className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                        currentBow.stringColor === col.hex ? 'border-white scale-110' : 'border-stone-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Arrow Fletching (Feathers) */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  화살 깃 색상 (Arrow Fletching)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => updateField('arrowFletchColor', col.hex)}
                      title={col.name}
                      style={{ backgroundColor: col.hex }}
                      className={`w-7 h-7 rounded-lg border-2 cursor-pointer ${
                        currentBow.arrowFletchColor === col.hex ? 'border-white scale-110' : 'border-stone-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Arrow Shaft */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  화살대 색상 (Carbon Shaft)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.slice(0, 6).map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => updateField('arrowShaftColor', col.hex)}
                      title={col.name}
                      style={{ backgroundColor: col.hex }}
                      className={`w-7 h-7 rounded-lg border-2 cursor-pointer ${
                        currentBow.arrowShaftColor === col.hex ? 'border-white scale-110' : 'border-stone-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Arrow Nock */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  화살 노크 색상 (Nock)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['#ef4444', '#22c55e', '#facc15', '#06b6d4', '#ec4899', '#ffffff'].map(hex => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => updateField('arrowNockColor', hex)}
                      style={{ backgroundColor: hex }}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                        currentBow.arrowNockColor === hex ? 'border-white scale-110' : 'border-stone-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
            <button
              id="reset-bow-btn"
              type="button"
              onClick={() => {
                archeryAudio.playClickSound();
                onUpdateBow({ ...PRESET_BOWS[0], id: `custom_${Date.now()}` });
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>기본 올림픽 활로 초기화</span>
            </button>

            <button
              id="ready-play-btn"
              type="button"
              onClick={() => {
                archeryAudio.playClickSound();
                onStartArchery();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95"
            >
              <span>양궁장으로 이동하기</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
