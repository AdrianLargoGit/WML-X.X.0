import type { AnimationDefinition } from 'framer-motion'
import type { PetMood } from '../../../preload/index'

const activeSprite = new URL(
  '../../../../public/animals/hedgehog/erizoactivo-max-px-frames-36-rows-6-cols-6.png',
  import.meta.url
).href
const sittingSprite = new URL(
  '../../../../public/animals/hedgehog/erizosentado-max-px-frames-36-rows-6-cols-6 (2).png',
  import.meta.url
).href
const sleepingSprite = new URL(
  '../../../../public/animals/hedgehog/erizodormido-max-px-frames-36-rows-6-cols-6 (3).png',
  import.meta.url
).href
const transitionSittingSprite = new URL(
  '../../../../public/animals/hedgehog/erizosentandose-max-px-frames-36-rows-6-cols-6 (1).png',
  import.meta.url
).href
const transitionSleepingSprite = new URL(
  '../../../../public/animals/hedgehog/erizodurmiendose-max-px-frames-36-rows-6-cols-6 (4).png',
  import.meta.url
).href
const duckActiveSprite = new URL(
  '../../../../public/animals/duck/patoactivo-normalized.png',
  import.meta.url
).href
const duckActiveBodyMask = new URL(
  '../../../../public/animals/duck/patoactivo-body-mask-normalized.png',
  import.meta.url
).href
const duckActiveNonBodySprite = new URL(
  '../../../../public/animals/duck/patoactivo-non-body-normalized.png',
  import.meta.url
).href
const duckSittingSprite = new URL(
  '../../../../public/animals/duck/patosentado-normalized.png',
  import.meta.url
).href
const duckSittingBodyMask = new URL(
  '../../../../public/animals/duck/patosentado-body-mask-normalized.png',
  import.meta.url
).href
const duckSittingNonBodySprite = new URL(
  '../../../../public/animals/duck/patosentado-non-body-normalized.png',
  import.meta.url
).href
const duckSleepingSprite = new URL(
  '../../../../public/animals/duck/patodormido-normalized.png',
  import.meta.url
).href
const duckSleepingBodyMask = new URL(
  '../../../../public/animals/duck/patodormido-body-mask-normalized.png',
  import.meta.url
).href
const duckSleepingNonBodySprite = new URL(
  '../../../../public/animals/duck/patodormido-non-body-normalized.png',
  import.meta.url
).href
const duckTransitionSittingSprite = new URL(
  '../../../../public/animals/duck/patosentandose-normalized.png',
  import.meta.url
).href
const duckTransitionSittingBodyMask = new URL(
  '../../../../public/animals/duck/patosentandose-body-mask-normalized.png',
  import.meta.url
).href
const duckTransitionSittingNonBodySprite = new URL(
  '../../../../public/animals/duck/patosentandose-non-body-normalized.png',
  import.meta.url
).href
const duckTransitionSleepingSprite = new URL(
  '../../../../public/animals/duck/patodurmiendose-normalized.png',
  import.meta.url
).href
const duckTransitionSleepingBodyMask = new URL(
  '../../../../public/animals/duck/patodurmiendose-body-mask-normalized.png',
  import.meta.url
).href
const duckTransitionSleepingNonBodySprite = new URL(
  '../../../../public/animals/duck/patodurmiendose-non-body-normalized.png',
  import.meta.url
).href
const duckPeckingSprite = new URL(
  '../../../../public/animals/duck/patopicando-normalized.png',
  import.meta.url
).href
const duckPeckingBodyMask = new URL(
  '../../../../public/animals/duck/patopicando-body-mask-normalized.png',
  import.meta.url
).href
const duckPeckingNonBodySprite = new URL(
  '../../../../public/animals/duck/patopicando-non-body-normalized.png',
  import.meta.url
).href

export interface SpriteSheetConfig {
  src: string
  cols: number
  rows: number
  frameCount: number
  fps: number
  loop?: boolean
  sheetWidth?: number
  sheetHeight?: number
  bodyMaskSrc?: string
  nonBodySrc?: string
  bodyTextureFilter?: string
  displayScale?: number
  colorMode?: 'full' | 'body-mask'
  crownAnchor?: AccessoryAnchor
}

export interface AccessoryAnchor {
  xPercent: number
  yPercent: number
  widthPercent: number
  rotateDeg?: number
  bobXPercent?: number
  bobYPercent?: number
  rotateBobDeg?: number
  yByFrame?: number[]
}

export type MascotDisplayMood =
  Exclude<PetMood, 'dead'> | 'transitionSitting' | 'transitionSleeping' | 'pecking'

export interface MascotAnimationContext {
  mood: MascotDisplayMood
  activityPulse?: 'click' | 'type' | null
}

const hedgehogSpriteSheets: Record<string, SpriteSheetConfig> = {
  active: {
    src: activeSprite,
    cols: 6,
    rows: 6,
    frameCount: 36,
    fps: 12,
    loop: true,
    sheetWidth: 3168,
    sheetHeight: 2988,
    crownAnchor: {
      xPercent: 0.5,
      yPercent: -0.135,
      widthPercent: 0.27,
      rotateDeg: -4,
      bobYPercent: 0.006,
      rotateBobDeg: 3
    }
  },
  sitting: {
    src: sittingSprite,
    cols: 6,
    rows: 6,
    frameCount: 36,
    fps: 12,
    loop: true,
    sheetWidth: 3120,
    sheetHeight: 2976,
    crownAnchor: {
      xPercent: 0.5,
      yPercent: -0.125,
      widthPercent: 0.26,
      rotateDeg: -2,
      bobYPercent: 0.006,
      rotateBobDeg: 2
    }
  },
  sleeping: {
    src: sleepingSprite,
    cols: 6,
    rows: 6,
    frameCount: 36,
    fps: 12,
    loop: true,
    sheetWidth: 3708,
    sheetHeight: 2628,
    crownAnchor: {
      xPercent: 0.52,
      yPercent: -0.045,
      widthPercent: 0.24,
      rotateDeg: 13,
      bobYPercent: 0.004,
      rotateBobDeg: 1.5
    }
  },
  transitionSitting: {
    src: transitionSittingSprite,
    cols: 6,
    rows: 6,
    frameCount: 36,
    fps: 40,
    loop: false,
    sheetWidth: 3132,
    sheetHeight: 3012,
    crownAnchor: {
      xPercent: 0.51,
      yPercent: -0.12,
      widthPercent: 0.26,
      rotateDeg: -3,
      bobXPercent: 0.006,
      bobYPercent: 0.01,
      rotateBobDeg: 4
    }
  },
  transitionSleeping: {
    src: transitionSleepingSprite,
    cols: 6,
    rows: 6,
    frameCount: 36,
    fps: 50,
    loop: false,
    sheetWidth: 3528,
    sheetHeight: 2856,
    crownAnchor: {
      xPercent: 0.52,
      yPercent: -0.035,
      widthPercent: 0.24,
      rotateDeg: 12,
      bobXPercent: 0.006,
      bobYPercent: 0.01,
      rotateBobDeg: 4
    }
  },
  scared: {
    src: activeSprite,
    cols: 6,
    rows: 6,
    frameCount: 36,
    fps: 12,
    loop: true,
    sheetWidth: 3168,
    sheetHeight: 2988,
    crownAnchor: {
      xPercent: 0.5,
      yPercent: -0.135,
      widthPercent: 0.27,
      rotateDeg: -4,
      bobXPercent: 0.012,
      bobYPercent: 0.008,
      rotateBobDeg: 6
    }
  },
  critical: {
    src: activeSprite,
    cols: 6,
    rows: 6,
    frameCount: 36,
    fps: 12,
    loop: true,
    sheetWidth: 3168,
    sheetHeight: 2988,
    crownAnchor: {
      xPercent: 0.5,
      yPercent: -0.13,
      widthPercent: 0.26,
      rotateDeg: -5,
      bobYPercent: 0.006,
      rotateBobDeg: 2
    }
  }
}

function createDuckSheet(
  src: string,
  bodyMaskSrc: string,
  nonBodySrc: string,
  fps: number,
  sheetWidth: number,
  sheetHeight: number,
  loop = true,
  displayScale = 1,
  crownAnchor: AccessoryAnchor = {
    xPercent: 0.5,
    yPercent: -0.09,
    widthPercent: 0.29,
    rotateDeg: 1,
    bobYPercent: 0.005,
    rotateBobDeg: 2
  }
): SpriteSheetConfig {
  return {
    src,
    bodyMaskSrc,
    nonBodySrc,
    bodyTextureFilter: 'grayscale(1) brightness(1.08) contrast(1.18)',
    displayScale,
    crownAnchor,
    colorMode: 'body-mask',
    cols: 6,
    rows: 6,
    frameCount: 36,
    fps,
    loop,
    sheetWidth,
    sheetHeight
  }
}

const duckSpriteSheets: Record<string, SpriteSheetConfig> = {
  active: createDuckSheet(
    duckActiveSprite,
    duckActiveBodyMask,
    duckActiveNonBodySprite,
    9,
    2880,
    3720
  ),
  sitting: createDuckSheet(
    duckSittingSprite,
    duckSittingBodyMask,
    duckSittingNonBodySprite,
    8,
    2880,
    3720,
    true,
    1,
    {
      xPercent: 0.5,
      yPercent: -0.055,
      widthPercent: 0.28,
      rotateDeg: -1,
      bobYPercent: 0.004,
      rotateBobDeg: 1.5
    }
  ),
  sleeping: createDuckSheet(
    duckSleepingSprite,
    duckSleepingBodyMask,
    duckSleepingNonBodySprite,
    8,
    2880,
    3720,
    true,
    1,
    {
      xPercent: 0.53,
      yPercent: 0.07,
      widthPercent: 0.25,
      rotateDeg: 14,
      bobYPercent: 0.003,
      rotateBobDeg: 1
    }
  ),
  transitionSitting: createDuckSheet(
    duckTransitionSittingSprite,
    duckTransitionSittingBodyMask,
    duckTransitionSittingNonBodySprite,
    32,
    2880,
    3720,
    false,
    1.04,
    {
      xPercent: 0.5,
      yPercent: -0.04,
      widthPercent: 0.28,
      rotateDeg: -1,
      bobYPercent: 0.018,
      rotateBobDeg: 5
    }
  ),
  transitionSleeping: createDuckSheet(
    duckTransitionSleepingSprite,
    duckTransitionSleepingBodyMask,
    duckTransitionSleepingNonBodySprite,
    34,
    2880,
    3720,
    false,
    1.06,
    {
      xPercent: 0.52,
      yPercent: 0.06,
      widthPercent: 0.25,
      rotateDeg: 10,
      bobYPercent: 0.004,
      rotateBobDeg: 4,
      yByFrame: [
        0.024, 0.024, 0.024, 0.024, 0.024, 0.024, 0.026, 0.026, 0.029, 0.035, 0.039, 0.037, 0.037,
        0.032, 0.032, 0.032, 0.042, 0.045, 0.058, 0.058, 0.071, 0.077, 0.082, 0.087, 0.09, 0.103,
        0.11, 0.116, 0.116, 0.126, 0.139, 0.14, 0.151, 0.155, 0.163, 0.169
      ]
    }
  ),
  pecking: createDuckSheet(
    duckPeckingSprite,
    duckPeckingBodyMask,
    duckPeckingNonBodySprite,
    72,
    2880,
    3720,
    false,
    1.18,
    {
      xPercent: 0.5,
      yPercent: 0.04,
      widthPercent: 0.28,
      rotateDeg: -6,
      bobXPercent: 0.008,
      bobYPercent: 0.004,
      rotateBobDeg: 8,
      yByFrame: [
        0.022, 0.02, 0.02, 0.02, 0.025, 0.036, 0.048, 0.086, 0.18, 0.204, 0.243, 0.28, 0.289, 0.294,
        0.298, 0.298, 0.298, 0.281, 0.246, 0.131, 0.073, 0.043, 0.035, 0.025, 0.022, 0.022, 0.023,
        0.023, 0.023, 0.023, 0.023, 0.023, 0.023, 0.023, 0.023, 0.023
      ]
    }
  ),
  scared: createDuckSheet(
    duckActiveSprite,
    duckActiveBodyMask,
    duckActiveNonBodySprite,
    10,
    2880,
    3720
  ),
  critical: createDuckSheet(
    duckActiveSprite,
    duckActiveBodyMask,
    duckActiveNonBodySprite,
    10,
    2880,
    3720
  )
}

export function getMascotSpriteSheet(
  mood: MascotDisplayMood,
  species = 'spark'
): SpriteSheetConfig {
  const sheets = species === 'duck' ? duckSpriteSheets : hedgehogSpriteSheets
  return sheets[mood] ?? sheets.active
}

export function getMascotSpriteSources(species = 'spark', includeBodyTint = false): string[] {
  const sheets = species === 'duck' ? duckSpriteSheets : hedgehogSpriteSheets

  return Object.values(sheets).flatMap((sheet) =>
    getMascotSpriteSourcesForSheet(sheet, includeBodyTint)
  )
}

export function getMascotSpriteSourcesForSheet(
  sheet: SpriteSheetConfig,
  includeBodyTint = false
): string[] {
  const { src, bodyMaskSrc, nonBodySrc } = sheet

  return includeBodyTint && bodyMaskSrc && nonBodySrc ? [src, bodyMaskSrc, nonBodySrc] : [src]
}

export function getMascotAnimation({
  mood,
  activityPulse
}: MascotAnimationContext): AnimationDefinition {
  if (mood === 'sleeping' || mood === 'transitionSleeping') {
    return {
      y: [0, -1, 0],
      rotate: [-0.5, 0.5, -0.5],
      transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const }
    }
  }

  if (mood === 'scared') {
    return {
      x: [-3, 3, -2, 2, 0],
      transition: { duration: 0.34, repeat: Infinity, ease: 'easeInOut' as const }
    }
  }

  if (mood === 'sitting' || mood === 'transitionSitting') {
    return {
      y: 2,
      rotate: 0,
      scale: 1,
      x: 0,
      transition: { duration: 0.25, ease: 'easeOut' as const }
    }
  }

  if (mood === 'pecking') {
    return {
      y: 0,
      rotate: 0,
      scale: 1,
      x: 0,
      transition: { duration: 0.08, ease: 'linear' as const }
    }
  }

  if (activityPulse === 'type') {
    return {
      y: [0, -12, 0],
      rotate: [-3, 3, 0],
      transition: { duration: 0.5, ease: 'easeInOut' as const }
    }
  }

  if (activityPulse === 'click') {
    return {
      scale: [1, 1.06, 1],
      transition: { duration: 0.24, ease: 'easeInOut' as const }
    }
  }

  return {
    y: 0,
    rotate: 0,
    scale: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const }
  }
}
