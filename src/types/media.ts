export type WoodTone = 'oak' | 'walnut' | 'ash' | 'cherry' | 'teak' | 'maple';

export interface MediaImage {
  id: string;
  /** Public URL. `null` renders a labelled placeholder (used by demo content). */
  url: string | null;
  alt: string;
  width?: number;
  height?: number;
  /** Colour of the placeholder surface when there is no photo. */
  tone?: WoodTone;
}
