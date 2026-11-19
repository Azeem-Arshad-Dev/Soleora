/** 'full' | 'light' | 'stills' */
export function detectTier() {
  const q = new URLSearchParams(location.search);
  if (q.has('no3d')) return 'stills';
  if (navigator.connection && navigator.connection.saveData) return 'stills';
  try {
    const c = document.createElement('canvas');
    if (!c.getContext('webgl2')) return 'stills';
  } catch { return 'stills'; }
  const mem = navigator.deviceMemory;
  if ((mem && mem < 4) || Math.min(screen.width, screen.height) < 500) return 'light';
  return 'full';
}
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
