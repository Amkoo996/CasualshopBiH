import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-11 h-11', showText = true }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Exact Circular SVG Logo as in user provided asset */}
      <div className={`relative shrink-0 rounded-full overflow-hidden ${className}`}>
        <svg viewBox="0 0 500 500" className="w-full h-full block">
          {/* Black circle */}
          <circle cx="250" cy="250" r="248" fill="#0A0A0A" />

          {/* Yellow outer ring #F7E97F */}
          <circle cx="250" cy="250" r="216" fill="none" stroke="#F7E97F" strokeWidth="26" />

          {/* Yellow inner box frame */}
          <rect x="160" y="148" width="180" height="135" fill="none" stroke="#F7E97F" strokeWidth="12" />

          {/* White Bucket Hat */}
          <path
            d="M 190 234 L 202 165 C 203 162 206 160 210 160 L 290 160 C 294 160 297 162 298 165 L 310 234 Z"
            fill="#FFFFFF"
          />
          <path d="M 194 220 C 220 226 280 226 306 220" fill="none" stroke="#E5E5E5" strokeWidth="3" />
          <path
            d="M 180 238 C 180 234 186 233 192 233 L 308 233 C 314 233 320 234 320 238 C 320 248 300 256 250 256 C 200 256 180 248 180 238 Z"
            fill="#FFFFFF"
          />

          {/* Yellow Sunglasses #F7E97F with black lenses */}
          <rect x="185" y="246" width="56" height="42" rx="4" fill="#0A0A0A" stroke="#F7E97F" strokeWidth="8" />
          <rect x="259" y="246" width="56" height="42" rx="4" fill="#0A0A0A" stroke="#F7E97F" strokeWidth="8" />
          <rect x="241" y="258" width="18" height="7" fill="#F7E97F" />

          {/* Yellow reflection slashes on sunglasses */}
          <path d="M 197 280 L 205 253" stroke="#F7E97F" strokeWidth="5" strokeLinecap="round" />
          <path d="M 215 280 L 223 253" stroke="#F7E97F" strokeWidth="5" strokeLinecap="round" />
          <path d="M 271 280 L 279 253" stroke="#F7E97F" strokeWidth="5" strokeLinecap="round" />
          <path d="M 289 280 L 297 253" stroke="#F7E97F" strokeWidth="5" strokeLinecap="round" />

          {/* CASUAL shop text inside the circle */}
          <text
            x="250"
            y="342"
            textAnchor="middle"
            fontFamily="'Poppins', sans-serif"
            fontWeight="900"
            fontSize="52"
            fill="#FFFFFF"
            letterSpacing="4"
          >
            CASUAL
          </text>
          <text
            x="250"
            y="382"
            textAnchor="middle"
            fontFamily="'Poppins', sans-serif"
            fontWeight="800"
            fontSize="34"
            fill="#F7E97F"
            letterSpacing="2"
          >
            shop
          </text>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-baseline gap-1 font-['Poppins']">
            <span className="font-black text-base sm:text-lg tracking-wider uppercase text-white">
              CASUAL
            </span>
            <span className="font-extrabold text-sm sm:text-base text-[#F7E97F] lowercase tracking-wide">
              shop
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-['Inter'] font-semibold tracking-[0.2em] uppercase">
            BIH • CASUAL. SVAKI DAN.
          </span>
        </div>
      )}
    </div>
  );
};
