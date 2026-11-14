import React from 'react';

export type MuscleId = 
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'upper_back'
  | 'lats'
  | 'traps'
  | 'abs'
  | 'obliques'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export type BodySide = 'left' | 'right';
export type BodyView = 'front' | 'back';

interface AnatomicalBodyProps {
  selectedMuscle: MuscleId;
  selectedSide: BodySide;
  view: BodyView;
  onSelect: (muscle: MuscleId, side?: BodySide) => void;
  onToggleView: () => void;
}

export const AnatomicalBody: React.FC<AnatomicalBodyProps> = ({
  selectedMuscle,
  selectedSide,
  view,
  onSelect,
  onToggleView,
}) => {
  const isSelected = (muscle: MuscleId, side?: BodySide) => {
    if (selectedMuscle !== muscle) return false;
    if (side && selectedSide !== side) return false;
    return true;
  };

  const getMuscleClasses = (muscle: MuscleId, side?: BodySide) => {
    const active = isSelected(muscle, side);
    return `cursor-pointer transition-all duration-200 ${
      active
        ? 'fill-[#A6D96A] stroke-[#A6D96A] filter drop-shadow-[0_0_8px_rgba(166,217,106,0.6)]'
        : 'fill-[#1C251F] hover:fill-[#27362B] stroke-[#2A342C] hover:stroke-[#83A98A]/50'
    }`;
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-2 select-none">
      {/* Front / Back View Switcher Pill */}
      <div className="absolute top-0 end-1 z-20">
        <button
          onClick={onToggleView}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs font-bold  hover:bg-[#222C24] transition-all tap-feedback"
        >
          <span className="capitalize">{view === 'front' ? 'View Back ↻' : 'View Front ↺'}</span>
        </button>
      </div>

      {/* SVG Canvas for Human Body */}
      <div className="w-full max-w-[260px] h-[340px] flex items-center justify-center relative">
        <svg
          viewBox="0 0 240 400"
          className="w-full h-full max-h-[340px] drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Subtle inner silhouette gradient */}
            <linearGradient id="bodyBaseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#151B16" />
              <stop offset="100%" stopColor="#0E130F" />
            </linearGradient>
          </defs>

          {/* Underlay Body Outline */}
          <g opacity="0.6">
            {/* Head */}
            <ellipse cx="120" cy="32" rx="16" ry="21" className="fill-[#151B16] stroke-[#2A342C] stroke-[1.5]" />
            {/* Neck */}
            <path d="M112 49 L112 62 L128 62 L128 49 Z" className="fill-[#151B16] stroke-[#2A342C] stroke-[1.2]" />
          </g>

          {view === 'front' ? (
            /* ======================================================== */
            /* FRONT ANATOMICAL MUSCLE GROUPS                           */
            /* ======================================================== */
            <g id="front-body" strokeWidth="1.4" strokeLinejoin="round">
              {/* Traps (Front) */}
              <path
                d="M108 55 L90 70 L110 70 Z"
                className={getMuscleClasses('traps', 'left')}
                onClick={() => onSelect('traps', 'left')}
              >
                <title>Traps (Left)</title>
              </path>
              <path
                d="M132 55 L150 70 L130 70 Z"
                className={getMuscleClasses('traps', 'right')}
                onClick={() => onSelect('traps', 'right')}
              >
                <title>Traps (Right)</title>
              </path>

              {/* Shoulders / Anterior Deltoids */}
              <path
                d="M88 70 C76 72 70 85 72 98 C76 102 85 96 87 90 C88 82 88 74 88 70 Z"
                className={getMuscleClasses('shoulders', 'left')}
                onClick={() => onSelect('shoulders', 'left')}
              >
                <title>Shoulder / Anterior Deltoid (Left)</title>
              </path>
              <path
                d="M152 70 C164 72 170 85 168 98 C164 102 155 96 153 90 C152 82 152 74 152 70 Z"
                className={getMuscleClasses('shoulders', 'right')}
                onClick={() => onSelect('shoulders', 'right')}
              >
                <title>Shoulder / Anterior Deltoid (Right)</title>
              </path>

              {/* Chest / Pectoralis Major */}
              <path
                d="M89 74 C100 74 116 75 118 90 C118 102 104 108 90 106 C85 95 86 84 89 74 Z"
                className={getMuscleClasses('chest', 'left')}
                onClick={() => onSelect('chest', 'left')}
              >
                <title>Chest / Pectoral (Left)</title>
              </path>
              <path
                d="M151 74 C140 74 124 75 122 90 C122 102 136 108 150 106 C155 95 154 84 151 74 Z"
                className={getMuscleClasses('chest', 'right')}
                onClick={() => onSelect('chest', 'right')}
              >
                <title>Chest / Pectoral (Right)</title>
              </path>

              {/* Biceps */}
              <path
                d="M72 102 C68 112 68 128 73 138 C78 138 82 130 83 120 C84 110 80 102 72 102 Z"
                className={getMuscleClasses('biceps', 'left')}
                onClick={() => onSelect('biceps', 'left')}
              >
                <title>Biceps (Left)</title>
              </path>
              <path
                d="M168 102 C172 112 172 128 167 138 C162 138 158 130 157 120 C156 110 160 102 168 102 Z"
                className={getMuscleClasses('biceps', 'right')}
                onClick={() => onSelect('biceps', 'right')}
              >
                <title>Biceps (Right)</title>
              </path>

              {/* Forearms */}
              <path
                d="M72 142 C66 155 60 176 65 192 C68 193 74 186 77 172 C80 158 79 146 72 142 Z"
                className={getMuscleClasses('forearms', 'left')}
                onClick={() => onSelect('forearms', 'left')}
              >
                <title>Forearm (Left)</title>
              </path>
              <path
                d="M168 142 C174 155 180 176 175 192 C172 193 166 186 163 172 C160 158 161 146 168 142 Z"
                className={getMuscleClasses('forearms', 'right')}
                onClick={() => onSelect('forearms', 'right')}
              >
                <title>Forearm (Right)</title>
              </path>

              {/* Hands */}
              <path d="M63 194 C60 202 62 210 65 214 C68 214 70 208 70 200 Z" className="fill-[#151B16] stroke-[#2A342C]" />
              <path d="M177 194 C180 202 178 210 175 214 C172 214 170 208 170 200 Z" className="fill-[#151B16] stroke-[#2A342C]" />

              {/* Abs / Rectus Abdominis */}
              <g onClick={() => onSelect('abs')} className="cursor-pointer">
                {/* Upper Abs */}
                <rect x="108" y="110" width="10" height="12" rx="3" className={getMuscleClasses('abs')} />
                <rect x="122" y="110" width="10" height="12" rx="3" className={getMuscleClasses('abs')} />
                {/* Mid Abs */}
                <rect x="108" y="125" width="10" height="13" rx="3" className={getMuscleClasses('abs')} />
                <rect x="122" y="125" width="10" height="13" rx="3" className={getMuscleClasses('abs')} />
                {/* Lower Abs */}
                <rect x="108" y="141" width="10" height="14" rx="3" className={getMuscleClasses('abs')} />
                <rect x="122" y="141" width="10" height="14" rx="3" className={getMuscleClasses('abs')} />
              </g>

              {/* Obliques */}
              <path
                d="M92 112 C90 125 90 142 96 156 C102 156 105 146 104 130 C104 120 100 114 92 112 Z"
                className={getMuscleClasses('obliques', 'left')}
                onClick={() => onSelect('obliques', 'left')}
              >
                <title>Obliques (Left)</title>
              </path>
              <path
                d="M148 112 C150 125 150 142 144 156 C138 156 135 146 136 130 C136 120 140 114 148 112 Z"
                className={getMuscleClasses('obliques', 'right')}
                onClick={() => onSelect('obliques', 'right')}
              >
                <title>Obliques (Right)</title>
              </path>

              {/* Pelvis / Hip Core */}
              <path d="M102 160 L138 160 L134 176 L106 176 Z" className="fill-[#151B16] stroke-[#2A342C]" />

              {/* Quadriceps (Left & Right) */}
              <path
                d="M94 178 C86 200 82 230 90 256 C98 258 106 256 112 248 C116 230 114 200 108 178 Z"
                className={getMuscleClasses('quads', 'left')}
                onClick={() => onSelect('quads', 'left')}
              >
                <title>Quadriceps (Left)</title>
              </path>
              <path
                d="M146 178 C154 200 158 230 150 256 C142 258 134 256 128 248 C124 230 126 200 132 178 Z"
                className={getMuscleClasses('quads', 'right')}
                onClick={() => onSelect('quads', 'right')}
              >
                <title>Quadriceps (Right)</title>
              </path>

              {/* Knees */}
              <ellipse cx="98" cy="264" rx="7" ry="6" className="fill-[#151B16] stroke-[#2A342C]" />
              <ellipse cx="142" cy="264" rx="7" ry="6" className="fill-[#151B16] stroke-[#2A342C]" />

              {/* Calves (Front/Shin) */}
              <path
                d="M92 274 C86 295 86 325 93 346 C98 346 102 338 104 322 C106 302 102 282 92 274 Z"
                className={getMuscleClasses('calves', 'left')}
                onClick={() => onSelect('calves', 'left')}
              >
                <title>Calves / Shin (Left)</title>
              </path>
              <path
                d="M148 274 C154 295 154 325 147 346 C142 346 138 338 136 322 C134 302 138 282 148 274 Z"
                className={getMuscleClasses('calves', 'right')}
                onClick={() => onSelect('calves', 'right')}
              >
                <title>Calves / Shin (Right)</title>
              </path>

              {/* Feet */}
              <path d="M86 350 C82 360 84 372 92 376 C98 376 99 366 98 350 Z" className="fill-[#151B16] stroke-[#2A342C]" />
              <path d="M154 350 C158 360 156 372 148 376 C142 376 141 366 142 350 Z" className="fill-[#151B16] stroke-[#2A342C]" />
            </g>
          ) : (
            /* ======================================================== */
            /* BACK ANATOMICAL MUSCLE GROUPS                            */
            /* ======================================================== */
            <g id="back-body" strokeWidth="1.4" strokeLinejoin="round">
              {/* Upper Trapezius / Neck Back */}
              <path
                d="M108 55 L88 72 L120 90 L120 55 Z"
                className={getMuscleClasses('traps', 'left')}
                onClick={() => onSelect('traps', 'left')}
              >
                <title>Upper Traps (Left)</title>
              </path>
              <path
                d="M132 55 L152 72 L120 90 L120 55 Z"
                className={getMuscleClasses('traps', 'right')}
                onClick={() => onSelect('traps', 'right')}
              >
                <title>Upper Traps (Right)</title>
              </path>

              {/* Rear Deltoids */}
              <path
                d="M86 74 C74 76 70 88 72 100 C78 102 85 96 86 88 Z"
                className={getMuscleClasses('shoulders', 'left')}
                onClick={() => onSelect('shoulders', 'left')}
              >
                <title>Rear Deltoids (Left)</title>
              </path>
              <path
                d="M154 74 C166 76 170 88 168 100 C162 102 155 96 154 88 Z"
                className={getMuscleClasses('shoulders', 'right')}
                onClick={() => onSelect('shoulders', 'right')}
              >
                <title>Rear Deltoids (Right)</title>
              </path>

              {/* Triceps (Back) */}
              <path
                d="M72 102 C68 114 68 128 74 138 C79 138 84 130 84 118 C84 108 80 102 72 102 Z"
                className={getMuscleClasses('triceps', 'left')}
                onClick={() => onSelect('triceps', 'left')}
              >
                <title>Triceps (Left)</title>
              </path>
              <path
                d="M168 102 C172 114 172 128 166 138 C161 138 156 130 156 118 C156 108 160 102 168 102 Z"
                className={getMuscleClasses('triceps', 'right')}
                onClick={() => onSelect('triceps', 'right')}
              >
                <title>Triceps (Right)</title>
              </path>

              {/* Lats (Latissimus Dorsi) */}
              <path
                d="M88 92 C96 92 118 95 118 132 C108 142 96 142 90 128 C86 114 86 102 88 92 Z"
                className={getMuscleClasses('lats', 'left')}
                onClick={() => onSelect('lats', 'left')}
              >
                <title>Lats (Left)</title>
              </path>
              <path
                d="M152 92 C144 92 122 95 122 132 C132 142 144 142 150 128 C154 114 154 102 152 92 Z"
                className={getMuscleClasses('lats', 'right')}
                onClick={() => onSelect('lats', 'right')}
              >
                <title>Lats (Right)</title>
              </path>

              {/* Lower Back / Erector Spinae */}
              <path
                d="M106 134 L134 134 L132 162 L108 162 Z"
                className={getMuscleClasses('lower_back')}
                onClick={() => onSelect('lower_back')}
              >
                <title>Lower Back (Erector Spinae)</title>
              </path>

              {/* Glutes */}
              <path
                d="M92 164 C86 178 88 202 104 206 C116 206 118 192 118 168 Z"
                className={getMuscleClasses('glutes', 'left')}
                onClick={() => onSelect('glutes', 'left')}
              >
                <title>Glutes (Left)</title>
              </path>
              <path
                d="M148 164 C154 178 152 202 136 206 C124 206 122 192 122 168 Z"
                className={getMuscleClasses('glutes', 'right')}
                onClick={() => onSelect('glutes', 'right')}
              >
                <title>Glutes (Right)</title>
              </path>

              {/* Hamstrings */}
              <path
                d="M92 210 C86 230 84 250 90 262 C98 262 106 258 112 248 C116 234 116 220 114 210 Z"
                className={getMuscleClasses('hamstrings', 'left')}
                onClick={() => onSelect('hamstrings', 'left')}
              >
                <title>Hamstrings (Left)</title>
              </path>
              <path
                d="M148 210 C154 230 156 250 150 262 C142 262 134 258 128 248 C124 234 124 220 126 210 Z"
                className={getMuscleClasses('hamstrings', 'right')}
                onClick={() => onSelect('hamstrings', 'right')}
              >
                <title>Hamstrings (Right)</title>
              </path>

              {/* Calves (Back / Gastrocnemius) */}
              <path
                d="M90 274 C82 295 84 325 92 346 C98 346 104 338 106 320 C108 300 102 280 90 274 Z"
                className={getMuscleClasses('calves', 'left')}
                onClick={() => onSelect('calves', 'left')}
              >
                <title>Calves (Left)</title>
              </path>
              <path
                d="M150 274 C158 295 156 325 148 346 C142 346 136 338 134 320 C132 300 138 280 150 274 Z"
                className={getMuscleClasses('calves', 'right')}
                onClick={() => onSelect('calves', 'right')}
              >
                <title>Calves (Right)</title>
              </path>

              {/* Heels / Feet */}
              <path d="M88 350 C86 360 88 370 94 374 C98 374 98 364 96 350 Z" className="fill-[#151B16] stroke-[#2A342C]" />
              <path d="M152 350 C154 360 152 370 146 374 C142 374 142 364 144 350 Z" className="fill-[#151B16] stroke-[#2A342C]" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
