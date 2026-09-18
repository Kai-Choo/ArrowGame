export type BowType = 'recurve' | 'compound' | 'traditional' | 'tactical';

export type RiserMaterial = 'carbon' | 'aluminum' | 'wood' | 'gold' | 'neon';
export type LimbMaterial = 'carbon_foam' | 'bamboo' | 'titanium' | 'fiberglass';
export type SightStyle = 'none' | 'pin_single' | 'pin_multi' | 'optic_circle' | 'laser_dot';
export type StabilizerStyle = 'none' | 'short_hunter' | 'olympic_long' | 'vbar_multi';

export interface BowConfig {
  id: string;
  name: string;
  type: BowType;
  
  // Riser (Body)
  riserColor: string;
  riserMaterial: RiserMaterial;
  gripColor: string;
  
  // Limbs
  limbColor: string;
  limbMaterial: LimbMaterial;
  limbPattern: 'clean' | 'stripes' | 'camo' | 'dragon';
  
  // Specs
  drawWeight: number; // 30 ~ 70 lbs
  
  // Accessories
  sight: SightStyle;
  sightColor: string;
  stabilizer: StabilizerStyle;
  
  // Bowstring & Arrow
  stringColor: string;
  arrowShaftColor: string;
  arrowFletchColor: string;
  arrowNockColor: string;
}

export interface BowStats {
  velocity: number;      // Arrow flight speed (px/sec / drop reduction)
  stability: number;     // Reduces aim sway/tremor (0 ~ 100)
  windResistance: number; // Reduces wind push (0 ~ 100)
  staminaTime: number;   // Seconds before fatigue shakes reticle
  zoomLevel: number;     // Aim magnification factor
}

export type GameMode = 'olympic' | 'horseback' | 'wind_challenge' | 'moving_target' | 'free_practice';

export type ArcheryTheme = 'traditional' | 'olympic';

export interface ArrowHit {
  id: string;
  score: number;      // 0 to 10
  isX: boolean;       // true if in inner 10 ring
  x: number;          // relative target hit coordinate (-1 to 1)
  y: number;          // relative target hit coordinate (-1 to 1)
  distanceMeters: number;
  windSpeed: number;  // m/s
  windAngle: number;  // radians
  time: number;
}

export interface GameSession {
  mode: GameMode;
  distance: number;       // 18m, 30m, 50m, 70m
  maxArrows: number;      // 5 or 6 per set
  arrows: ArrowHit[];
  currentRound: number;
  totalRounds: number;
  isGameOver: boolean;
}
