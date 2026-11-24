/** True when running as an installed PWA / home-screen app (not a normal browser tab). */
export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const ios = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  return media || ios || fullscreen;
}
