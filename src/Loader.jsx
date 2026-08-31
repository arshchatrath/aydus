import React, { useState, useMemo, useCallback } from 'react';
import './Loader.css';

/**
 * Generate a single star's style properties.
 * Extracted as a pure function for clarity.
 */
const generateStar = () => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 4}s`,
  duration: `${2 + Math.random() * 4}s`,
});

const Loader = React.memo(function Loader({ isLoading }) {
  const [shouldRender, setShouldRender] = useState(true);
  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);

  // If we go back to loading after unmounting (shouldn't normally happen,
  // but defensive), re-arm rendering. Derived during render — React's
  // documented pattern for resetting state from a prop change — instead of
  // in an effect, so it never fires a second, cascading commit.
  if (isLoading !== prevIsLoading) {
    setPrevIsLoading(isLoading);
    if (isLoading) setShouldRender(true);
  }

  // Generate stars once and memoize — prevents re-computation on re-renders
  const stars = useMemo(() => Array.from({ length: 35 }, generateStar), []);

  // After the hide transition completes, fully unmount the loader
  // so it doesn't consume paint/composite cycles in the background
  const handleTransitionEnd = useCallback(() => {
    if (!isLoading) {
      setShouldRender(false);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className={`loader-container ${isLoading ? 'visible' : 'hidden'}`}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Noise Texture Overlay */}
      <div className="noise-overlay"></div>
      
      {/* Animated Starfield */}
      <div className="starfield">
        {stars.map((star, i) => (
          <div key={i} className="star" style={{
            top: star.top,
            left: star.left,
            animationDelay: star.delay,
            animationDuration: star.duration
          }}></div>
        ))}
      </div>

      <div className="loader-content">
        <div className="svg-wrapper">
          <svg className="tardis-svg" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Group for drawing lines */}
            <g filter="url(#soft-glow)" className="tardis-lines" fill="none" stroke="#6ec6ff" strokeWidth="1.2">
              <rect x="25" y="30" width="50" height="110" className="draw-path box-main" />
              <rect x="22" y="25" width="56" height="5" className="draw-path box-roof1" />
              <rect x="28" y="20" width="44" height="5" className="draw-path box-roof2" />
              
              <rect x="46" y="10" width="8" height="10" className="draw-path box-lamp" />
              <path d="M46 10 L54 10 L50 4 Z" className="draw-path box-lamp-top" />
              
              {/* Door panels (drawn later in sequence) */}
              <rect x="30" y="35" width="18" height="20" className="draw-path panel" />
              <rect x="30" y="60" width="18" height="20" className="draw-path panel" />
              <rect x="30" y="85" width="18" height="20" className="draw-path panel" />
              <rect x="30" y="110" width="18" height="20" className="draw-path panel" />
              <rect x="52" y="35" width="18" height="20" className="draw-path panel" />
              <rect x="52" y="60" width="18" height="20" className="draw-path panel" />
              <rect x="52" y="85" width="18" height="20" className="draw-path panel" />
              <rect x="52" y="110" width="18" height="20" className="draw-path panel" />
              
              {/* Seam line with delayed pulsing glow */}
              <line x1="50" y1="30" x2="50" y2="140" className="door-seam-line" />
            </g>

            {/* Accent Swirl */}
            <path className="spiral-accent" d="M10,25 C-5,5 30,-10 25,15 C20,40 -10,35 15,30" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
          </svg>
        </div>

        <div className="loader-info">
          <p className="loader-typography">Establishing Connection</p>
          <div className="progress-track">
            <div className="progress-fill"></div>
          </div>
        </div>
      </div>
    </div>
  );
});

Loader.displayName = 'Loader';

export default Loader;
