/**
 * Profile imagery registry.
 *
 * The backend `User` document has no avatar column (and adding one would change
 * every auth response), so the presentation layer keeps a small, explicit mapping
 * from a display name to a portrait shipped through the Angular asset pipeline.
 * Users without a portrait fall back to the initials avatar — never a placeholder
 * image, so a missing file can never render as a broken image.
 */
export interface ProfilePortrait {
  /** Public asset path (served from `frontend/public`). */
  src: string;
  /** Accessible description used for the `alt` attribute. */
  alt: string;
  /** Job title shown on the professional profile card. */
  title: string;
  /** Specialty shown next to the title. */
  specialty: string;
}

const PORTRAITS: Record<string, ProfilePortrait> = {
  'dr. sarah khan': {
    src: 'assets/dr-sarah-khan.svg',
    alt: 'Professional profile photo of Dr. Sarah Khan',
    title: 'Doctor',
    specialty: 'Cardiology',
  },
  'nurse priya sharma': {
    src: 'assets/nurse-priya-sharma.svg',
    alt: 'Professional profile photo of Nurse Priya Sharma',
    title: 'Nurse',
    specialty: 'Medical-Surgical Ward',
  },
};

/** Returns the portrait for a display name, or `null` when initials should be used. */
export function profilePortrait(name?: string | null): ProfilePortrait | null {
  if (!name) return null;
  return PORTRAITS[name.trim().toLowerCase()] ?? null;
}

/** Portrait source for a display name, or `null` when the initials avatar is correct. */
export function profilePhotoSrc(name?: string | null): string | null {
  return profilePortrait(name)?.src ?? null;
}
