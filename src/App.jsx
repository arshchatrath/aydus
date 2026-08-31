import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Loader from './Loader';
import Navbar from './Navbar';
import Hero from './Hero';

// Lazy-load below-the-fold components — not needed in initial bundle
const Sections = lazy(() => import('./Sections'));
const Footer = lazy(() => import('./Footer'));

gsap.registerPlugin(ScrollTrigger);

function App() {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    // Minimum load time of 4.5 seconds to allow full cinematic sequence
    const timer = setTimeout(() => setIsTimeUp(true), 4500);
    return () => clearTimeout(timer);
  }, []);

  // Loader stays up until both the minimum cinematic timer has elapsed
  // AND the hero video has actually signaled it's ready to play — whichever
  // takes longer (protects against hiding the loader onto an unready hero
  // on a slow connection).
  const isLoading = !isTimeUp || !isVideoReady;

  // Stable callback ref — prevents Hero's useEffect from re-firing
  const handleVideoReady = useCallback(() => {
    setIsVideoReady(true);
  }, []);

  useEffect(() => {
    // Initialize Lenis for smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenis.on('scroll', ScrollTrigger.update);

    // Store the actual callback reference so we can remove it properly
    const tickerCallback = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(tickerCallback);
    };
  }, []);

  return (
    <>
      <Loader isLoading={isLoading} />
      <Navbar />
      <Hero onReady={handleVideoReady} />
      <Suspense fallback={null}>
        <Sections />
        <Footer />
      </Suspense>
    </>
  );
}

export default App;
