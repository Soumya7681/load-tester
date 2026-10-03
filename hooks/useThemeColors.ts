'use client';

import { useEffect, useState } from 'react';

const TOKENS = ['primary', 'primary-soft', 'accent', 'fail', 'ok', 'muted', 'line', 'ink', 'surface'] as const;
export type ThemeColors = Record<(typeof TOKENS)[number], string>;

// Light values as a first-render fallback, before CSS variables can be read.
const FALLBACK: ThemeColors = {
  primary: '#800020',
  'primary-soft': '#f3e4e6',
  accent: '#9a7440',
  fail: '#c2410c',
  ok: '#2f6b4f',
  muted: '#6f5f62',
  line: '#e7ded3',
  ink: '#2a1a1d',
  surface: '#fffdf9',
};

/** Theme tokens as concrete colors for SVG charts, refreshed when light/dark changes. */
export function useThemeColors() {
  const [colors, setColors] = useState<ThemeColors>(FALLBACK);

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      const next = { ...FALLBACK };
      for (const t of TOKENS) next[t] = style.getPropertyValue(`--${t}`).trim() || FALLBACK[t];
      setColors(next);
    };
    read();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  return colors;
}
