/** Tiny preset ids only — boring-avatars renders client-side from the seed (no images in Mongo). */
export const AVATAR_PRESETS = [
  'uw-a01',
  'uw-a02',
  'uw-a03',
  'uw-a04',
  'uw-a05',
  'uw-a06',
  'uw-a07',
  'uw-a08',
  'uw-a09',
  'uw-a10',
  'uw-a11',
  'uw-a12',
  'uw-a13',
  'uw-a14',
  'uw-a15',
  'uw-a16',
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number];

export function isAvatarPreset(value: unknown): value is AvatarPresetId {
  return typeof value === 'string' && (AVATAR_PRESETS as readonly string[]).includes(value);
}

export function normalizeAvatarSeed(value: unknown): AvatarPresetId | undefined {
  if (!isAvatarPreset(value)) return undefined;
  return value;
}

/** Pick a stable preset from a string (name/id) without storing extra data. */
export function presetFromFallback(seed: string): AvatarPresetId {
  let h = 2166136261;
  const s = seed || 'uw';
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return AVATAR_PRESETS[(h >>> 0) % AVATAR_PRESETS.length];
}

export function randomAvatarPreset(): AvatarPresetId {
  return AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
}
