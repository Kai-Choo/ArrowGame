import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ArrowHit, BowConfig, BowStats, GameMode, ArcheryTheme } from '../types';
import { archeryAudio } from '../utils/audio';
import { calculateBowStats } from '../utils/bowPresets';
import { Compass, RotateCcw, Volume2, VolumeX, Crosshair, ChevronRight, Award, Flame, Landmark } from 'lucide-react';

interface ArcheryCanvasProps {
  bow: BowConfig;
  mode: GameMode;
  distance: number;
  onShotFired: (hit: ArrowHit) => void;
  arrowHistory: ArrowHit[];
  onResetRound: () => void;
  onBackToWorkshop: () => void;
  theme?: ArcheryTheme;
  onToggleTheme?: (theme: ArcheryTheme) => void;
}

interface WindState {
  speed: number;  // m/s (0 to 8)
  angle: number;  // radians (0 to 2PI)
}

interface FlightArrow {
  active: boolean;
  startX: number;
  startY: number;
  targetHitX: number; // canvas coord
  targetHitY: number; // canvas coord
  progress: number;   // 0 to 1
  speed: number;      // rate per frame
  relativeHitX: number; // -1 to 1 on target
  relativeHitY: number; // -1 to 1 on target
  score: number;
  isX: boolean;
}

export interface HorseTargetConfig {
  id: number;
  dist: number;
  label: string;
}

export const HORSE_TARGET_CONFIGS: HorseTargetConfig[] = [
  { id: 1, dist: 28, label: '제1 사목' },
  { id: 2, dist: 58, label: '제2 사목' },
  { id: 3, dist: 88, label: '제3 사목' },
];

export interface HorseTargetCalculatedState {
  id: number;
  label: string;
  dist: number;
  side: 'right' | 'left';
  relDist: number;
  targetRadius: number;
  targetCenterX: number;
  targetCenterY: number;
  opacity: number;
  inZone: boolean;
  hasPassed: boolean;
}

/**
 * Computes dynamic 3D target geometry during horseback gallop.
 * - Targets alternate strictly Left <-> Right for every sequential target.
 * - Approaching targets smoothly scale up from the horizon.
 * - Passed targets gracefully rush past to the side/rear, scaling up and fading out naturally.
 */
export function computeHorseTargetState(
  curDist: number,
  lap: number,
  width: number,
  height: number
): HorseTargetCalculatedState {
  let targetIndex = -1;
  let targetDist = 0;
  let relDist = 999;

  for (let i = 0; i < HORSE_TARGET_CONFIGS.length; i++) {
    const t = HORSE_TARGET_CONFIGS[i];
    const r = t.dist - curDist;
    // Keep target rendered until it has passed 13m behind the rider
    if (r > -13) {
      targetIndex = i;
      targetDist = t.dist;
      relDist = r;
      break;
    }
  }

  let totalIdx = 0;
  if (targetIndex !== -1) {
    totalIdx = (lap - 1) * HORSE_TARGET_CONFIGS.length + targetIndex;
  } else {
    // Rider near end of current 100m lap: prepare next lap's first target
    const first = HORSE_TARGET_CONFIGS[0];
    totalIdx = lap * HORSE_TARGET_CONFIGS.length;
    targetDist = 100 + first.dist;
    relDist = targetDist - curDist;
  }

  // Strict Alternating Left/Right side per target:
  // Target 1: Right, Target 2: Left, Target 3: Right, Target 4: Left, etc.
  const side: 'right' | 'left' = totalIdx % 2 === 0 ? 'right' : 'left';
  const sideDir = side === 'right' ? 1 : -1;
  const label = `제${(totalIdx % 3) + 1} 사목 (${side === 'right' ? '우측' : '좌측'})`;

  let targetRadius = 45;
  let targetCenterX = width * 0.5;
  let targetCenterY = height * 0.48;
  let opacity = 1;
  const hasPassed = relDist < 0;

  if (relDist >= 0) {
    // --- Approaching from the horizon (38m ~ 0m) ---
    const tProgress = Math.max(0, Math.min(1, 1 - (relDist / 38)));
    targetRadius = 24 + tProgress * 54; // Scales from 24px up to 78px
    // Widens outward toward rider's left or right lane
    targetCenterX = width * 0.5 + sideDir * (28 + Math.pow(tProgress, 1.35) * (width * 0.33));
    targetCenterY = height * 0.48 + tProgress * (height * 0.15);
    opacity = Math.min(1, 0.45 + tProgress * 0.55);
  } else {
    // --- Passing by and flying behind the rider (0m ~ -13m) ---
    // Smooth natural 3D fly-by: expands rapidly into peripheral view then fades behind
    const passRatio = Math.min(1, (-relDist) / 13);
    targetRadius = 78 + passRatio * 115; // Expands up to ~193px as it rushes by
    // Swings rapidly off-screen to the designated side
    targetCenterX = width * 0.5 + sideDir * (28 + (width * 0.33) + Math.pow(passRatio, 1.15) * (width * 0.48));
    targetCenterY = (height * 0.48 + height * 0.15) + Math.pow(passRatio, 1.25) * (height * 0.28);
    // Smooth cinematic opacity fade-out as target passes behind the camera
    opacity = Math.max(0, 1 - Math.pow(passRatio, 1.25));
  }

  // Optimal shooting zone: 3m to 24m ahead
  const inZone = relDist >= 3 && relDist <= 24;

  return {
    id: totalIdx + 1,
    label,
    dist: targetDist,
    side,
    relDist,
    targetRadius,
    targetCenterX,
    targetCenterY,
    opacity,
    inZone,
    hasPassed,
  };
}

export const ArcheryCanvas: React.FC<ArcheryCanvasProps> = ({
  bow,
  mode,
  distance,
  onShotFired,
  arrowHistory,
  onResetRound,
  onBackToWorkshop,
  theme = 'traditional',
  onToggleTheme,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stats = calculateBowStats(bow);
  const isTraditional = theme === 'traditional' || mode === 'horseback';

  // Sound state
  const [isMuted, setIsMuted] = useState<boolean>(archeryAudio.getMuted());

  // Aiming and drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawProgress, setDrawProgress] = useState<number>(0);
  const [fatigue, setFatigue] = useState<number>(0); // 0 to 1

  // Wind state
  const [wind, setWind] = useState<WindState>({ speed: 2.2, angle: Math.PI * 0.15 });

  // Moving target state (for 'moving_target' mode)
  const [targetOffset, setTargetOffset] = useState<number>(0);

  // Horseback Archery State
  const gallopDistRef = useRef<number>(0); // 0m to 100m track
  const gallopLapRef = useRef<number>(1);
  const lastHoofStepRef = useRef<number>(0);
  const lastHorseHudRef = useRef<number>(0);
  const [horsebackInfo, setHorsebackInfo] = useState<{
    dist: number;
    lap: number;
    targetName: string;
    side: 'right' | 'left';
    inZone: boolean;
    hasPassed: boolean;
    relDist: number;
  }>({
    dist: 0,
    lap: 1,
    targetName: '제1 사목 (우측)',
    side: 'right',
    inZone: false,
    hasPassed: false,
    relDist: 28,
  });

  // In-flight arrow
  const flightArrowRef = useRef<FlightArrow | null>(null);

  // Latest hit notification splash
  const [lastHitPopup, setLastHitPopup] = useState<{ score: number; isX: boolean; id: string; isTraditional?: boolean } | null>(null);

  // Aim point (normalized or canvas coords)
  const aimPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const drawStartTimeRef = useRef<number>(0);

  // Toggle sound
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    archeryAudio.setMuted(next);
  };

  // Generate wind based on mode
  const refreshWind = useCallback(() => {
    let speed = 0;
    if (mode === 'free_practice') {
      speed = Math.random() * 1.5;
    } else if (mode === 'wind_challenge') {
      speed = 3.5 + Math.random() * 5.0; // 3.5 ~ 8.5 m/s strong wind
    } else {
      // Olympic standard
      speed = 1.0 + Math.random() * 3.0; // 1.0 ~ 4.0 m/s
    }
    const angle = Math.random() * Math.PI * 2;
    setWind({ speed: Number(speed.toFixed(1)), angle });
  }, [mode]);

  // Set initial wind
  useEffect(() => {
    refreshWind();
  }, [refreshWind, distance]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      aimPosRef.current = { x: rect.width / 2, y: rect.height / 2 };
      mousePosRef.current = { x: rect.width / 2, y: rect.height / 2 };
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Game Loop (Canvas Render & Physics)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let breathTime = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      breathTime += dt * 1.8;

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const isHorseback = mode === 'horseback';
      const isTraditional = theme === 'traditional' || isHorseback;

      // Horseback galloping simulation physics
      let saddleBounceY = 0;
      let saddleBounceX = 0;
      let horseTargetState: HorseTargetCalculatedState | null = null;
      let horseRelDist = 28;
      let horseInZone = false;
      let activeHorseTargetName = '제1 사목 (우측 28m)';

      if (isHorseback) {
        const gallopSpeed = 10; // ~36 km/h (10 m/s)
        gallopDistRef.current += dt * gallopSpeed;
        if (gallopDistRef.current >= 100) {
          gallopDistRef.current = 0;
          gallopLapRef.current += 1;
        }

        // Hoofbeat sound synchronization
        if (time - lastHoofStepRef.current > 420) {
          lastHoofStepRef.current = time;
          archeryAudio.playGallopSound();
        }

        const curDist = gallopDistRef.current;
        horseTargetState = computeHorseTargetState(curDist, gallopLapRef.current, width, height);
        activeHorseTargetName = horseTargetState.label;
        horseRelDist = horseTargetState.relDist;
        horseInZone = horseTargetState.inZone;

        // Periodic HUD sync (every ~120ms)
        if (time - lastHorseHudRef.current > 120) {
          lastHorseHudRef.current = time;
          setHorsebackInfo({
            dist: Math.round(curDist),
            lap: gallopLapRef.current,
            targetName: horseTargetState.label,
            side: horseTargetState.side,
            inZone: horseTargetState.inZone,
            hasPassed: horseTargetState.hasPassed,
            relDist: Math.round(horseRelDist),
          });
        }

        // Rhythmic saddle & camera bounce
        const stridePhase = time * 0.009;
        saddleBounceY = Math.sin(stridePhase) * 6;
        saddleBounceX = Math.cos(stridePhase * 0.5) * 2;
      }

      // Target moving animation (for 'moving_target' mode)
      let currentTargetOffsetX = 0;
      if (mode === 'moving_target') {
        currentTargetOffsetX = Math.sin(time * 0.0015) * (width * 0.14);
        setTargetOffset(currentTargetOffsetX);
      }

      // 1. Draw Archery Range Background (Traditional Joseon vs Olympic)
      if (isTraditional) {
        // --- Traditional Joseon Archery Range (국궁장 풍락헌 & 산수화) ---
        // Sky: Warm morning mist gradient over Joseon mountains
        const joseonSky = ctx.createLinearGradient(0, 0, 0, height * 0.56);
        joseonSky.addColorStop(0, '#7dd3fc');
        joseonSky.addColorStop(0.35, '#bae6fd');
        joseonSky.addColorStop(0.7, '#fed7aa');
        joseonSky.addColorStop(1, '#fef08a');
        ctx.fillStyle = joseonSky;
        ctx.fillRect(0, 0, width, height * 0.56);

        // Soft Morning Sun
        ctx.save();
        const sunGrad = ctx.createRadialGradient(width * 0.28, height * 0.2, 5, width * 0.28, height * 0.2, 70);
        sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        sunGrad.addColorStop(0.5, 'rgba(253, 186, 116, 0.35)');
        sunGrad.addColorStop(1, 'rgba(253, 186, 116, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(width * 0.28, height * 0.2, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Layer 1: Distant misty Korean mountain silhouettes (수묵화 산수 능선)
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.53);
        ctx.lineTo(width * 0.18, height * 0.38);
        ctx.lineTo(width * 0.38, height * 0.46);
        ctx.lineTo(width * 0.58, height * 0.34);
        ctx.lineTo(width * 0.78, height * 0.44);
        ctx.lineTo(width, height * 0.36);
        ctx.lineTo(width, height * 0.56);
        ctx.lineTo(0, height * 0.56);
        ctx.fill();

        // Layer 2: Midground pine-covered hills (청산 솔숲)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.55);
        ctx.lineTo(width * 0.12, height * 0.45);
        ctx.lineTo(width * 0.32, height * 0.48);
        ctx.lineTo(width * 0.65, height * 0.42);
        ctx.lineTo(width * 0.88, height * 0.49);
        ctx.lineTo(width, height * 0.44);
        ctx.lineTo(width, height * 0.56);
        ctx.lineTo(0, height * 0.56);
        ctx.fill();

        // Gnarled Joseon Pine Trees (소나무 / 낙락장송)
        const drawPine = (px: number, py: number, scale: number) => {
          ctx.save();
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3.5 * scale;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo(px + 8 * scale, py - 20 * scale, px + 4 * scale, py - 40 * scale);
          ctx.stroke();

          // Needles clusters
          ctx.fillStyle = '#14532d';
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(px + (i - 1.5) * 12 * scale, py - (35 + (i % 2) * 8) * scale, 10 * scale, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        };

        drawPine(width * 0.08, height * 0.53, 0.9);
        drawPine(width * 0.16, height * 0.54, 0.7);
        drawPine(width * 0.85, height * 0.52, 0.85);

        // Joseon Archery Pavilion (국궁 사정 射亭 - 풍락헌 豊樂軒) on the right
        ctx.save();
        const pavX = width * 0.72;
        const pavY = height * 0.44;
        const pavW = 75;

        // Wooden Platform Base
        ctx.fillStyle = '#78350f';
        ctx.fillRect(pavX - 5, pavY + 24, pavW + 10, 8);

        // Red Pillars (단청 기둥)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(pavX, pavY + 8, 4, 18);
        ctx.fillRect(pavX + pavW * 0.33, pavY + 8, 4, 18);
        ctx.fillRect(pavX + pavW * 0.66, pavY + 8, 4, 18);
        ctx.fillRect(pavX + pavW, pavY + 8, 4, 18);

        // Dancheong brackets (단청 공포)
        ctx.fillStyle = '#059669';
        ctx.fillRect(pavX - 4, pavY + 5, pavW + 8, 4);

        // Curved Hanok Roof Tiles (기와 지붕)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(pavX - 14, pavY + 6);
        ctx.quadraticCurveTo(pavX + pavW * 0.5, pavY - 14, pavX + pavW + 14, pavY + 6);
        ctx.lineTo(pavX + pavW + 10, pavY + 8);
        ctx.lineTo(pavX - 10, pavY + 8);
        ctx.closePath();
        ctx.fill();

        // Hanging Plaque (현판: 풍락헌)
        ctx.fillStyle = '#000000';
        ctx.fillRect(pavX + pavW * 0.5 - 12, pavY + 9, 24, 7);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 5px "Noto Serif KR", serif';
        ctx.textAlign = 'center';
        ctx.fillText('豊樂軒', pavX + pavW * 0.5, pavY + 14.5);
        ctx.restore();

        // Five-Direction Flags (오방기: 청룡기, 백호기, 주작기, 황룡기) along borders
        const drawFlag = (fx: number, fy: number, col: string) => {
          ctx.save();
          // Pole
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx, fy - 32);
          ctx.stroke();

          // Brass finial
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(fx, fy - 32, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Billowing flag fabric
          const wave = Math.sin(time * 0.008 + fx) * 5;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(fx, fy - 30);
          ctx.quadraticCurveTo(fx + 14, fy - 30 + wave, fx + 26, fy - 26 + wave * 0.5);
          ctx.lineTo(fx + 26, fy - 14 + wave * 0.5);
          ctx.quadraticCurveTo(fx + 14, fy - 18 + wave, fx, fy - 18);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        };

        drawFlag(width * 0.22, height * 0.55, '#2563eb'); // 청룡기 (Blue)
        drawFlag(width * 0.32, height * 0.55, '#f8fafc'); // 백호기 (White)
        drawFlag(width * 0.65, height * 0.55, '#dc2626'); // 주작기 (Red)
        drawFlag(width * 0.78, height * 0.55, '#eab308'); // 황룡기 (Yellow)
      } else {
        // --- Modern Olympic Archery Field Background ---
        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
        skyGrad.addColorStop(0, '#38bdf8');
        skyGrad.addColorStop(0.7, '#bae6fd');
        skyGrad.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height * 0.55);

        // Mountains in background
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.52);
        ctx.lineTo(width * 0.15, height * 0.42);
        ctx.lineTo(width * 0.35, height * 0.48);
        ctx.lineTo(width * 0.55, height * 0.40);
        ctx.lineTo(width * 0.75, height * 0.47);
        ctx.lineTo(width, height * 0.41);
        ctx.lineTo(width, height * 0.55);
        ctx.lineTo(0, height * 0.55);
        ctx.fill();

        // Tree line
        ctx.fillStyle = '#1e3a24';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.55);
        for (let x = 0; x <= width; x += 16) {
          const h = Math.sin(x * 0.05) * 6 + 12;
          ctx.lineTo(x, height * 0.53 - h);
        }
        ctx.lineTo(width, height * 0.55);
        ctx.fill();
      }

      // Ground & Track Rendering
      if (isHorseback) {
        // --- Horseback Archery Dirt Gallop Track (마상궁술 기사 주로) ---
        const dirtGrad = ctx.createLinearGradient(0, height * 0.54, 0, height);
        dirtGrad.addColorStop(0, '#59381e');
        dirtGrad.addColorStop(0.4, '#854d0e');
        dirtGrad.addColorStop(1, '#a16207');
        ctx.fillStyle = dirtGrad;
        ctx.fillRect(0, height * 0.54, width, height * 0.46);

        // Galloping Track Borders (wooden fencing rushing by)
        const trackSpeed = (time * 0.04) % 40;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;

        // Left & Right Lane Rails
        ctx.beginPath();
        ctx.moveTo(width * 0.5 - 35, height * 0.54);
        ctx.lineTo(width * 0.05, height);
        ctx.moveTo(width * 0.5 + 35, height * 0.54);
        ctx.lineTo(width * 0.95, height);
        ctx.stroke();

        // Rushing Wooden Fence Posts
        for (let i = 0; i < 7; i++) {
          const depth = ((i * 35 + trackSpeed) % 240) / 240;
          const py = height * 0.54 + Math.pow(depth, 1.8) * (height * 0.46);
          const lx = width * 0.5 - 35 - (width * 0.45) * depth;
          const rx = width * 0.5 + 35 + (width * 0.45) * depth;
          const postH = 6 + depth * 35;

          ctx.fillStyle = '#451a03';
          ctx.fillRect(lx - 2, py - postH, 4 * (0.4 + depth * 0.8), postH);
          ctx.fillRect(rx - 2, py - postH, 4 * (0.4 + depth * 0.8), postH);
        }

        // Gallop Dust Particles along bottom
        ctx.fillStyle = 'rgba(217, 119, 6, 0.25)';
        for (let d = 0; d < 8; d++) {
          const dx = width * 0.5 + (Math.sin(time * 0.01 + d) * 120);
          const dy = height - 15 + Math.cos(time * 0.015 + d) * 12;
          ctx.beginPath();
          ctx.arc(dx, dy, 14 + (d % 3) * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // --- Stationary Archery Range Lawn ---
        const groundGrad = ctx.createLinearGradient(0, height * 0.55, 0, height);
        if (isTraditional) {
          groundGrad.addColorStop(0, '#15803d');
          groundGrad.addColorStop(0.5, '#166534');
          groundGrad.addColorStop(1, '#3f6212');
        } else {
          groundGrad.addColorStop(0, '#15803d');
          groundGrad.addColorStop(0.3, '#16a34a');
          groundGrad.addColorStop(1, '#22c55e');
        }
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, height * 0.55, width, height * 0.45);

        // Lane lines
        ctx.strokeStyle = isTraditional ? 'rgba(253, 230, 138, 0.35)' : 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(width * 0.5, height * 0.55);
        ctx.lineTo(width * 0.5, height);
        ctx.moveTo(width * 0.5 - 30, height * 0.55);
        ctx.lineTo(width * 0.1, height);
        ctx.moveTo(width * 0.5 + 30, height * 0.55);
        ctx.lineTo(width * 0.9, height);
        ctx.stroke();

        // Distance markers
        const distMarkers = [
          { d: 70, y: height * 0.555, w: 90 },
          { d: 50, y: height * 0.59, w: 150 },
          { d: 30, y: height * 0.65, w: 240 },
          { d: 18, y: height * 0.75, w: 380 },
        ];
        distMarkers.forEach(m => {
          ctx.strokeStyle = isTraditional ? 'rgba(253, 230, 138, 0.25)' : 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(width * 0.5 - m.w / 2, m.y);
          ctx.lineTo(width * 0.5 + m.w / 2, m.y);
          ctx.stroke();

          ctx.fillStyle = isTraditional ? 'rgba(254, 240, 138, 0.7)' : 'rgba(255, 255, 255, 0.6)';
          ctx.font = '10px "Noto Sans KR", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${m.d}m`, width * 0.5 - m.w / 2 - 14, m.y + 3);
        });
      }

      // 2. Target Position & Geometry Calculation
      let targetCenterX = width * 0.5 + currentTargetOffsetX;
      let targetCenterY = height * 0.48;
      let targetRadius = 45;
      let targetOpacity = 1;

      if (isHorseback && horseTargetState) {
        targetRadius = horseTargetState.targetRadius;
        targetCenterX = horseTargetState.targetCenterX;
        targetCenterY = horseTargetState.targetCenterY;
        targetOpacity = horseTargetState.opacity;
      } else {
        const distRatio = (70 - distance) / (70 - 18);
        targetRadius = 38 + distRatio * 52;
        targetCenterY = height * 0.48 - distRatio * 15;
      }

      // 3. Draw Archery Target
      ctx.save();
      if (isHorseback) {
        ctx.globalAlpha = targetOpacity;
      }

      // Tripod / Wooden Post Stand
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(targetCenterX - targetRadius * 0.4, targetCenterY + targetRadius * 0.7);
      ctx.lineTo(targetCenterX - targetRadius * 0.9, targetCenterY + targetRadius * 2.1);
      ctx.moveTo(targetCenterX + targetRadius * 0.4, targetCenterY + targetRadius * 0.7);
      ctx.lineTo(targetCenterX + targetRadius * 0.9, targetCenterY + targetRadius * 2.1);
      ctx.moveTo(targetCenterX, targetCenterY + targetRadius * 0.5);
      ctx.lineTo(targetCenterX, targetCenterY + targetRadius * 2.0);
      ctx.stroke();

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(targetCenterX, targetCenterY + targetRadius * 2.1, targetRadius * 1.1, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Target Backing (Square Wooden Board for Joseon / Circular for Olympic)
      if (isTraditional) {
        // Joseon Traditional Archery Target (목제 웅후 과녁 - 백지 & 홍심)
        ctx.fillStyle = '#451a03';
        ctx.fillRect(
          targetCenterX - targetRadius * 1.18,
          targetCenterY - targetRadius * 1.18,
          targetRadius * 2.36,
          targetRadius * 2.36
        );

        // Brass corner braces
        ctx.fillStyle = '#d97706';
        const cr = targetRadius * 1.18;
        ctx.fillRect(targetCenterX - cr, targetCenterY - cr, 10, 10);
        ctx.fillRect(targetCenterX + cr - 10, targetCenterY - cr, 10, 10);
        ctx.fillRect(targetCenterX - cr, targetCenterY + cr - 10, 10, 10);
        ctx.fillRect(targetCenterX + cr - 10, targetCenterY + cr - 10, 10, 10);

        // White parchment/rice paper target surface
        ctx.fillStyle = '#fefce8';
        ctx.beginPath();
        ctx.arc(targetCenterX, targetCenterY, targetRadius * 1.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Traditional Joseon Score Rings:
        // Outer Black Rim -> Blue -> White -> Crimson Hongsim (홍심)
        const joseonRings = [
          { r: 0.9, col: '#18181b' },
          { r: 0.72, col: '#1d4ed8' },
          { r: 0.48, col: '#f8fafc' },
          { r: 0.25, col: '#dc2626' }, // Crimson Center "홍심 (紅心)"
        ];
        joseonRings.forEach(item => {
          ctx.fillStyle = item.col;
          ctx.beginPath();
          ctx.arc(targetCenterX, targetCenterY, targetRadius * item.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = item.col === '#18181b' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        // Golden Inner Center (貫中 Bullseye)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(targetCenterX, targetCenterY, targetRadius * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Traditional "心" or "+" mark in center
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(targetCenterX - 3.5, targetCenterY);
        ctx.lineTo(targetCenterX + 3.5, targetCenterY);
        ctx.moveTo(targetCenterX, targetCenterY - 3.5);
        ctx.lineTo(targetCenterX, targetCenterY + 3.5);
        ctx.stroke();
      } else {
        // Olympic Standard Target
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(targetCenterX, targetCenterY, targetRadius * 1.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 2;
        ctx.stroke();

        const ringColors = [
          { r: 1.0, col: '#f8fafc' },
          { r: 0.8, col: '#18181b' },
          { r: 0.6, col: '#2563eb' },
          { r: 0.4, col: '#dc2626' },
          { r: 0.2, col: '#eab308' },
        ];
        ringColors.forEach(item => {
          ctx.fillStyle = item.col;
          ctx.beginPath();
          ctx.arc(targetCenterX, targetCenterY, targetRadius * item.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = item.col === '#18181b' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        // Internal dividing lines
        for (let i = 1; i <= 10; i++) {
          const rFraction = (11 - i) / 10;
          ctx.beginPath();
          ctx.arc(targetCenterX, targetCenterY, targetRadius * rFraction, 0, Math.PI * 2);
          ctx.strokeStyle = i >= 3 && i <= 4 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Inner X-Ring
        ctx.beginPath();
        ctx.arc(targetCenterX, targetCenterY, targetRadius * 0.05, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Horseback Optimal Firing Zone Halo Indicator
      if (isHorseback && horseInZone) {
        const pulse = (Math.sin(time * 0.015) + 1) * 0.5;
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 3 + pulse * 2;
        ctx.beginPath();
        ctx.arc(targetCenterX, targetCenterY, targetRadius * (1.2 + pulse * 0.15), 0, Math.PI * 2);
        ctx.stroke();

        // Firing Zone Badge on top of target
        ctx.fillStyle = 'rgba(22, 101, 52, 0.9)';
        ctx.fillRect(targetCenterX - 50, targetCenterY - targetRadius * 1.45 - 12, 100, 18);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1;
        ctx.strokeRect(targetCenterX - 50, targetCenterY - targetRadius * 1.45 - 12, 100, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚡ 사격 적기 (${Math.max(0, Math.round(horseRelDist))}m)`, targetCenterX, targetCenterY - targetRadius * 1.45);
      } else if (isHorseback && horseTargetState?.hasPassed) {
        // Target passing behind rider - Joseon Baesa (뒤돌아 쏘기) Zone
        ctx.fillStyle = 'rgba(153, 27, 27, 0.9)';
        ctx.fillRect(targetCenterX - 46, targetCenterY - targetRadius * 1.3 - 12, 92, 18);
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1;
        ctx.strokeRect(targetCenterX - 46, targetCenterY - targetRadius * 1.3 - 12, 92, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💨 과녁 통과 (배사 구역)', targetCenterX, targetCenterY - targetRadius * 1.3);
      }

      // Wind Flag on top of target
      const flagX = targetCenterX;
      const flagY = targetCenterY - targetRadius * 1.08;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(flagX, flagY);
      ctx.lineTo(flagX, flagY - 24);
      ctx.stroke();

      const flagWave = Math.sin(time * 0.008 * (wind.speed + 1)) * 4;
      const windDirX = Math.cos(wind.angle);
      ctx.fillStyle = isTraditional ? '#f59e0b' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(flagX, flagY - 24);
      ctx.quadraticCurveTo(
        flagX + windDirX * 16,
        flagY - 24 + flagWave,
        flagX + windDirX * 26,
        flagY - 18 + flagWave * 0.5
      );
      ctx.lineTo(flagX, flagY - 13);
      ctx.closePath();
      ctx.fill();

      // Previously landed arrows
      arrowHistory.forEach((arr, idx) => {
        const landedX = targetCenterX + arr.x * targetRadius;
        const landedY = targetCenterY + arr.y * targetRadius;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(landedX + 3, landedY + 4, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = bow.arrowShaftColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(landedX, landedY);
        ctx.lineTo(landedX - 12, landedY + 16);
        ctx.stroke();

        ctx.fillStyle = bow.arrowFletchColor;
        ctx.beginPath();
        ctx.arc(landedX - 12, landedY + 16, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 9px "Noto Sans KR", sans-serif';
        ctx.fillText(String(idx + 1), landedX - 16, landedY + 24);
      });

      ctx.restore();

      // First-Person Horse POV (Rear perspective: Withers, Neck, Back of Head & Ears)
      if (isHorseback) {
        ctx.save();
        const stridePhase = time * 0.009;
        const horseX = width * 0.5 + Math.sin(stridePhase * 0.5) * 6;
        // Positioned in lower-middle foreground
        const horseY = height - 42 + Math.sin(stridePhase) * 16;
        const horseTilt = Math.sin(stridePhase) * 0.035;

        ctx.translate(horseX, horseY);
        ctx.rotate(horseTilt);
        // Scaled up for grand immersive first-person presence
        ctx.scale(1.4, 1.4);

        // 1. Withers & Broad Upper Shoulders (등어깨 & 기갑 - 사수 바로 앞)
        const shoulderGrad = ctx.createLinearGradient(0, -60, 0, 80);
        shoulderGrad.addColorStop(0, '#78350f');
        shoulderGrad.addColorStop(0.6, '#632808');
        shoulderGrad.addColorStop(1, '#451a03');

        ctx.fillStyle = shoulderGrad;
        ctx.beginPath();
        ctx.moveTo(-82, 85);
        ctx.quadraticCurveTo(-45, 30, -36, -45);
        ctx.lineTo(36, -45);
        ctx.quadraticCurveTo(45, 30, 82, 85);
        ctx.closePath();
        ctx.fill();

        // Shoulder muscle depth shading (측면 음영)
        ctx.fillStyle = 'rgba(28, 10, 2, 0.35)';
        ctx.beginPath();
        ctx.moveTo(-82, 85);
        ctx.quadraticCurveTo(-50, 45, -36, -45);
        ctx.lineTo(-24, -45);
        ctx.quadraticCurveTo(-38, 45, -55, 85);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(82, 85);
        ctx.quadraticCurveTo(50, 45, 36, -45);
        ctx.lineTo(24, -45);
        ctx.quadraticCurveTo(38, 45, 55, 85);
        ctx.closePath();
        ctx.fill();

        // 2. Neck Crest (목덜미 능선 - 머리를 향해 뻗어 나가는 뒷목)
        const neckGrad = ctx.createLinearGradient(0, -115, 0, -45);
        neckGrad.addColorStop(0, '#92400e');
        neckGrad.addColorStop(1, '#78350f');

        ctx.fillStyle = neckGrad;
        ctx.beginPath();
        ctx.moveTo(-36, -45);
        ctx.quadraticCurveTo(-30, -85, -24, -112);
        ctx.lineTo(24, -112);
        ctx.quadraticCurveTo(30, -85, 36, -45);
        ctx.closePath();
        ctx.fill();

        // Spine highlight along neck crest (목 능선 중앙 하이라이트)
        ctx.strokeStyle = 'rgba(254, 215, 170, 0.22)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 50);
        ctx.lineTo(0, -108);
        ctx.stroke();

        // 3. Back of the Poll / Crown (말 뒤통수 / 정수리 뒷모습)
        ctx.fillStyle = '#85370c';
        ctx.beginPath();
        ctx.ellipse(0, -114, 25, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Back of the Ears (전방을 향해 쫑긋 선 양쪽 귀의 뒷면 - 벨벳 털 질감)
        const earFlick = Math.sin(stridePhase * 1.6) * 0.06;

        // Left ear (뒷모습 - 볼록한 곡면과 외곽 음영)
        ctx.save();
        ctx.fillStyle = '#6b2d0a';
        ctx.beginPath();
        ctx.moveTo(-18, -112);
        ctx.quadraticCurveTo(-32 + earFlick * 14, -135, -25 + earFlick * 16, -164);
        ctx.quadraticCurveTo(-14 + earFlick * 10, -145, -7, -118);
        ctx.closePath();
        ctx.fill();

        // Left ear central ridge / contour (귀 뒷면의 중앙 능선)
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-13, -116);
        ctx.quadraticCurveTo(-23 + earFlick * 14, -138, -25 + earFlick * 16, -162);
        ctx.stroke();

        // Left ear dark tip (귀 끝의 짙은 흑색 털)
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(-22 + earFlick * 15, -150);
        ctx.lineTo(-25 + earFlick * 16, -164);
        ctx.lineTo(-18 + earFlick * 12, -154);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Right ear (뒷모습 - 볼록한 곡면과 외곽 음영)
        ctx.save();
        ctx.fillStyle = '#6b2d0a';
        ctx.beginPath();
        ctx.moveTo(7, -118);
        ctx.quadraticCurveTo(14 - earFlick * 10, -145, 25 - earFlick * 16, -164);
        ctx.quadraticCurveTo(32 - earFlick * 14, -135, 18, -112);
        ctx.closePath();
        ctx.fill();

        // Right ear central ridge / contour (귀 뒷면의 중앙 능선)
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(13, -116);
        ctx.quadraticCurveTo(23 - earFlick * 14, -138, 25 - earFlick * 16, -162);
        ctx.stroke();

        // Right ear dark tip
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(18 - earFlick * 12, -154);
        ctx.lineTo(25 - earFlick * 16, -164);
        ctx.lineTo(22 - earFlick * 15, -150);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 5. Forelock & Mane (귀 사이 앞머리와 목덜미를 따라 휘날리는 풍성한 갈기)
        const maneWave = Math.sin(time * 0.016) * 8;
        ctx.fillStyle = '#18181b';

        // Forelock tuft between ears at poll (정수리 앞머리 털)
        ctx.beginPath();
        ctx.moveTo(-8, -120);
        ctx.quadraticCurveTo(0, -134, maneWave * 0.3, -140);
        ctx.quadraticCurveTo(5, -132, 8, -120);
        ctx.quadraticCurveTo(0, -115, -8, -120);
        ctx.fill();

        // Main neck mane (목덜미 옆으로 넘어가 바람에 휘날리는 흑마 갈기)
        ctx.beginPath();
        ctx.moveTo(-4, -114);
        ctx.quadraticCurveTo(-18 + maneWave * 0.6, -90, -28 + maneWave, -60);
        ctx.quadraticCurveTo(-38 + maneWave * 1.2, -20, -42 + maneWave * 0.8, 20);
        ctx.lineTo(-24, 25);
        ctx.quadraticCurveTo(-20, -20, -12, -60);
        ctx.quadraticCurveTo(-4, -90, 4, -114);
        ctx.closePath();
        ctx.fill();

        // Mane highlight strands (윤기 나는 갈기 결 표현)
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-2, -110);
        ctx.quadraticCurveTo(-15 + maneWave * 0.6, -80, -22 + maneWave, -40);
        ctx.moveTo(-6, -95);
        ctx.quadraticCurveTo(-26 + maneWave * 0.9, -50, -32 + maneWave, 0);
        ctx.stroke();

        // 6. Traditional Joseon Crownpiece Bridle (굴레 머리끈 - 뒤통수를 가로지르는 가죽 끈)
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-22, -105);
        ctx.quadraticCurveTo(0, -100, 22, -105);
        ctx.stroke();

        // Brass buckle / fittings behind the ears (황동 장식)
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(-22, -105, 3.5, 0, Math.PI * 2);
        ctx.arc(22, -105, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Red Joseon Tassel (홍모 유소 장식 - 바람에 휘날림)
        const tasselWave = Math.sin(time * 0.014) * 7;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(-22, -102);
        ctx.quadraticCurveTo(-32 + tasselWave, -75, -28 + tasselWave * 1.3, -48);
        ctx.lineTo(-22 + tasselWave * 1.3, -48);
        ctx.quadraticCurveTo(-26 + tasselWave, -75, -18, -102);
        ctx.closePath();
        ctx.fill();

        // 7. Leather Reins (고삐 - 앞쪽 재갈에서 사수의 양손으로 이어지는 팽팽한 가죽 끈)
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 3.5;
        // Left rein
        ctx.beginPath();
        ctx.moveTo(-24, -98);
        ctx.quadraticCurveTo(-70, -30, -135, 80);
        ctx.stroke();
        // Right rein
        ctx.beginPath();
        ctx.moveTo(24, -98);
        ctx.quadraticCurveTo(70, -30, 135, 80);
        ctx.stroke();

        ctx.restore();
      }

      // 3. Draw Flight Arrow (Active Projectile)
      if (flightArrowRef.current && flightArrowRef.current.active) {
        const fa = flightArrowRef.current;
        fa.progress += fa.speed * dt * 60;

        if (fa.progress >= 1) {
          // Impact occurred!
          fa.active = false;
          fa.progress = 1;

          // Play impact sound & trigger score callback
          archeryAudio.playTargetHitSound(fa.score);

          if (isTraditional && fa.score >= 9) {
            archeryAudio.playJoseonGongSound();
          }

          if (fa.score >= 10) {
            try {
              confetti({
                particleCount: fa.isX ? 70 : 40,
                spread: fa.isX ? 80 : 55,
                origin: { y: 0.6 },
                colors: ['#eab308', '#facc15', '#ef4444', '#3b82f6', '#ffffff'],
              });
            } catch {
              // Confetti fallback
            }
          }

          setLastHitPopup({
            score: fa.score,
            isX: fa.isX,
            id: `hit_${Date.now()}`,
            isTraditional,
          });

          onShotFired({
            id: `shot_${Date.now()}`,
            score: fa.score,
            isX: fa.isX,
            x: fa.relativeHitX,
            y: fa.relativeHitY,
            distanceMeters: distance,
            windSpeed: wind.speed,
            windAngle: wind.angle,
            time: Date.now(),
          });

          // Refresh wind for next shot in wind modes
          if (mode === 'wind_challenge') {
            refreshWind();
          }
        } else {
          // Render arrow in 1st-person flight (flying away into the depth)
          const p = fa.progress;
          // Ballistic curve trajectory towards target
          const currX = fa.startX + (fa.targetHitX - fa.startX) * p;
          const currY = fa.startY + (fa.targetHitY - fa.startY) * p - Math.sin(p * Math.PI) * 14;

          // Arrow perspective scaling (shrinks as it flies away downrange)
          const scale = Math.max(0.2, 1 - p * 0.78);
          const shaftLen = 85 * scale;

          const dx = fa.targetHitX - fa.startX;
          const dy = fa.targetHitY - fa.startY;
          const dist = Math.hypot(dx, dy) || 1;
          const ux = dx / dist;
          const uy = dy / dist;

          const tailX = currX - ux * shaftLen;
          const tailY = currY - uy * shaftLen + (1 - p) * 12;

          ctx.save();
          // Arrow shaft
          ctx.strokeStyle = bow.arrowShaftColor;
          ctx.lineWidth = Math.max(2, 6 * scale);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(currX, currY);
          ctx.stroke();

          // Steel tip
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(currX, currY, Math.max(1.8, 3.5 * scale), 0, Math.PI * 2);
          ctx.fill();

          // Fletchings at tail
          ctx.fillStyle = bow.arrowFletchColor;
          ctx.beginPath();
          ctx.arc(tailX, tailY, Math.max(2.5, 6.5 * scale), 0, Math.PI * 2);
          ctx.fill();

          // Speed tracer trail
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tailX - ux * 20 * scale, tailY - uy * 20 * scale);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();

          ctx.restore();
        }
      }

      // 4. Update Aiming & Breathing Tremor
      // Hand tremor formula:
      // Base tremor depends on bow.stability (0 ~ 100)
      const baseTremorAmp = (100 - stats.stability) * 0.16 + 2.0; // 2px to 18px tremor
      // Fatigue multiplier if drawn longer than staminaTime
      let currentFatigue = 0;
      if (isDrawing && drawStartTimeRef.current > 0) {
        const holdTime = (time - drawStartTimeRef.current) / 1000;
        if (holdTime > stats.staminaTime) {
          currentFatigue = Math.min(1.0, (holdTime - stats.staminaTime) / 3.0);
        }
      }
      setFatigue(currentFatigue);

      // Natural breathing sway (lissajous curve) + fatigue jitter
      const breathX = Math.sin(breathTime * 0.8) * baseTremorAmp * (1 + currentFatigue * 3.5);
      const breathY = Math.cos(breathTime * 1.6) * (baseTremorAmp * 0.8) * (1 + currentFatigue * 3.5);

      // Smooth cursor lerp
      const targetAimX = mousePosRef.current.x + breathX;
      const targetAimY = mousePosRef.current.y + breathY;
      aimPosRef.current.x += (targetAimX - aimPosRef.current.x) * 0.25;
      aimPosRef.current.y += (targetAimY - aimPosRef.current.y) * 0.25;

      const aimX = aimPosRef.current.x;
      const aimY = aimPosRef.current.y;

      // 5. Draw Complete First-Person Perspective (POV) Bow & Hand in Archer's View
      ctx.save();

      // In real first-person archery:
      // The archer looks along the line of sight (aimX, aimY).
      // The bow riser is held vertically in the left hand, just to the left of the aiming eye line.
      // The arrow points directly forward into the depth toward the target.
      const tension = drawProgress; // 0 (idle) to 1 (full draw)

      // Riser Anchor position relative to aim point
      const riserDistLeft = 68; // px to the left of sight pin
      const riserCenterX = aimX - riserDistLeft;
      const riserCenterY = aimY + 38;

      // Archer's Eye Anchor Point for the bowstring nock (near bottom-center / chin of viewer)
      // When drawn, the string comes right up to the archer's jaw/eye
      const idleNockX = riserCenterX + 8;
      const idleNockY = riserCenterY + 2;
      const fullDrawNockX = aimX + 18;
      const fullDrawNockY = height * 0.90;

      const nockX = idleNockX + (fullDrawNockX - idleNockX) * tension;
      const nockY = idleNockY + (fullDrawNockY - idleNockY) * tension;

      // Limb tip positions in 1st person
      // Upper limb rises high towards top of viewport
      // Lower limb drops towards bottom left
      const limbBendX = tension * 16;
      const limbBendY = tension * 32;

      const upperTipX = riserCenterX - 18 - limbBendX;
      const upperTipY = Math.max(15, riserCenterY - height * 0.58 + limbBendY);

      const lowerTipX = riserCenterX - 28 - limbBendX;
      const lowerTipY = Math.min(height - 15, riserCenterY + height * 0.56 - limbBendY);

      // --- A. Archer's Left Forearm & Hand (Bow Hand) ---
      // Forearm enters from bottom left corner towards the riser grip
      const gripX = riserCenterX + 4;
      const gripY = riserCenterY + 24;

      ctx.save();
      // Forearm shadow and arm
      const armGrad = ctx.createLinearGradient(0, height, gripX, gripY);
      armGrad.addColorStop(0, '#78350f'); // Archer's arm sleeve
      armGrad.addColorStop(0.6, '#92400e');
      armGrad.addColorStop(1, '#b45309');

      ctx.fillStyle = armGrad;
      ctx.beginPath();
      ctx.moveTo(-10, height + 10);
      ctx.lineTo(width * 0.12, height + 10);
      ctx.lineTo(gripX + 14, gripY + 28);
      ctx.lineTo(gripX - 16, gripY + 36);
      ctx.closePath();
      ctx.fill();

      // Archer's Leather Shooting Glove / Hand wrap around the riser
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(gripX - 4, gripY + 14, 18, 22, -Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();

      // Thumb wrapping forward around riser
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(gripX + 8, gripY + 12, 10, 7, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- B. Stabilizer Rod (Foreshortened 3D Perspective pointing forward) ---
      if (bow.stabilizer !== 'none') {
        const rodBaseX = riserCenterX + 2;
        const rodBaseY = riserCenterY;

        // Perspective projection: rod points into the screen towards the target
        const rodEndX = rodBaseX + 18;
        const rodEndY = rodBaseY - 22;

        ctx.save();
        // Carbon rod shadow
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(rodBaseX, rodBaseY);
        ctx.lineTo(rodEndX, rodEndY);
        ctx.stroke();

        // Carbon weave highlight
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(rodBaseX, rodBaseY);
        ctx.lineTo(rodEndX, rodEndY);
        ctx.stroke();

        // Stabilizer tip damper & gold weights
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(rodEndX, rodEndY, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b'; // Gold weight disc
        ctx.beginPath();
        ctx.arc(rodEndX, rodEndY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // V-bar side rods if equipped
        if (bow.stabilizer === 'vbar_multi') {
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 4;
          // Left side rod
          ctx.beginPath();
          ctx.moveTo(rodBaseX, rodBaseY);
          ctx.lineTo(rodBaseX - 35, rodBaseY + 28);
          ctx.stroke();
          // Right side rod
          ctx.beginPath();
          ctx.moveTo(rodBaseX, rodBaseY);
          ctx.lineTo(rodBaseX - 10, rodBaseY + 45);
          ctx.stroke();
        }
        ctx.restore();
      }

      // --- C. Bow Limbs (Upper & Lower) in First Person ---
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = bow.type === 'compound' ? 18 : 15;
      ctx.strokeStyle = bow.limbColor;

      // Upper Limb: stretches from riser top up to upper tip
      const riserTopX = riserCenterX - 10;
      const riserTopY = riserCenterY - 65;

      ctx.beginPath();
      ctx.moveTo(riserTopX, riserTopY);
      if (bow.type === 'recurve' || bow.type === 'tactical') {
        ctx.bezierCurveTo(
          riserCenterX - 32, riserCenterY - 180,
          riserCenterX + 8 - limbBendX, riserCenterY - 320,
          upperTipX, upperTipY
        );
      } else if (bow.type === 'compound') {
        ctx.bezierCurveTo(
          riserCenterX - 25, riserCenterY - 140,
          riserCenterX - 10 - limbBendX, riserCenterY - 260,
          upperTipX, upperTipY
        );
      } else {
        // Traditional Korean Horn bow: iconic reflex recurve curve
        ctx.bezierCurveTo(
          riserCenterX - 45, riserCenterY - 140,
          riserCenterX + 25 - limbBendX, riserCenterY - 260,
          upperTipX, upperTipY
        );
      }
      ctx.stroke();

      // Lower Limb: stretches from riser bottom down to lower tip
      const riserBottomX = riserCenterX - 12;
      const riserBottomY = riserCenterY + 75;

      ctx.beginPath();
      ctx.moveTo(riserBottomX, riserBottomY);
      if (bow.type === 'recurve' || bow.type === 'tactical') {
        ctx.bezierCurveTo(
          riserCenterX - 35, riserCenterY + 180,
          riserCenterX + 4 - limbBendX, riserCenterY + 300,
          lowerTipX, lowerTipY
        );
      } else if (bow.type === 'compound') {
        ctx.bezierCurveTo(
          riserCenterX - 28, riserCenterY + 150,
          riserCenterX - 14 - limbBendX, riserCenterY + 250,
          lowerTipX, lowerTipY
        );
      } else {
        // Traditional Korean Horn bow
        ctx.bezierCurveTo(
          riserCenterX - 48, riserCenterY + 150,
          riserCenterX + 20 - limbBendX, riserCenterY + 250,
          lowerTipX, lowerTipY
        );
      }
      ctx.stroke();

      // Limb Decals / Accent Stripes
      if (bow.limbPattern === 'stripes' || bow.limbPattern === 'dragon') {
        ctx.strokeStyle = bow.riserColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(riserTopX - 4, riserCenterY - 140);
        ctx.lineTo(riserTopX + 6, riserCenterY - 165);
        ctx.moveTo(riserBottomX - 4, riserCenterY + 140);
        ctx.lineTo(riserBottomX + 6, riserCenterY + 165);
        ctx.stroke();
      }
      ctx.restore();

      // --- D. Compound Cams (if compound bow) in 1st Person ---
      if (bow.type === 'compound') {
        ctx.save();
        ctx.fillStyle = '#09090b';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;

        // Top Cam
        ctx.beginPath();
        ctx.ellipse(upperTipX, upperTipY, 18, 12, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Bottom Cam
        ctx.beginPath();
        ctx.ellipse(lowerTipX, lowerTipY, 18, 12, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Compound Cables
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(upperTipX, upperTipY);
        ctx.lineTo(lowerTipX + 12, lowerTipY - 30);
        ctx.moveTo(lowerTipX, lowerTipY);
        ctx.lineTo(upperTipX + 12, upperTipY + 30);
        ctx.stroke();
        ctx.restore();
      }

      // --- E. Bow Riser (Central Handle Frame & Sight Window) ---
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 24;
      ctx.strokeStyle = bow.riserColor;

      // Sight window cutout shape (canted slightly)
      ctx.beginPath();
      ctx.moveTo(riserTopX, riserTopY);
      // Upper sight window cut inward to allow clear view of target
      ctx.lineTo(riserCenterX - 18, riserCenterY - 35);
      ctx.lineTo(riserCenterX - 22, riserCenterY - 10);
      // Shelf & Plunger button location (arrow rest)
      ctx.lineTo(riserCenterX - 4, riserCenterY + 10);
      // Grip section
      ctx.lineTo(riserCenterX + 4, riserCenterY + 28);
      ctx.lineTo(riserCenterX - 6, riserCenterY + 55);
      ctx.lineTo(riserBottomX, riserBottomY);
      ctx.stroke();

      // Metallic / Material Highlight reflection
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(riserCenterX - 16, riserCenterY - 30);
      ctx.lineTo(riserCenterX - 20, riserCenterY - 8);
      ctx.stroke();

      // Ergonomic Grip Wrap
      ctx.lineWidth = 26;
      ctx.strokeStyle = bow.gripColor;
      ctx.beginPath();
      ctx.moveTo(riserCenterX + 3, riserCenterY + 14);
      ctx.lineTo(riserCenterX + 5, riserCenterY + 38);
      ctx.stroke();
      ctx.restore();

      // --- F. Arrow Rest / Shelf ---
      const arrowRestX = riserCenterX - 6;
      const arrowRestY = riserCenterY + 6;

      ctx.save();
      // Arrow rest wire flipper / cushion plunger
      ctx.fillStyle = '#18181b';
      ctx.fillRect(arrowRestX - 4, arrowRestY - 3, 14, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(arrowRestX + 8, arrowRestY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- G. Sight Mounting Bracket & Sight Housing ---
      // The sight is physically mounted to the riser and extends to aimX, aimY!
      if (bow.sight !== 'none') {
        ctx.save();
        // Horizontal carbon extension bar from riser to reticle
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(riserCenterX - 18, aimY);
        ctx.lineTo(aimX - 22, aimY);
        ctx.stroke();

        // Vertical micro-click elevation adjustment bar
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(aimX - 22, aimY - 18);
        ctx.lineTo(aimX - 22, aimY + 18);
        ctx.stroke();

        // Sight Pin Arm holding scope ring at aimX
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(aimX - 22, aimY);
        ctx.lineTo(aimX - 12, aimY);
        ctx.stroke();
        ctx.restore();
      }

      // --- H. The Arrow in Foreshortened 1st-Person Perspective ---
      // Arrow runs from nock near shooter's eye, through arrow rest on riser, to steel point
      if (flightArrowRef.current?.active !== true) {
        // Arrow tip extends beyond riser towards target
        // When drawn, the arrow slides back through the rest!
        const arrowDrawnOffset = tension * 42;
        const arrowTipX = arrowRestX + 55 - arrowDrawnOffset;
        const arrowTipY = aimY + 6;

        ctx.save();
        // Foreshortened Arrow Shaft (tapering in perspective from thick near eye to thin at tip)
        const shaftGrad = ctx.createLinearGradient(nockX, nockY, arrowTipX, arrowTipY);
        shaftGrad.addColorStop(0, bow.arrowShaftColor);
        shaftGrad.addColorStop(0.4, bow.arrowShaftColor);
        shaftGrad.addColorStop(1, '#52525b');

        // Shaft main body
        ctx.strokeStyle = shaftGrad;
        ctx.lineWidth = 9 - tension * 2.5; // Thicker when close to camera
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(nockX, nockY);
        ctx.lineTo(arrowTipX, arrowTipY);
        ctx.stroke();

        // Shaft 3D shadow/highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nockX - 2, nockY - 2);
        ctx.lineTo(arrowTipX, arrowTipY - 1);
        ctx.stroke();

        // Arrow Target Point (Steel Bullet Tip)
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(arrowTipX, arrowTipY - 4);
        ctx.lineTo(arrowTipX + 16, arrowTipY);
        ctx.lineTo(arrowTipX, arrowTipY + 4);
        ctx.closePath();
        ctx.fill();

        // Arrow Fletchings (Feathers right at the Nock in front of viewer's eye)
        const fletchScale = 1.0 + tension * 0.4;
        ctx.fillStyle = bow.arrowFletchColor;

        // Cock feather (left)
        ctx.beginPath();
        ctx.moveTo(nockX - 4, nockY);
        ctx.lineTo(nockX - 28 * fletchScale, nockY - 6);
        ctx.lineTo(nockX - 58 * fletchScale, nockY - 14);
        ctx.lineTo(nockX - 48 * fletchScale, nockY);
        ctx.closePath();
        ctx.fill();

        // Top hen feather (up)
        ctx.beginPath();
        ctx.moveTo(nockX, nockY - 4);
        ctx.lineTo(nockX + 10, nockY - 26 * fletchScale);
        ctx.lineTo(nockX + 18, nockY - 52 * fletchScale);
        ctx.lineTo(nockX + 4, nockY - 38 * fletchScale);
        ctx.closePath();
        ctx.fill();

        // Bottom hen feather (down)
        ctx.beginPath();
        ctx.moveTo(nockX, nockY + 4);
        ctx.lineTo(nockX + 12, nockY + 22 * fletchScale);
        ctx.lineTo(nockX + 20, nockY + 44 * fletchScale);
        ctx.lineTo(nockX + 4, nockY + 32 * fletchScale);
        ctx.closePath();
        ctx.fill();

        // Arrow Nock (Clips onto string)
        ctx.fillStyle = bow.arrowNockColor;
        ctx.beginPath();
        ctx.arc(nockX, nockY, 5.5 * fletchScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- I. Bowstring in 1st Person (From Top Tip -> Eye Nock -> Bottom Tip) ---
      ctx.save();
      ctx.strokeStyle = bow.stringColor;
      ctx.lineWidth = 2.8;
      ctx.shadowColor = bow.stringColor;
      ctx.shadowBlur = 4;

      ctx.beginPath();
      // Upper string segment
      ctx.moveTo(upperTipX, upperTipY);
      ctx.lineTo(nockX, nockY);
      // Lower string segment
      ctx.lineTo(lowerTipX, lowerTipY);
      ctx.stroke();

      // Brass Nocking Point Bead
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(nockX, nockY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore(); // Restore bow transform

      // 6. Draw Custom Sight Reticle
      ctx.save();
      if (bow.sight === 'optic_circle') {
        // Olympic Circular Ring Reticle
        ctx.strokeStyle = bow.sightColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(aimX, aimY, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs with center gap
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(aimX - 35, aimY);
        ctx.lineTo(aimX - 22, aimY);
        ctx.moveTo(aimX + 22, aimY);
        ctx.lineTo(aimX + 35, aimY);
        ctx.moveTo(aimX, aimY - 35);
        ctx.lineTo(aimX, aimY - 22);
        ctx.moveTo(aimX, aimY + 22);
        ctx.lineTo(aimX, aimY + 35);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = bow.sightColor;
        ctx.beginPath();
        ctx.arc(aimX, aimY, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (bow.sight === 'pin_single') {
        // Vertical Pin with fiber optic bead
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(aimX, aimY + 28);
        ctx.lineTo(aimX, aimY);
        ctx.stroke();

        // Glowing fluorescent fiber optic pin tip
        ctx.fillStyle = bow.sightColor;
        ctx.shadowColor = bow.sightColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(aimX, aimY, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (bow.sight === 'pin_multi') {
        // Multi-Pin sight for different yardages
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(aimX - 25, aimY);
        ctx.lineTo(aimX + 25, aimY);
        ctx.stroke();

        // 3 distance pins (green, yellow, red)
        const pins = [
          { dy: -12, col: '#22c55e' },
          { dy: 0, col: bow.sightColor },
          { dy: 12, col: '#ef4444' },
        ];
        pins.forEach(p => {
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(aimX, aimY + p.dy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (bow.sight === 'laser_dot') {
        // Cyber Laser Dot with holographic bracket
        ctx.strokeStyle = bow.sightColor;
        ctx.lineWidth = 1.8;
        // Corner brackets
        const bSize = 16;
        // top-left
        ctx.beginPath();
        ctx.moveTo(aimX - bSize, aimY - bSize + 6);
        ctx.lineTo(aimX - bSize, aimY - bSize);
        ctx.lineTo(aimX - bSize + 6, aimY - bSize);
        // top-right
        ctx.moveTo(aimX + bSize - 6, aimY - bSize);
        ctx.lineTo(aimX + bSize, aimY - bSize);
        ctx.lineTo(aimX + bSize, aimY - bSize + 6);
        // bot-left
        ctx.moveTo(aimX - bSize, aimY + bSize - 6);
        ctx.lineTo(aimX - bSize, aimY + bSize);
        ctx.lineTo(aimX - bSize + 6, aimY + bSize);
        // bot-right
        ctx.moveTo(aimX + bSize - 6, aimY + bSize);
        ctx.lineTo(aimX + bSize, aimY + bSize);
        ctx.lineTo(aimX + bSize, aimY + bSize - 6);
        ctx.stroke();

        ctx.fillStyle = bow.sightColor;
        ctx.shadowColor = bow.sightColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(aimX, aimY, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Barebow: faint arrow rest notch
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(aimX, aimY, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 7. Draw Pull Tension & Stamina Indicator HUD
      if (isDrawing) {
        ctx.save();
        const hudX = aimX + 36;
        const hudY = aimY - 20;

        // Tension Arc
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(hudX, hudY, 18, -Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();

        const tensionCol = currentFatigue > 0.5 ? '#ef4444' : drawProgress > 0.9 ? '#22c55e' : '#f59e0b';
        ctx.strokeStyle = tensionCol;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(hudX, hudY, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * drawProgress);
        ctx.stroke();

        // Text percentage
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(drawProgress * 100)}%`, hudX, hudY + 4);

        // Fatigue warning indicator if shaking
        if (currentFatigue > 0.1) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('손떨림 발생 (피로)', aimX, aimY - 32);
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [bow, stats, distance, mode, isDrawing, drawProgress, wind, arrowHistory]);

  // Pointer / Mouse interaction handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (flightArrowRef.current?.active) return; // Wait for current arrow to land
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mousePosRef.current = { x, y };
    setIsDrawing(true);
    setDrawProgress(0);
    drawStartTimeRef.current = performance.now();
    archeryAudio.playDrawSound(0.2);

    // Rapid draw accumulation
    const drawTimer = setInterval(() => {
      setDrawProgress(prev => {
        if (prev >= 1) {
          clearInterval(drawTimer);
          return 1;
        }
        return prev + 0.15;
      });
    }, 45);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    // Release sound
    archeryAudio.playReleaseSound(bow.drawWeight);

    // Ballistic calculation:
    // Arrow flies towards targetCenter
    const distRatio = (70 - distance) / (70 - 18);
    let targetRadius = 38 + distRatio * 52;
    let targetCenterX = width * 0.5 + targetOffset;
    let targetCenterY = height * 0.48 - distRatio * 15;

    // Horseback Mode Dynamic Target Geometry & Inertia
    let horseTargetSide: 'right' | 'left' = 'right';
    if (mode === 'horseback') {
      const horseState = computeHorseTargetState(gallopDistRef.current, gallopLapRef.current, width, height);
      targetRadius = horseState.targetRadius;
      targetCenterX = horseState.targetCenterX;
      targetCenterY = horseState.targetCenterY;
      horseTargetSide = horseState.side;
    }

    // Aim offset from target center in pixels
    const aimX = aimPosRef.current.x;
    const aimY = aimPosRef.current.y;

    // Gravity drop:
    // Less draw weight or greater distance => more drop
    const dropFactor = (distance / 70) * (60 / stats.velocity) * 12;
    // If not fully drawn, heavy drop
    const underdrawDrop = (1 - drawProgress) * 45;

    // Wind drift:
    // Lateral drift vector based on wind speed & angle, reduced by bow.windResistance
    const windPushMagnitude = (wind.speed * (distance / 40) * 16) * (1 - stats.windResistance / 100);
    const windDriftX = Math.cos(wind.angle) * windPushMagnitude;
    const windDriftY = Math.sin(wind.angle) * windPushMagnitude * 0.4;

    // In horseback archery, add gallop momentum compensation
    const gallopMomentumX = mode === 'horseback' ? (horseTargetSide === 'right' ? 3 : -3) : 0;

    const finalTargetHitX = aimX + windDriftX + gallopMomentumX;
    const finalTargetHitY = aimY + dropFactor + underdrawDrop + windDriftY;

    // Compute relative distance on target from center
    const deltaX = finalTargetHitX - targetCenterX;
    const deltaY = finalTargetHitY - targetCenterY;
    const distanceToCenter = Math.hypot(deltaX, deltaY);
    const relativeRadius = distanceToCenter / targetRadius; // 0 (center) to 1.0 (ring 1)

    // Score calculation (World Archery 10-ring or Joseon Hongsim)
    let score = 0;
    let isX = false;
    if (relativeRadius <= 0.065) {
      score = 10;
      isX = true;
    } else if (relativeRadius <= 0.12) {
      score = 10;
    } else if (relativeRadius <= 0.22) {
      score = 9;
    } else if (relativeRadius <= 0.32) {
      score = 8;
    } else if (relativeRadius <= 0.42) {
      score = 7;
    } else if (relativeRadius <= 0.52) {
      score = 6;
    } else if (relativeRadius <= 0.62) {
      score = 5;
    } else if (relativeRadius <= 0.72) {
      score = 4;
    } else if (relativeRadius <= 0.82) {
      score = 3;
    } else if (relativeRadius <= 0.92) {
      score = 2;
    } else if (relativeRadius <= 1.02) {
      score = 1;
    } else {
      score = 0; // Miss
    }

    // Launch arrow projectile animation from 1st-person arrow rest position
    flightArrowRef.current = {
      active: true,
      startX: aimX - 22,
      startY: aimY + 6,
      targetHitX: finalTargetHitX,
      targetHitY: finalTargetHitY,
      progress: 0,
      speed: (stats.velocity / 300) * 0.05 + 0.03, // Flight duration ~0.35 - 0.55s
      relativeHitX: Number((deltaX / targetRadius).toFixed(3)),
      relativeHitY: Number((deltaY / targetRadius).toFixed(3)),
      score,
      isX,
    };

    setDrawProgress(0);
  };

  return (
    <div
      ref={containerRef}
      id="archery-canvas-container"
      className="relative w-full h-[620px] rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 shadow-2xl select-none"
    >
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        id="archery-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full cursor-crosshair touch-none"
      />

      {/* Top HUD Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        {/* Left: Distance & Mode Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-stone-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-stone-700/80 shadow-lg">
            <Crosshair className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              {mode === 'horseback' ? `${horsebackInfo.dist}M` : `${distance}M`}
            </span>
            <span className="text-[11px] text-stone-400">
              {mode === 'olympic'
                ? '올림픽 규격'
                : mode === 'wind_challenge'
                ? '돌풍 챌린지'
                : mode === 'moving_target'
                ? '이동 과녁'
                : mode === 'horseback'
                ? `마상궁술 (기사 騎射 - Lap ${horsebackInfo.lap})`
                : '자유 연습'}
            </span>
          </div>

          <button
            id="audio-toggle-btn"
            type="button"
            onClick={toggleMute}
            className="p-2 rounded-xl bg-stone-900/90 backdrop-blur-md border border-stone-700/80 text-stone-300 hover:text-white cursor-pointer transition-colors shadow-lg"
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>

        {/* Center: Horseback Target Nav OR Live Wind Speed Compass */}
        {mode === 'horseback' ? (
          <div className="flex items-center gap-2.5 bg-stone-900/95 backdrop-blur-md px-4 py-2 rounded-xl border border-stone-700/90 shadow-xl pointer-events-auto">
            {/* Left arrow if target is on the left */}
            {horsebackInfo.side === 'left' && (
              <span className="text-sm font-black text-amber-400 animate-pulse">◀ 좌측</span>
            )}

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-stone-200">
                  {horsebackInfo.targetName}
                </span>
                {horsebackInfo.inZone ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/70 text-[9.5px] font-black text-emerald-400 animate-pulse">
                    ⚡ 사격 적기!
                  </span>
                ) : horsebackInfo.hasPassed ? (
                  <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500/70 text-[9.5px] font-black text-rose-400">
                    💨 배사 구역
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-400">
                    {horsebackInfo.relDist}m 접근 중
                  </span>
                )}
              </div>
              <div className="w-28 h-1 bg-stone-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-150"
                  style={{ width: `${(horsebackInfo.dist % 100)}%` }}
                />
              </div>
            </div>

            {/* Right arrow if target is on the right */}
            {horsebackInfo.side === 'right' && (
              <span className="text-sm font-black text-amber-400 animate-pulse">우측 ▶</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-stone-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-stone-700/80 shadow-lg pointer-events-auto">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-stone-400 font-semibold leading-none">
                  풍속 & 풍향
                </span>
                <span className="text-xs font-black text-sky-300">
                  {wind.speed} m/s
                </span>
              </div>
            </div>
            {/* Rotating Wind Arrow */}
            <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center border border-stone-700">
              <div
                className="w-3.5 h-3.5 text-sky-400 transition-transform duration-500"
                style={{ transform: `rotate(${wind.angle}rad)` }}
              >
                ↑
              </div>
            </div>
          </div>
        )}

        {/* Right: Round Score counter & Reset */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-stone-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-stone-700/80 shadow-lg">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-stone-200">
              화살 {arrowHistory.length}발 발사
            </span>
          </div>

          <button
            id="reset-round-btn"
            type="button"
            onClick={() => {
              archeryAudio.playClickSound();
              onResetRound();
            }}
            className="p-2 rounded-xl bg-stone-900/90 backdrop-blur-md border border-stone-700/80 text-stone-300 hover:text-white cursor-pointer transition-colors shadow-lg"
            title="새 라운드 시작"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mini Target Close-Up Scope Camera (Top-Right Inset) */}
      <div className="absolute bottom-4 right-4 bg-stone-900/90 backdrop-blur-md p-3 rounded-2xl border border-stone-700 shadow-2xl pointer-events-auto w-44">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            {isTraditional ? '조선 웅후 과녁' : '과녁 스코프 뷰'}
          </span>
          <span className="text-[10px] text-stone-400">
            {arrowHistory.length}개 적중
          </span>
        </div>

        {/* SVG Mini Target */}
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-stone-950 border border-stone-800 flex items-center justify-center">
          <svg viewBox="-1.15 -1.15 2.3 2.3" className="w-full h-full">
            {isTraditional ? (
              <>
                {/* Joseon Wooden Board Backing */}
                <rect x="-1.05" y="-1.05" width="2.1" height="2.1" rx="0.1" fill="#451a03" stroke="#78350f" strokeWidth="0.04" />
                <rect x="-1.02" y="-1.02" width="0.16" height="0.16" fill="#d97706" />
                <rect x="0.86" y="-1.02" width="0.16" height="0.16" fill="#d97706" />
                <rect x="-1.02" y="0.86" width="0.16" height="0.16" fill="#d97706" />
                <rect x="0.86" y="0.86" width="0.16" height="0.16" fill="#d97706" />

                {/* White Paper Canvas */}
                <circle cx="0" cy="0" r="0.95" fill="#fefce8" stroke="#78350f" strokeWidth="0.02" />
                {/* Traditional Joseon Scoring Rings */}
                <circle cx="0" cy="0" r="0.85" fill="#18181b" stroke="#3f3f46" strokeWidth="0.015" />
                <circle cx="0" cy="0" r="0.65" fill="#1e3a8a" stroke="#1d4ed8" strokeWidth="0.015" />
                <circle cx="0" cy="0" r="0.45" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.015" />
                {/* Crimson Hongsim (홍심) */}
                <circle cx="0" cy="0" r="0.22" fill="#b91c1c" stroke="#991b1b" strokeWidth="0.015" />
                <circle cx="0" cy="0" r="0.07" fill="#dc2626" />
                <circle cx="0" cy="0" r="0.02" fill="#fef08a" />
              </>
            ) : (
              <>
                {/* 1,2 White */}
                <circle cx="0" cy="0" r="1.0" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.02" />
                {/* 3,4 Black */}
                <circle cx="0" cy="0" r="0.8" fill="#18181b" stroke="#3f3f46" strokeWidth="0.02" />
                {/* 5,6 Blue */}
                <circle cx="0" cy="0" r="0.6" fill="#2563eb" stroke="#1d4ed8" strokeWidth="0.02" />
                {/* 7,8 Red */}
                <circle cx="0" cy="0" r="0.4" fill="#dc2626" stroke="#b91c1c" strokeWidth="0.02" />
                {/* 9,10 Gold */}
                <circle cx="0" cy="0" r="0.2" fill="#eab308" stroke="#ca8a04" strokeWidth="0.02" />
                {/* Inner X */}
                <circle cx="0" cy="0" r="0.065" fill="none" stroke="#713f12" strokeWidth="0.02" strokeDasharray="0.03 0.02" />
              </>
            )}

            {/* Placed Arrow dots */}
            {arrowHistory.map((arr, idx) => (
              <g key={arr.id || idx}>
                <circle
                  cx={arr.x}
                  cy={arr.y}
                  r="0.04"
                  fill={arr.score >= 10 ? '#ef4444' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth="0.015"
                />
                <text
                  x={arr.x}
                  y={arr.y + 0.015}
                  fontSize="0.04"
                  fill="#ffffff"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {idx + 1}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Controls Hint / Bottom Tutorial */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-stone-900/85 backdrop-blur-md px-4 py-2.5 rounded-xl border border-stone-700/80 shadow-lg pointer-events-auto">
        <div className="text-xs text-stone-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="font-semibold text-white">조작법:</span>
          <span className="text-stone-300">
            마우스/터치를 <strong className="text-amber-400">누르고 있으면 활시위 장전</strong> → 조준 후 <strong className="text-amber-400">손을 떼면 발사!</strong>
          </span>
        </div>

        <button
          id="workshop-return-btn"
          type="button"
          onClick={() => {
            archeryAudio.playClickSound();
            onBackToWorkshop();
          }}
          className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 ml-2 cursor-pointer transition-colors border-l border-stone-700 pl-3"
        >
          <span>활 공방으로</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Score Impact Splash Badge */}
      {lastHitPopup && (
        <div
          key={lastHitPopup.id}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center animate-bounce"
        >
          <div
            className={`px-6 py-3 rounded-2xl font-black text-2xl shadow-2xl border ${
              lastHitPopup.isX
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-amber-500/50'
                : lastHitPopup.score >= 9
                ? 'bg-amber-400 text-stone-950 border-amber-300'
                : lastHitPopup.score >= 7
                ? 'bg-red-600 text-white border-red-400'
                : lastHitPopup.score >= 5
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-stone-800 text-white border-stone-600'
            }`}
          >
            {isTraditional ? (
              lastHitPopup.isX
                ? '🎯 貫中! 관중 (홍심 정중앙 X-10점!)'
                : lastHitPopup.score === 10
                ? '🌟 貫中! 관중 (홍심 10점 명중!)'
                : lastHitPopup.score >= 9
                ? `🎯 관중 (과녁 ${lastHitPopup.score}점)`
                : lastHitPopup.score > 0
                ? `🎯 변시 (${lastHitPopup.score}점)`
                : '💨 실사 (과녁 빗나감)'
            ) : (
              lastHitPopup.isX
                ? '🎯 PERFECT X-10점!'
                : lastHitPopup.score === 10
                ? '🌟 BULLSEYE 10점!'
                : lastHitPopup.score > 0
                ? `🎯 ${lastHitPopup.score}점!`
                : '💨 과녁 빗나감 (MISS)'
            )}
          </div>
        </div>
      )}
    </div>
  );
};
