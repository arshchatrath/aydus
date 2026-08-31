import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { siteConfig } from './siteConfig';

gsap.registerPlugin(ScrollTrigger);

// Mobile browsers fire resize when the URL bar collapses. Without this, every
// scroll direction change on iOS recalculates trigger positions and stutters.
ScrollTrigger.config({ ignoreMobileResize: true });

// useLayoutEffect runs before paint so the split + initial hidden state never flash.
// Falls back to useEffect on the server to avoid the SSR warning.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const SECTIONS_DATA = [
  {
    id: 'work',
    title: 'Selected work',
    meta: 'Brand systems, websites, product interfaces',
    body: [
      'We work with companies that have outgrown their first identity. Most engagements run eight to twelve weeks, from research through to a design system your team can maintain without us.',
      'Recent projects include a public-markets research platform, a chain of neighbourhood bakeries, and a European rail operator’s booking flow.',
    ],
    action: { label: 'See the case studies', href: '#case-studies' },
  },
  {
    id: 'about',
    title: 'How we work',
    meta: 'Eight people. Founded 2016.',
    body: [
      'Designers, writers, and engineers who ship in the same room. There is no account layer between you and the people doing the work.',
      'We take on seven projects a year. The limit is the point: it keeps the thinking slow and the timelines honest.',
    ],
    action: { label: 'Read the studio notes', href: '#notes' },
  },
  {
    id: 'contact',
    title: 'Start a project',
    meta: 'Lisbon and remote',
    body: [
      'Tell us what you are building and what is in the way. We read everything and reply within two working days, usually with questions before a proposal.',
      'For press, speaking, or anything else, the same address reaches us.',
    ],
    action: { label: siteConfig.contact.email, href: `mailto:${siteConfig.contact.email}` },
  },
];

/**
 * Wraps every word in its own span so words can be animated independently.
 * `masked` adds an overflow:hidden parent for the classic rise-from-the-line reveal.
 * Original text is stashed on the node so React StrictMode's double-invoke
 * (and the effect cleanup) can restore the DOM instead of splitting twice.
 */
function splitWords(el, masked = false) {
  if (!el) return [];
  if (el.dataset.sxOriginal === undefined) el.dataset.sxOriginal = el.textContent;

  const words = el.dataset.sxOriginal.split(/\s+/).filter(Boolean);
  el.textContent = '';

  return words.map((word, i) => {
    const outer = document.createElement('span');
    const inner = document.createElement('span');
    inner.textContent = word;
    outer.className = masked ? 'sx-mask' : 'sx-word';
    outer.appendChild(inner);
    el.appendChild(outer);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    return masked ? inner : outer;
  });
}

function restoreWords(el) {
  if (el && el.dataset.sxOriginal !== undefined) el.textContent = el.dataset.sxOriginal;
}

const Section = React.memo(function Section({ id, title, meta, body, action }) {
  const root = useRef(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const heading = el.querySelector('[data-heading]');
    const rule = el.querySelector('[data-rule]');
    const metaEl = el.querySelector('[data-meta]');
    const link = el.querySelector('[data-link]');
    const paragraphs = gsap.utils.toArray('[data-body]', el);
    const column = el.querySelector('[data-column]');

    const headingWords = splitWords(heading, true);
    const bodyWords = paragraphs.flatMap((p) => splitWords(p, false));

    const mm = gsap.matchMedia();

    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        // Reduced motion: everything renders in its final state, no triggers created.
        if (context.conditions.reduced) return;

        gsap.set(headingWords, { yPercent: 115 });
        gsap.set(rule, { scaleX: 0 });
        gsap.set([metaEl, link], { opacity: 0, y: 16 });
        gsap.set(bodyWords, { opacity: 0.16 });

        // One orchestrated entrance per section: the rule draws, the title rises
        // out of it, then the supporting text settles. `once` on purpose — replaying
        // in reverse on every upward scroll is what makes these pages feel twitchy.
        gsap
          .timeline({
            defaults: { ease: 'power4.out' },
            scrollTrigger: { trigger: el, start: 'top 76%', once: true },
          })
          .to(rule, { scaleX: 1, duration: 1.4, ease: 'expo.out' })
          .to(headingWords, { yPercent: 0, duration: 1.15, stagger: 0.06 }, 0.12)
          .to(metaEl, { opacity: 1, y: 0, duration: 0.9 }, 0.55)
          .to(link, { opacity: 1, y: 0, duration: 0.9 }, 0.7);

        // Body copy brightens word by word, tied to scroll position rather than a
        // timer — the reader controls the pace, so it reads as legibility, not decor.
        gsap.to(bodyWords, {
          opacity: 1,
          ease: 'none',
          stagger: { each: 0.04 },
          scrollTrigger: {
            trigger: column,
            start: 'top 80%',
            end: 'bottom 62%',
            scrub: 0.6,
          },
        });
      }
    );

    return () => {
      mm.revert(); // kills every tween and ScrollTrigger created inside
      restoreWords(heading);
      paragraphs.forEach(restoreWords);
    };
  }, []);

  return (
    <section className="sx-section" id={id} ref={root} aria-labelledby={`${id}-title`}>
      <span className="sx-rule" data-rule aria-hidden="true" />

      <h2 className="sx-heading" id={`${id}-title`} data-heading>
        {title}
      </h2>

      <div className="sx-grid">
        <p className="sx-meta" data-meta>
          {meta}
        </p>

        <div className="sx-column" data-column>
          {body.map((paragraph, i) => (
            <p className="sx-body" data-body key={i}>
              {paragraph}
            </p>
          ))}
          <a className="sx-link" href={action.href} data-link>
            {action.label}
          </a>
        </div>
      </div>
    </section>
  );
});

export default function Sections() {
  useEffect(() => {
    // Web fonts change line boxes after first paint, which invalidates every
    // measured trigger position. Recalculate once they land.
    if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }, []);

  return (
    <div className="sx-root">
      <style>{STYLES}</style>
      {SECTIONS_DATA.map((section) => (
        <Section key={section.id} {...section} />
      ))}
    </div>
  );
}

const STYLES = `
.sx-root {
  /* Tokens — override these from a parent to retheme without touching the JS. */
  --sx-paper: #EDE9E1;
  --sx-muted: #918D85;
  --sx-rule: rgba(237, 233, 225, 0.18);
  --sx-accent: #9AAAC4;
  --sx-display: 'Times New Roman', Times, ui-serif, Georgia, serif;
  --sx-body: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;

  position: relative;
  z-index: 1;
  background: transparent;
  color: var(--sx-paper);
  font-family: var(--sx-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Add sx-on-light to the root when the page background behind it is pale. */
.sx-root.sx-on-light {
  --sx-paper: #1A1917;
  --sx-muted: #6B675F;
  --sx-rule: rgba(26, 25, 23, 0.18);
  --sx-accent: #41567A;
}

.sx-section {
  padding: clamp(5rem, 14vh, 11rem) clamp(1.5rem, 5vw, 6rem);
  max-width: 96rem;
  margin-inline: auto;
}

.sx-rule {
  display: block;
  height: 1px;
  background: var(--sx-rule);
  transform-origin: left center;
  will-change: transform;
}

.sx-heading {
  font-family: var(--sx-display);
  font-weight: 400;
  font-size: clamp(2.9rem, 8.6vw, 8.75rem);
  line-height: 0.93;
  letter-spacing: -0.035em;
  max-width: 13ch;
  margin: clamp(1.75rem, 4vw, 3.25rem) 0 clamp(2.5rem, 5.5vw, 4.5rem);
}

/* Mask + inner span: padding/negative margin keeps descenders from clipping. */
.sx-mask {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  padding-bottom: 0.14em;
  margin-bottom: -0.14em;
}
.sx-mask > span {
  display: inline-block;
  will-change: transform;
}
.sx-word { display: inline-block; }

.sx-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.15fr);
  gap: clamp(1.5rem, 4vw, 4.5rem);
  align-items: start;
}

.sx-meta {
  margin: 0;
  color: var(--sx-muted);
  font-size: 0.875rem;
  line-height: 1.5;
  max-width: 22ch;
}

.sx-column { max-width: 58ch; }

.sx-body {
  margin: 0 0 1.4em;
  font-size: clamp(1.0625rem, 1.15vw, 1.1875rem);
  line-height: 1.62;
  letter-spacing: -0.005em;
}
.sx-body:last-of-type { margin-bottom: 0; }

.sx-link {
  position: relative;
  display: inline-block;
  margin-top: clamp(1.75rem, 3vw, 2.75rem);
  padding-bottom: 0.35em;
  color: var(--sx-paper);
  font-size: 1rem;
  text-decoration: none;
  border-bottom: 1px solid var(--sx-rule);
}
.sx-link::after {
  content: '';
  position: absolute;
  inset: auto 0 -1px 0;
  height: 1px;
  background: var(--sx-accent);
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform 0.55s cubic-bezier(0.19, 1, 0.22, 1);
}
.sx-link:hover::after,
.sx-link:focus-visible::after {
  transform: scaleX(1);
  transform-origin: left center;
}
.sx-link:focus-visible {
  outline: 2px solid var(--sx-accent);
  outline-offset: 8px;
}

@media (max-width: 860px) {
  .sx-grid { grid-template-columns: 1fr; gap: 1.75rem; }
  .sx-heading { max-width: 100%; }
  .sx-meta { max-width: none; }
}

@media (prefers-reduced-motion: reduce) {
  .sx-link::after { transition: none; }
}
`;