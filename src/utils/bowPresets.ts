import { BowConfig, BowStats } from '../types';

export const DEFAULT_BOW_CONFIG: BowConfig = {
  id: 'olympic_gold',
  name: '국가대표 올림픽 골드',
  type: 'recurve',
  riserColor: '#dc2626', // Crimson Red
  riserMaterial: 'aluminum',
  gripColor: '#1e293b',
  limbColor: '#f8fafc', // Olympic white
  limbMaterial: 'carbon_foam',
  limbPattern: 'stripes',
  drawWeight: 44, // 44 lbs
  sight: 'pin_single',
  sightColor: '#ef4444',
  stabilizer: 'olympic_long',
  stringColor: '#facc15',
  arrowShaftColor: '#18181b',
  arrowFletchColor: '#facc15',
  arrowNockColor: '#ef4444',
};

export const PRESET_BOWS: BowConfig[] = [
  {
    id: 'olympic_gold',
    name: '대한민국 올림픽 골드 (Olympic Recurve)',
    type: 'recurve',
    riserColor: '#b91c1c',
    riserMaterial: 'aluminum',
    gripColor: '#0f172a',
    limbColor: '#ffffff',
    limbMaterial: 'carbon_foam',
    limbPattern: 'stripes',
    drawWeight: 46,
    sight: 'optic_circle',
    sightColor: '#22c55e',
    stabilizer: 'olympic_long',
    stringColor: '#facc15',
    arrowShaftColor: '#09090b',
    arrowFletchColor: '#3b82f6',
    arrowNockColor: '#ef4444',
  },
  {
    id: 'carbon_compound',
    name: '스텔스 카본 헌터 (Compound Hunter)',
    type: 'compound',
    riserColor: '#27272a',
    riserMaterial: 'carbon',
    gripColor: '#52525b',
    limbColor: '#18181b',
    limbMaterial: 'titanium',
    limbPattern: 'camo',
    drawWeight: 62,
    sight: 'pin_multi',
    sightColor: '#10b981',
    stabilizer: 'vbar_multi',
    stringColor: '#10b981',
    arrowShaftColor: '#27272a',
    arrowFletchColor: '#10b981',
    arrowNockColor: '#10b981',
  },
  {
    id: 'traditional_horn',
    name: '조선 전통 흑각궁 (Joseon Horn Reflex)',
    type: 'traditional',
    riserColor: '#78350f',
    riserMaterial: 'wood',
    gripColor: '#b45309',
    limbColor: '#451a03',
    limbMaterial: 'bamboo',
    limbPattern: 'dragon',
    drawWeight: 40,
    sight: 'none',
    sightColor: '#eab308',
    stabilizer: 'none',
    stringColor: '#fef08a',
    arrowShaftColor: '#92400e',
    arrowFletchColor: '#fef08a',
    arrowNockColor: '#92400e',
  },
  {
    id: 'joseon_jeongnyang',
    name: '조선 무과 대궁: 정량궁 (육량궁)',
    type: 'traditional',
    riserColor: '#3e1f0b',
    riserMaterial: 'wood',
    gripColor: '#78350f',
    limbColor: '#24140e',
    limbMaterial: 'bamboo',
    limbPattern: 'clean',
    drawWeight: 65,
    sight: 'none',
    sightColor: '#f59e0b',
    stabilizer: 'none',
    stringColor: '#fef08a',
    arrowShaftColor: '#3e1f0b',
    arrowFletchColor: '#78350f',
    arrowNockColor: '#24140e',
  },
  {
    id: 'joseon_yegung',
    name: '조선 왕실 대사례: 예궁 (禮弓)',
    type: 'traditional',
    riserColor: '#991b1b',
    riserMaterial: 'gold',
    gripColor: '#065f46',
    limbColor: '#b91c1c',
    limbMaterial: 'bamboo',
    limbPattern: 'dragon',
    drawWeight: 42,
    sight: 'none',
    sightColor: '#facc15',
    stabilizer: 'none',
    stringColor: '#fef3c7',
    arrowShaftColor: '#7f1d1d',
    arrowFletchColor: '#facc15',
    arrowNockColor: '#b91c1c',
  },
  {
    id: 'bucheon_donggae',
    name: '부천활박물관 소장: 기마용 동개활 (馬上 騎射弓)',
    type: 'traditional',
    riserColor: '#632e10',
    riserMaterial: 'wood',
    gripColor: '#a16207',
    limbColor: '#451a03',
    limbMaterial: 'bamboo',
    limbPattern: 'stripes',
    drawWeight: 45,
    sight: 'none',
    sightColor: '#eab308',
    stabilizer: 'none',
    stringColor: '#fef08a',
    arrowShaftColor: '#854d0e',
    arrowFletchColor: '#fde047',
    arrowNockColor: '#451a03',
  },
  {
    id: 'bucheon_pyeonjeon',
    name: '부천활박물관 소장: 조선 비밀병기 편전(애기살) 통아궁',
    type: 'traditional',
    riserColor: '#1c1917',
    riserMaterial: 'wood',
    gripColor: '#78350f',
    limbColor: '#0c0a09',
    limbMaterial: 'bamboo',
    limbPattern: 'dragon',
    drawWeight: 52,
    sight: 'none',
    sightColor: '#ef4444',
    stabilizer: 'none',
    stringColor: '#fef08a',
    arrowShaftColor: '#1c1917',
    arrowFletchColor: '#dc2626',
    arrowNockColor: '#7f1d1d',
  },
  {
    id: 'bucheon_cheolgung',
    name: '부천활박물관 소장: 조선 전투용 단조 철궁 (鐵弓)',
    type: 'traditional',
    riserColor: '#334155',
    riserMaterial: 'aluminum',
    gripColor: '#1e293b',
    limbColor: '#1e293b',
    limbMaterial: 'titanium',
    limbPattern: 'clean',
    drawWeight: 60,
    sight: 'none',
    sightColor: '#94a3b8',
    stabilizer: 'none',
    stringColor: '#e2e8f0',
    arrowShaftColor: '#334155',
    arrowFletchColor: '#cbd5e1',
    arrowNockColor: '#0f172a',
  },
  {
    id: 'bucheon_mokgung',
    name: '부천활박물관 소장: 산뽕나무 천연 향토 목궁 (木弓)',
    type: 'traditional',
    riserColor: '#854d0e',
    riserMaterial: 'wood',
    gripColor: '#a16207',
    limbColor: '#713f12',
    limbMaterial: 'bamboo',
    limbPattern: 'clean',
    drawWeight: 38,
    sight: 'none',
    sightColor: '#f59e0b',
    stabilizer: 'none',
    stringColor: '#fef3c7',
    arrowShaftColor: '#78350f',
    arrowFletchColor: '#ca8a04',
    arrowNockColor: '#713f12',
  },
  {
    id: 'bucheon_sunogung',
    name: '부천활박물관 소장: 조선 호신용 제갈 수노궁 (연발 쇠뇌)',
    type: 'traditional',
    riserColor: '#451a03',
    riserMaterial: 'wood',
    gripColor: '#78350f',
    limbColor: '#292524',
    limbMaterial: 'bamboo',
    limbPattern: 'stripes',
    drawWeight: 48,
    sight: 'pin_single',
    sightColor: '#f59e0b',
    stabilizer: 'none',
    stringColor: '#fef08a',
    arrowShaftColor: '#451a03',
    arrowFletchColor: '#ea580c',
    arrowNockColor: '#78350f',
  },
  {
    id: 'cyber_valkyrie',
    name: '사이버 발키리 네온 (Tactical Neon)',
    type: 'tactical',
    riserColor: '#06b6d4',
    riserMaterial: 'neon',
    gripColor: '#0284c7',
    limbColor: '#7c3aed',
    limbMaterial: 'titanium',
    limbPattern: 'stripes',
    drawWeight: 54,
    sight: 'laser_dot',
    sightColor: '#06b6d4',
    stabilizer: 'short_hunter',
    stringColor: '#ec4899',
    arrowShaftColor: '#1e1b4b',
    arrowFletchColor: '#ec4899',
    arrowNockColor: '#06b6d4',
  },
];

export function calculateBowStats(bow: BowConfig): BowStats {
  // 1. Velocity (influenced by drawWeight, limbMaterial, type)
  let baseVelocity = 180 + (bow.drawWeight - 30) * 3.6; // 180 ~ 324 px/s base speed
  if (bow.type === 'compound') baseVelocity *= 1.22; // High let-off & cam speed
  if (bow.type === 'traditional') baseVelocity *= 0.94; // Instinct snap
  if (bow.limbMaterial === 'carbon_foam') baseVelocity *= 1.08;
  if (bow.limbMaterial === 'titanium') baseVelocity *= 1.12;
  if (bow.id === 'bucheon_pyeonjeon') baseVelocity *= 1.25; // Pyeonjeon (Baby arrow) extreme muzzle velocity

  // 2. Stability (reduces aim tremor; influenced by stabilizer, weight, riser material)
  let stability = 45;
  if (bow.stabilizer === 'olympic_long') stability += 35;
  else if (bow.stabilizer === 'vbar_multi') stability += 42;
  else if (bow.stabilizer === 'short_hunter') stability += 18;
  else if (bow.stabilizer === 'none') stability += 0;

  if (bow.riserMaterial === 'aluminum') stability += 10;
  if (bow.riserMaterial === 'carbon') stability += 14;
  if (bow.type === 'compound') stability += 8;
  if (bow.id === 'bucheon_cheolgung') stability += 16; // Heavy forged iron stability
  if (bow.id === 'bucheon_sunogung') stability += 12;

  // 3. Wind resistance (influenced by arrow speed + stabilizer)
  let windResistance = Math.min(95, Math.round((baseVelocity / 350) * 60 + (stability * 0.35)));
  if (bow.id === 'bucheon_pyeonjeon') windResistance = Math.min(98, windResistance + 14); // Low-drag small dart

  // 4. Stamina time: how long you can hold full draw before severe hand tremors
  let staminaBase = 5.5 - ((bow.drawWeight - 30) / 40) * 2.5; // 3.0 ~ 5.5 seconds
  if (bow.type === 'compound') staminaBase += 3.2; // 80% let-off enables prolonged holding
  if (bow.limbMaterial === 'bamboo') staminaBase += 0.8;
  if (bow.id === 'bucheon_donggae') staminaBase += 1.6; // High agility cavalry bow
  if (bow.id === 'bucheon_sunogung') staminaBase += 3.0; // Mechanical latch lock

  // 5. Sight magnification / zoom
  let zoomLevel = 1.0;
  if (bow.sight === 'pin_single') zoomLevel = 1.25;
  if (bow.sight === 'pin_multi') zoomLevel = 1.35;
  if (bow.sight === 'optic_circle') zoomLevel = 1.45;
  if (bow.sight === 'laser_dot') zoomLevel = 1.5;

  return {
    velocity: Math.round(baseVelocity),
    stability: Math.min(100, Math.round(stability)),
    windResistance: Math.min(100, Math.round(windResistance)),
    staminaTime: Number(staminaBase.toFixed(1)),
    zoomLevel,
  };
}

export const COLOR_PALETTES = [
  { name: '옵시디언 블랙', hex: '#18181b' },
  { name: '스노우 화이트', hex: '#ffffff' },
  { name: '크림슨 레드', hex: '#dc2626' },
  { name: '로열 블루', hex: '#2563eb' },
  { name: '올림픽 골드', hex: '#eab308' },
  { name: '에메랄드 그린', hex: '#059669' },
  { name: '선셋 오렌지', hex: '#ea580c' },
  { name: '사이버 네온', hex: '#06b6d4' },
  { name: '딥 바이올렛', hex: '#7c3aed' },
  { name: '월넛 브라운', hex: '#78350f' },
];
