import React, { useRef, useEffect, useState } from 'react';
import { BowConfig, BowStats } from '../types';
import { archeryAudio } from '../utils/audio';
import { Eye, Flame, Shield, Wind } from 'lucide-react';

interface BowPreviewProps {
  bow: BowConfig;
  stats: BowStats;
}

export const BowPreview: React.FC<BowPreviewProps> = ({ bow, stats }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawTension, setDrawTension] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Animate bow draw / release test
  useEffect(() => {
    let animId: number;
    if (!isDrawing && drawTension > 0) {
      const snapBack = () => {
        setDrawTension(prev => {
          if (prev <= 0.05) return 0;
          return prev * 0.45;
        });
        if (drawTension > 0.05) {
          animId = requestAnimationFrame(snapBack);
        }
      };
      animId = requestAnimationFrame(snapBack);
    }
    return () => cancelAnimationFrame(animId);
  }, [isDrawing, drawTension]);

  const handleTestDrawStart = () => {
    setIsDrawing(true);
    setDrawTension(1);
    archeryAudio.playDrawSound(1);
  };

  const handleTestDrawEnd = () => {
    if (isDrawing) {
      archeryAudio.playReleaseSound(bow.drawWeight);
      setIsDrawing(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Coordinate system: center of bow is around (width * 0.42, height * 0.5)
    const centerX = width * 0.45;
    const centerY = height * 0.5;
    const bowHeight = height * 0.82;
    const halfHeight = bowHeight / 2;

    const tension = drawTension; // 0 to 1

    // 1. Draw Background Grid & Glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, width * 0.6);
    gradient.addColorStop(0, 'rgba(30, 41, 59, 0.4)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle alignment grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 20; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 20; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Stabilizer rod
    if (bow.stabilizer !== 'none') {
      const rodLength = bow.stabilizer === 'olympic_long' ? 140 : 70;
      const rodX = centerX + 15;
      const rodY = centerY;

      // Main forward rod
      ctx.save();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(rodX, rodY);
      ctx.lineTo(rodX + rodLength, rodY);
      ctx.stroke();

      // Damper & Weights at tip
      ctx.fillStyle = '#64748b';
      ctx.fillRect(rodX + rodLength - 8, rodY - 6, 8, 12);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(rodX + rodLength + 6, rodY, 7, 0, Math.PI * 2);
      ctx.fill();

      // V-bar angled side rods
      if (bow.stabilizer === 'vbar_multi') {
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#475569';
        // Top angled rod
        ctx.beginPath();
        ctx.moveTo(rodX + 15, rodY);
        ctx.lineTo(rodX - 30, rodY - 50);
        ctx.stroke();
        // Bottom angled rod
        ctx.beginPath();
        ctx.moveTo(rodX + 15, rodY);
        ctx.lineTo(rodX - 30, rodY + 50);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Limb flexion calculation
    const limbFlexX = tension * 18;
    const stringPullX = centerX - 40 - tension * 100;

    // Limb Tip coordinates
    let topTipX = centerX - 12 - limbFlexX;
    let topTipY = centerY - halfHeight + (tension * 8);
    let botTipX = centerX - 12 - limbFlexX;
    let botTipY = centerY + halfHeight - (tension * 8);

    if (bow.type === 'traditional') {
      topTipX = centerX - 25 - limbFlexX;
      botTipX = centerX - 25 - limbFlexX;
    } else if (bow.type === 'compound') {
      topTipX = centerX + 5 - limbFlexX * 0.6;
      botTipX = centerX + 5 - limbFlexX * 0.6;
    }

    // 2. Draw Limbs
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = bow.type === 'compound' ? 14 : 12;
    ctx.strokeStyle = bow.limbColor;

    // Upper Limb
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 45);
    if (bow.type === 'recurve' || bow.type === 'tactical') {
      // Recurve reflex curve
      ctx.bezierCurveTo(
        centerX + 28 - limbFlexX * 0.3, centerY - halfHeight * 0.5,
        centerX + 15 - limbFlexX * 0.7, centerY - halfHeight * 0.85,
        topTipX, topTipY
      );
    } else if (bow.type === 'compound') {
      // Shorter, rigid compound limbs
      ctx.bezierCurveTo(
        centerX + 35, centerY - halfHeight * 0.4,
        centerX + 25, centerY - halfHeight * 0.75,
        topTipX, topTipY
      );
    } else {
      // Traditional reflex curve
      ctx.bezierCurveTo(
        centerX - 10 - limbFlexX * 0.5, centerY - halfHeight * 0.4,
        centerX + 30 - limbFlexX * 0.8, centerY - halfHeight * 0.75,
        topTipX, topTipY
      );
    }
    ctx.stroke();

    // Lower Limb
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + 45);
    if (bow.type === 'recurve' || bow.type === 'tactical') {
      ctx.bezierCurveTo(
        centerX + 28 - limbFlexX * 0.3, centerY + halfHeight * 0.5,
        centerX + 15 - limbFlexX * 0.7, centerY + halfHeight * 0.85,
        botTipX, botTipY
      );
    } else if (bow.type === 'compound') {
      ctx.bezierCurveTo(
        centerX + 35, centerY + halfHeight * 0.4,
        centerX + 25, centerY + halfHeight * 0.75,
        botTipX, botTipY
      );
    } else {
      ctx.bezierCurveTo(
        centerX - 10 - limbFlexX * 0.5, centerY + halfHeight * 0.4,
        centerX + 30 - limbFlexX * 0.8, centerY + halfHeight * 0.75,
        botTipX, botTipY
      );
    }
    ctx.stroke();

    // Limb Pattern accents (stripes / details)
    if (bow.limbPattern === 'stripes' || bow.limbPattern === 'dragon') {
      ctx.strokeStyle = bow.riserColor;
      ctx.lineWidth = 3;
      // top stripe
      ctx.beginPath();
      ctx.arc(centerX + 18, centerY - halfHeight * 0.6, 12, 0, Math.PI * 0.8);
      ctx.stroke();
      // bottom stripe
      ctx.beginPath();
      ctx.arc(centerX + 18, centerY + halfHeight * 0.6, 12, 0, Math.PI * 0.8);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Compound Cams (if compound bow)
    if (bow.type === 'compound') {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;

      // Top Cam
      ctx.beginPath();
      ctx.ellipse(topTipX + 2, topTipY, 14, 18, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Pin center
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(topTipX + 2, topTipY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Cam
      ctx.beginPath();
      ctx.ellipse(botTipX + 2, botTipY, 14, 18, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(botTipX + 2, botTipY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Compound Cable Cross Harness
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(topTipX, topTipY + 5);
      ctx.lineTo(botTipX + 10, botTipY - 10);
      ctx.moveTo(botTipX, botTipY - 5);
      ctx.lineTo(topTipX + 10, topTipY + 10);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Riser (Center Handle Frame)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 18;
    ctx.strokeStyle = bow.riserColor;

    ctx.beginPath();
    ctx.moveTo(centerX - 4, centerY - 65);
    // Ergonomic window cutout
    ctx.lineTo(centerX + 12, centerY - 45);
    ctx.lineTo(centerX + 18, centerY - 15);
    // Grip pocket
    ctx.lineTo(centerX + 8, centerY);
    ctx.lineTo(centerX + 14, centerY + 25);
    ctx.lineTo(centerX + 8, centerY + 45);
    ctx.lineTo(centerX - 4, centerY + 65);
    ctx.stroke();

    // Riser texture highlight
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(centerX + 12, centerY - 40);
    ctx.lineTo(centerX + 16, centerY - 15);
    ctx.stroke();

    // Grip wrap
    ctx.lineWidth = 20;
    ctx.strokeStyle = bow.gripColor;
    ctx.beginPath();
    ctx.moveTo(centerX + 7, centerY - 10);
    ctx.lineTo(centerX + 9, centerY + 18);
    ctx.stroke();

    // Grip ridges
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    for (let gy = centerY - 6; gy <= centerY + 14; gy += 5) {
      ctx.beginPath();
      ctx.moveTo(centerX - 2, gy);
      ctx.lineTo(centerX + 16, gy);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Sight Bracket & Reticle Pin
    if (bow.sight !== 'none') {
      const sightX = centerX + 26;
      const sightY = centerY - 25;

      ctx.save();
      // Mounting bar
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX + 14, sightY);
      ctx.lineTo(sightX, sightY);
      ctx.stroke();

      // Sight housing
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sightX + 12, sightY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pin / Fiber optic dot
      ctx.fillStyle = bow.sightColor;
      ctx.shadowColor = bow.sightColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sightX + 12, sightY, 3, 0, Math.PI * 2);
      ctx.fill();

      if (bow.sight === 'pin_multi') {
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(sightX + 12, sightY - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(sightX + 12, sightY + 4, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Arrow (when nocked on bowstring)
    const arrowLength = 220;
    const arrowNockX = stringPullX;
    const arrowNockY = centerY;
    const arrowTipX = arrowNockX + arrowLength;
    const arrowTipY = centerY;

    ctx.save();
    // Arrow Shaft
    ctx.strokeStyle = bow.arrowShaftColor;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(arrowNockX, arrowNockY);
    ctx.lineTo(arrowTipX, arrowTipY);
    ctx.stroke();

    // Arrow Tip (Field point / Broadhead)
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(arrowTipX, arrowTipY - 5);
    ctx.lineTo(arrowTipX + 16, arrowTipY);
    ctx.lineTo(arrowTipX, arrowTipY + 5);
    ctx.closePath();
    ctx.fill();

    // Fletchings (Feathers)
    ctx.fillStyle = bow.arrowFletchColor;
    // Top feather
    ctx.beginPath();
    ctx.moveTo(arrowNockX + 8, arrowNockY);
    ctx.lineTo(arrowNockX + 22, arrowNockY - 9);
    ctx.lineTo(arrowNockX + 50, arrowNockY - 9);
    ctx.lineTo(arrowNockX + 44, arrowNockY);
    ctx.closePath();
    ctx.fill();
    // Bottom feather
    ctx.beginPath();
    ctx.moveTo(arrowNockX + 8, arrowNockY);
    ctx.lineTo(arrowNockX + 22, arrowNockY + 9);
    ctx.lineTo(arrowNockX + 50, arrowNockY + 9);
    ctx.lineTo(arrowNockX + 44, arrowNockY);
    ctx.closePath();
    ctx.fill();

    // Nock
    ctx.fillStyle = bow.arrowNockColor;
    ctx.beginPath();
    ctx.arc(arrowNockX + 3, arrowNockY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Bowstring
    ctx.save();
    ctx.strokeStyle = bow.stringColor;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = bow.stringColor;
    ctx.shadowBlur = 3;

    ctx.beginPath();
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(stringPullX, centerY);
    ctx.lineTo(botTipX, botTipY);
    ctx.stroke();

    // Nocking brass bead
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(stringPullX, centerY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  }, [bow, drawTension]);

  return (
    <div id="bow-preview-card" className="flex flex-col rounded-2xl bg-stone-900 border border-stone-800 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-semibold tracking-wider text-amber-500 uppercase">
            장비 프리뷰
          </span>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {bow.name}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {bow.drawWeight} lbs
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-stone-800 text-stone-300 border border-stone-700 uppercase">
            {bow.type}
          </span>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full h-80 rounded-xl overflow-hidden bg-gradient-to-b from-stone-950 to-stone-900 border border-stone-800/80 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={580}
          height={320}
          className="w-full h-full object-contain"
        />

        {/* Interactive Test Draw Action Button */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 bg-stone-900/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-stone-700/60">
          <div className="text-xs text-stone-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">장력 테스트:</span>
            <span className="text-stone-400">당김 정도 {Math.round(drawTension * 100)}%</span>
          </div>

          <button
            id="test-draw-btn"
            type="button"
            onMouseDown={handleTestDrawStart}
            onMouseUp={handleTestDrawEnd}
            onTouchStart={handleTestDrawStart}
            onTouchEnd={handleTestDrawEnd}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer select-none ${
              isDrawing
                ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-700 hover:bg-stone-600 text-white'
            }`}
          >
            {isDrawing ? '활시위 만작 중 (놓으면 발사)!' : '활시위 당겨보기 (누르고 있기)'}
          </button>
        </div>
      </div>

      {/* Bow Live Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
        <div className="bg-stone-800/60 rounded-xl p-3 border border-stone-700/50">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>탄속 (탄도 플랫)</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-white">{stats.velocity}</span>
            <span className="text-[10px] text-stone-400">fps</span>
          </div>
          <div className="w-full bg-stone-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (stats.velocity / 360) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-stone-800/60 rounded-xl p-3 border border-stone-700/50">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>조준 안정성</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-white">{stats.stability}</span>
            <span className="text-[10px] text-stone-400">/ 100</span>
          </div>
          <div className="w-full bg-stone-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.stability}%` }}
            />
          </div>
        </div>

        <div className="bg-stone-800/60 rounded-xl p-3 border border-stone-700/50">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span>바람 저항력</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-white">{stats.windResistance}</span>
            <span className="text-[10px] text-stone-400">%</span>
          </div>
          <div className="w-full bg-stone-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.windResistance}%` }}
            />
          </div>
        </div>

        <div className="bg-stone-800/60 rounded-xl p-3 border border-stone-700/50">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>조준 배율</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-white">{stats.zoomLevel}x</span>
            <span className="text-[10px] text-stone-400">zoom</span>
          </div>
          <div className="w-full bg-stone-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${((stats.zoomLevel - 1) / 0.5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
