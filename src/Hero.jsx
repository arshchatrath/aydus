import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ExplosionShader';
import { siteConfig } from './siteConfig';

gsap.registerPlugin(ScrollTrigger);

/**
 * VideoScene — memoized to prevent re-renders since it receives stable refs.
 * This is the core Three.js scene that scrubs the video and runs the explosion shader.
 */
const VideoScene = React.memo(({ videoEl, progressRef }) => {
  const materialRef = useRef();
  const { viewport, size } = useThree();
  const [videoTexture, setVideoTexture] = useState(null);
  const [videoDim, setVideoDim] = useState({ w: 1920, h: 1080 });

  // Mobile breakpoint (768px). If screen is larger, use contain (don't crop). If smaller, use cover (crop).
  const isMobile = size.width < 768;
  const screenRatio = viewport.width / viewport.height;
  const videoRatio = videoDim.w / videoDim.h;
  let scaleX = viewport.width;
  let scaleY = viewport.height;

  if (isMobile) {
    // object-fit: cover for phone (crops)
    if (screenRatio > videoRatio) {
      scaleY = viewport.width / videoRatio;
    } else {
      scaleX = viewport.height * videoRatio;
    }
  } else {
    // Desktop: stretch to fill completely, removing all black stripes
    scaleX = viewport.width;
    scaleY = viewport.height;
  }

  // Memoize the resolution vector to avoid creating a new object every frame
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height]
  );

  useEffect(() => {
    if (videoEl) {
      const tex = new THREE.VideoTexture(videoEl);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      // A THREE.VideoTexture is a WebGL resource allocation tied to the video
      // element, not data derivable during render; it needs the effect's
      // cleanup below to dispose it and free GPU memory.
      // oxlint-disable-next-line react/set-state-in-effect
      setVideoTexture(tex);
      
      const handleLoad = () => {
        setVideoDim({ w: videoEl.videoWidth, h: videoEl.videoHeight });
      };
      
      if (videoEl.readyState >= 1) handleLoad();
      else videoEl.addEventListener('loadedmetadata', handleLoad);

      // Cleanup: dispose texture on unmount to free GPU memory
      return () => {
        tex.dispose();
        videoEl.removeEventListener('loadedmetadata', handleLoad);
      };
    }
  }, [videoEl]);

  useFrame(() => {
    if (materialRef.current) {
      const p = progressRef.current;
      // Let's say video scrubs for the first 80% of the pin
      // and shader animates for the last 20%
      const videoScrubEnd = 0.8;
      
      let videoProgress = Math.min(p / videoScrubEnd, 1.0);
      let shaderProgress = Math.max(0, (p - videoScrubEnd) / (1.0 - videoScrubEnd));
      
      // `seeking` guard + epsilon: every currentTime write starts a new async
      // decode-and-seek. Issuing one every rAF tick — including ones smaller
      // than a frame, or while the last seek hasn't resolved yet — is what
      // makes video scrubbing stutter; skip anything that isn't a real step
      // forward/back.
      if (videoEl && videoEl.readyState >= 2 && !videoEl.seeking) {
        const targetTime = videoProgress * videoEl.duration;
        if (Math.abs(videoEl.currentTime - targetTime) > 0.032) {
          // We use requestAnimationFrame in useFrame to smoothly update time.
          // useFrame runs outside React's render/commit cycle (r3f's
          // imperative rAF loop), so scrubbing currentTime here is standard
          // imperative DOM control, not a render-time mutation.
          // oxlint-disable-next-line react/immutability
          videoEl.currentTime = targetTime;
        }
      }

      materialRef.current.uProgress = shaderProgress;
    }
  });

  return (
    <mesh scale={[scaleX, scaleY, 1]}>
      <planeGeometry args={[1, 1]} />
      {videoTexture ? (
        <explosionMaterial
          ref={materialRef}
          uTexture={videoTexture}
          uResolution={resolution}
        />
      ) : (
        <meshBasicMaterial color="black" />
      )}
    </mesh>
  );
});

VideoScene.displayName = 'VideoScene';

export default function Hero({ onReady }) {
  const containerRef = useRef(null);
  const canvasWrapperRef = useRef(null);
  const finalImageRef = useRef(null);
  const brandRef = useRef(null);
  const contentRef = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const [videoEl, setVideoEl] = useState(null);
  
  // We use a ref for progress to avoid React re-renders on every scroll tick
  const progressRef = useRef(0);

  // Track if timeline is created to prevent StrictMode double-creation
  const tlCreated = useRef(false);
  const timelineRef = useRef(null);

  // Callback ref to guarantee we get the video node the moment it renders
  const videoCallbackRef = (node) => {
    if (node && !videoEl) {
      setVideoEl(node);
    }
  };

  useEffect(() => {
    if (!videoEl) return;

    let didFire = false;

    // Setup the timeline and trigger onReady when video is at least minimally loaded
    const handleReady = () => {
      if (didFire) return; // guard against double-fire
      didFire = true;

      // Create ScrollTrigger only once
      if (!tlCreated.current) {
        tlCreated.current = true;
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: '+=4000', // 4000px of scrolling for the hero section
            scrub: 1, // Smooth scrubbing
            pin: true,
            onUpdate: (self) => {
              progressRef.current = self.progress;
            },
          },
        });

        // Fade out scroll indicator immediately as user starts scrolling
        tl.to(scrollIndicatorRef.current, { opacity: 0, duration: 0.05 }, 0);

        // At progress 1.0, the shader is fully white. 
        // We can fade in the video canvas right at the end to reveal the crisp resting background image.
        tl.to(canvasWrapperRef.current, { opacity: 0, duration: 0.1 }, 0.95);
        
        // Brand panel appears first at the moment the video ends
        tl.to(brandRef.current, { opacity: 1, duration: 0.05, ease: 'power2.out' }, 0.95);
        
        // Content panel fades in slightly after the brand panel
        tl.to(contentRef.current, { opacity: 1, duration: 0.08, ease: 'power2.out' }, 0.97);

        // Force GSAP to recalculate all other triggers (like Sections) now that we've added a 4000px pin spacer
        ScrollTrigger.refresh();
        
        timelineRef.current = tl;
      }

      // Signal to App that the video is ready to be shown
      if (onReady) onReady();
    };

    // iOS Safari never fires loadeddata/canplaythrough without a user gesture.
    // We call video.load() on the first touchstart to satisfy the requirement.
    const iosUnlock = () => {
      videoEl.load();
      document.removeEventListener('touchstart', iosUnlock, { once: true });
    };
    document.addEventListener('touchstart', iosUnlock, { once: true, passive: true });

    if (videoEl.readyState >= 2) { // HAVE_CURRENT_DATA or more
      handleReady();
    } else {
      videoEl.addEventListener('loadeddata', handleReady, { once: true });
      videoEl.addEventListener('canplaythrough', handleReady, { once: true });

      // Fallback: if neither event fires within 3 s (common on iOS without gesture),
      // proceed anyway so the loader doesn't hang forever.
      const fallbackTimer = setTimeout(handleReady, 3000);

      const cleanup = () => clearTimeout(fallbackTimer);
      videoEl.addEventListener('loadeddata', cleanup, { once: true });
      videoEl.addEventListener('canplaythrough', cleanup, { once: true });
    }

    return () => {
      document.removeEventListener('touchstart', iosUnlock);
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      tlCreated.current = false;
    };
  }, [videoEl, onReady]);

  return (
    <section id="home" ref={containerRef} className="hero-section">
      
      {/* Background Image that fades in at the end */}
      {createPortal(
        <div 
          ref={finalImageRef}
          className="hero-final-image"
        />,
        document.body
      )}

      {/* Off-screen video element that feeds the WebGL texture — preload="metadata"
          is the highest level iOS Safari will honour without a user gesture;
          crossOrigin removed to avoid CORS preflight failures on same-origin
          video across Android WebViews. Deliberately NOT display:none: iOS
          Safari suspends decoding on display:none video elements, so the
          texture would never receive frames and the hero would stay black —
          this keeps it "displayed" at 1x1px and fully transparent instead. */}
      <video
        ref={videoCallbackRef}
        src="/hero-video.mp4"
        muted
        playsInline
        preload="metadata"
        className="hero-video-source"
      />

      {/* R3F Canvas */}
      <div 
        ref={canvasWrapperRef}
        className="hero-canvas-wrapper"
      >
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          {videoEl && <VideoScene videoEl={videoEl} progressRef={progressRef} />}
        </Canvas>
      </div>

      {/* Scroll Indicator */}
      <div className="scroll-indicator" ref={scrollIndicatorRef}>
        <span className="scroll-text">SCROLL</span>
        <div className="scroll-line">
          <div className="scroll-dot"></div>
        </div>
      </div>

      {/* Stacked panels wrapper — centered once, children stack with gap */}
      <div className="hero-panels">
        {/* Brand Glass Panel — appears first, swap /logo.png for your real logo later */}
        <div ref={brandRef} className="hero-brand glass-panel">
          <img src={siteConfig.brand.logoSrc} alt={siteConfig.brand.logoAlt} className="hero-brand-logo" />
        </div>

        {/* Content Glass Panel — appears after the brand */}
        <div ref={contentRef} className="hero-content glass-panel">
          <h1>{siteConfig.hero.heading}</h1>
          <p>{siteConfig.hero.body}</p>
        </div>
      </div>

    </section>
  );
}
