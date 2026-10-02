/**
 * Curate Engine — Upscale Split View Slider Helper
 * Calculates and manages Before/After divider positions, touch/mouse pointer clamping,
 * and keyboard accessibility steps.
 */

export function calculateUpscaleSplitPos(
  clientX: number,
  containerLeft: number,
  containerWidth: number
): number {
  if (containerWidth <= 0) return 50;
  const relativeX = clientX - containerLeft;
  const clampedX = Math.max(0, Math.min(containerWidth, relativeX));
  return Math.round((clampedX / containerWidth) * 100);
}

export function stepUpscaleSplitPos(
  current: number,
  direction: 'left' | 'right' | 'home' | 'end',
  step: number = 5
): number {
  switch (direction) {
    case 'left':
      return Math.max(0, current - step);
    case 'right':
      return Math.min(100, current + step);
    case 'home':
      return 0;
    case 'end':
      return 100;
    default:
      return current;
  }
}
