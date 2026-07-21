import { motion, useAnimation } from 'framer-motion'
import type { CSSProperties, ReactElement } from 'react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { AppState, PetMood } from '../../../preload/index'
import {
  getMascotAnimation,
  getMascotSpriteSheet,
  getMascotSpriteSources,
  getMascotSpriteSourcesForSheet
} from './petStates'
import type { MascotDisplayMood, SpriteSheetConfig } from './petStates'
import { getTranslations, type TranslationSet } from '../i18n'
import { getPetColorForSpecies } from '../../../shared/petColors'

const crownImage = new URL('../../../../public/accessories/corona-trimmed.png', import.meta.url)
  .href

interface MascotaProps {
  state: AppState
  compact?: boolean
  activityPulse?: 'click' | 'type' | null
  displaySize?: number
  allowWindowDrag?: boolean
  mirrorHorizontally?: boolean
}

type IdleWindow = typeof window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

const preloadedSpriteSources = new Set<string>()

function preloadSpriteSource(src: string): void {
  if (!src || preloadedSpriteSources.has(src)) {
    return
  }

  preloadedSpriteSources.add(src)
  const image = new Image()
  image.decoding = 'async'
  image.loading = 'eager'
  image.src = src
}

function preloadSpriteSources(sources: string[]): void {
  Array.from(new Set(sources)).forEach(preloadSpriteSource)
}

function scheduleSpritePreload(callback: () => void): () => void {
  const idleWindow = window as IdleWindow

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 1200 })
    return () => idleWindow.cancelIdleCallback?.(handle)
  }

  const handle = window.setTimeout(callback, 180)
  return () => window.clearTimeout(handle)
}

function MascotSpritePreloader({
  species,
  includeBodyTint,
  currentSpriteConfig
}: {
  species: string
  includeBodyTint: boolean
  currentSpriteConfig: SpriteSheetConfig
}): ReactElement | null {
  useEffect(() => {
    preloadSpriteSources(getMascotSpriteSourcesForSheet(currentSpriteConfig, includeBodyTint))

    return scheduleSpritePreload(() => {
      preloadSpriteSources(getMascotSpriteSources(species, includeBodyTint))
    })
  }, [species, includeBodyTint, currentSpriteConfig])

  return null
}

function getMascotMoodLabel(mood: string, text: TranslationSet): string {
  const labels: Record<string, string> = {
    active: text.moodReady,
    sitting: text.moodSitting,
    sleeping: text.moodSleepingNow,
    scared: text.moodScaredMascot,
    critical: text.moodNoEnergy,
    transitionSitting: text.moodSitting,
    transitionSleeping: text.moodSleepingNow
  }

  return labels[mood] ?? mood
}

function SpriteFrame({
  spriteConfig,
  frameIndex,
  size,
  colorFilter,
  bodyTintHex,
  bodyTintBackground,
  tintScope,
  accessory,
  mirrorHorizontally
}: {
  spriteConfig: SpriteSheetConfig
  frameIndex: number
  size: number
  colorFilter: string
  bodyTintHex?: string
  bodyTintBackground?: string
  tintScope?: 'body' | 'full'
  accessory?: string | null
  mirrorHorizontally: boolean
}): ReactElement {
  const frameWidth = spriteConfig.sheetWidth ? spriteConfig.sheetWidth / spriteConfig.cols : 0
  const frameHeight = spriteConfig.sheetHeight ? spriteConfig.sheetHeight / spriteConfig.rows : 0
  const scale = frameWidth && frameHeight ? Math.min(size / frameWidth, size / frameHeight) : 1
  const frameRenderWidth = frameWidth * scale
  const frameRenderHeight = frameHeight * scale
  const sheetRenderWidth = (spriteConfig.sheetWidth ?? 0) * scale
  const sheetRenderHeight = (spriteConfig.sheetHeight ?? 0) * scale
  const colIndex = frameIndex % spriteConfig.cols
  const rowIndex = Math.floor(frameIndex / spriteConfig.cols)
  const cssPx = (value: number): string => `${value.toFixed(4)}px`
  const sheetTransform = `translate3d(${cssPx(-colIndex * frameRenderWidth)}, ${cssPx(-rowIndex * frameRenderHeight)}, 0)`
  const maskStyle =
    spriteConfig.bodyMaskSrc && spriteConfig.colorMode === 'body-mask'
      ? ({
          maskImage: `url("${spriteConfig.bodyMaskSrc}")`,
          maskPosition: '0 0',
          maskRepeat: 'no-repeat',
          maskSize: `${cssPx(sheetRenderWidth)} ${cssPx(sheetRenderHeight)}`,
          WebkitMaskImage: `url("${spriteConfig.bodyMaskSrc}")`,
          WebkitMaskPosition: '0 0',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskSize: `${cssPx(sheetRenderWidth)} ${cssPx(sheetRenderHeight)}`
        } as CSSProperties)
      : undefined
  const fullSpriteMaskStyle =
    spriteConfig.colorMode === 'body-mask'
      ? ({
          maskImage: `url("${spriteConfig.src}")`,
          maskPosition: '0 0',
          maskRepeat: 'no-repeat',
          maskSize: `${cssPx(sheetRenderWidth)} ${cssPx(sheetRenderHeight)}`,
          WebkitMaskImage: `url("${spriteConfig.src}")`,
          WebkitMaskPosition: '0 0',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskSize: `${cssPx(sheetRenderWidth)} ${cssPx(sheetRenderHeight)}`
        } as CSSProperties)
      : undefined
  const usesFullTint = tintScope === 'full' && colorFilter !== 'none'
  const usesBodyMask = Boolean(maskStyle)
  const usesBodyTint = usesBodyMask && colorFilter !== 'none'
  const baseSpriteSource =
    usesBodyTint && !usesFullTint && spriteConfig.nonBodySrc
      ? spriteConfig.nonBodySrc
      : spriteConfig.src
  const bodyTextureFilter =
    spriteConfig.bodyTextureFilter ?? 'grayscale(1) brightness(1.06) contrast(1.22)'
  const displayScale = spriteConfig.displayScale ?? 1
  const crownAnchor = accessory === 'crown' ? spriteConfig.crownAnchor : undefined
  const crownPhase = (frameIndex / Math.max(1, spriteConfig.frameCount - 1)) * Math.PI * 2
  const crownX =
    crownAnchor &&
    frameRenderWidth *
      (crownAnchor.xPercent + Math.sin(crownPhase) * (crownAnchor.bobXPercent ?? 0))
  const crownY =
    crownAnchor &&
    frameRenderHeight *
      ((crownAnchor.yByFrame?.[frameIndex] ?? crownAnchor.yPercent) +
        Math.cos(crownPhase) * (crownAnchor.bobYPercent ?? 0))
  const crownWidth = crownAnchor && frameRenderWidth * crownAnchor.widthPercent
  const crownRotation =
    crownAnchor &&
    (crownAnchor.rotateDeg ?? 0) + Math.sin(crownPhase) * (crownAnchor.rotateBobDeg ?? 0)

  return (
    <span
      className="pet-sprite pet-sprite--clip"
      aria-hidden="true"
      style={{
        width: cssPx(frameRenderWidth),
        height: cssPx(frameRenderHeight),
        transform:
          mirrorHorizontally || displayScale !== 1
            ? `scale(${mirrorHorizontally ? -displayScale : displayScale}, ${displayScale})`
            : undefined,
        transformOrigin: 'center bottom'
      }}
    >
      <span
        className="pet-sprite-viewport"
        aria-hidden="true"
        style={{
          width: cssPx(frameRenderWidth),
          height: cssPx(frameRenderHeight)
        }}
      >
        <img
          className="pet-sprite-sheet-image"
          src={baseSpriteSource}
          loading="eager"
          decoding="async"
          draggable={false}
          alt=""
          style={{
            width: cssPx(sheetRenderWidth),
            height: cssPx(sheetRenderHeight),
            filter: usesBodyMask && !usesFullTint ? undefined : colorFilter,
            transform: sheetTransform
          }}
        />
        {usesFullTint && bodyTintBackground && (
          <span
            className="pet-sprite-sheet-image pet-sprite-sheet-image--body-color"
            aria-hidden="true"
            style={{
              width: cssPx(sheetRenderWidth),
              height: cssPx(sheetRenderHeight),
              background: bodyTintBackground,
              backgroundSize: '170% 170%',
              animation: 'pet-metal-shine 6.6s ease-in-out infinite',
              mixBlendMode: 'screen',
              opacity: 0.72,
              transform: sheetTransform,
              ...fullSpriteMaskStyle
            }}
          />
        )}
        {usesBodyTint && !usesFullTint && (
          <>
            {bodyTintHex && (
              <span
                className="pet-sprite-sheet-image pet-sprite-sheet-image--body-color"
                aria-hidden="true"
                style={{
                  width: cssPx(sheetRenderWidth),
                  height: cssPx(sheetRenderHeight),
                  background: bodyTintBackground ?? bodyTintHex,
                  backgroundSize: bodyTintBackground ? '135% 135%' : undefined,
                  animation: bodyTintBackground
                    ? 'pet-metal-shine 8s ease-in-out infinite'
                    : undefined,
                  transform: sheetTransform,
                  ...maskStyle
                }}
              />
            )}
            <img
              className="pet-sprite-sheet-image pet-sprite-sheet-image--body-texture"
              src={spriteConfig.src}
              loading="eager"
              decoding="async"
              draggable={false}
              alt=""
              style={{
                width: cssPx(sheetRenderWidth),
                height: cssPx(sheetRenderHeight),
                filter: bodyTintHex ? bodyTextureFilter : colorFilter,
                mixBlendMode: bodyTintHex ? 'multiply' : undefined,
                opacity: bodyTintHex ? 0.52 : 1,
                transform: sheetTransform,
                ...maskStyle
              }}
            />
          </>
        )}
      </span>
      {crownAnchor && crownX !== undefined && crownY !== undefined && crownWidth !== undefined && (
        <img
          className="pet-accessory pet-accessory--crown"
          src={crownImage}
          loading="eager"
          decoding="async"
          draggable={false}
          alt=""
          style={{
            left: cssPx(crownX),
            top: cssPx(crownY),
            width: cssPx(crownWidth),
            transform: `translate3d(-50%, 0, 0) rotate(${(crownRotation ?? 0).toFixed(3)}deg)`
          }}
        />
      )}
    </span>
  )
}

export default function Mascota({
  state,
  compact = false,
  activityPulse,
  displaySize,
  allowWindowDrag = false,
  mirrorHorizontally = false
}: MascotaProps): ReactElement {
  const { pet, mood, battery } = state
  const controls = useAnimation()
  const visibleMood: Exclude<PetMood, 'dead'> = mood === 'dead' ? 'sleeping' : mood
  const [frameIndex, setFrameIndex] = useState(0)
  const [displayMood, setDisplayMood] = useState<MascotDisplayMood>(visibleMood)
  const [transitionTarget, setTransitionTarget] = useState<MascotDisplayMood | null>(null)
  const previousMoodRef = useRef<Exclude<PetMood, 'dead'>>(visibleMood)
  const lastAffectionAtRef = useRef(0)
  const dragStartRef = useRef<{
    pointerScreenX: number
    pointerScreenY: number
    windowScreenX: number
    windowScreenY: number
  } | null>(null)
  const isDuck = pet.species === 'duck'
  const spriteConfig = getMascotSpriteSheet(displayMood, pet.species)
  const text = getTranslations(state.settings.language)
  const petColor = getPetColorForSpecies(pet.color, pet.species)

  function showMood(
    nextMood: MascotDisplayMood,
    nextTransitionTarget: MascotDisplayMood | null
  ): void {
    setDisplayMood(nextMood)
    setTransitionTarget(nextTransitionTarget)
    setFrameIndex(0)
  }

  useEffect(() => {
    controls.start(getMascotAnimation({ mood: displayMood, activityPulse }))
  }, [displayMood, activityPulse, controls])

  useEffect(() => {
    if (!isDuck || !activityPulse || mood !== 'active' || displayMood !== 'active') {
      return undefined
    }

    const timer = window.setTimeout(() => {
      showMood('pecking', 'active')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [activityPulse, displayMood, isDuck, mood, visibleMood])

  useEffect(() => {
    const previousMood = previousMoodRef.current
    let nextMood: MascotDisplayMood | null = null
    let nextTransitionTarget: MascotDisplayMood | null = null

    if (displayMood === 'pecking') {
      if (visibleMood === 'active') {
        previousMoodRef.current = visibleMood
        return undefined
      }

      if (visibleMood === 'sitting') {
        nextMood = 'transitionSitting'
        nextTransitionTarget = 'sitting'
      } else if (visibleMood === 'sleeping') {
        nextMood = 'transitionSleeping'
        nextTransitionTarget = 'sleeping'
      } else {
        nextMood = visibleMood
      }
    } else if (previousMood === 'active' && visibleMood === 'sitting') {
      nextMood = 'transitionSitting'
      nextTransitionTarget = 'sitting'
    } else if (previousMood !== 'sleeping' && visibleMood === 'sleeping') {
      nextMood = 'transitionSleeping'
      nextTransitionTarget = 'sleeping'
    } else if (previousMood !== visibleMood) {
      nextMood = visibleMood
    }

    previousMoodRef.current = visibleMood

    if (!nextMood) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      showMood(nextMood, nextTransitionTarget)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [displayMood, visibleMood])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        const nextFrame = current + 1

        if (nextFrame < spriteConfig.frameCount) {
          return nextFrame
        }

        if (transitionTarget) {
          setTransitionTarget(null)
          setDisplayMood(transitionTarget)
          return 0
        }

        return spriteConfig.loop === false ? spriteConfig.frameCount - 1 : 0
      })
    }, 1000 / spriteConfig.fps)

    return () => window.clearInterval(timer)
  }, [spriteConfig, transitionTarget])

  const size = displaySize ?? (compact ? 120 : 168)
  const batteryColor = battery > 30 ? '#34c759' : battery > 12 ? '#ff9f0a' : '#ff3b30'
  const batteryPct = Math.round(battery)

  function showAffection(event: PointerEvent<HTMLElement>): void {
    const now = window.performance.now()

    if (now - lastAffectionAtRef.current < 120) {
      return
    }

    lastAffectionAtRef.current = now
    const emoji = ['💖', '✨', '🥰', '💗'][Math.floor(Math.random() * 4)]
    const icon = document.createElement('span')
    icon.className = 'pet-affection-icon'
    icon.textContent = emoji
    icon.style.left = `${event.clientX}px`
    icon.style.top = `${event.clientY}px`
    document.body.appendChild(icon)
    window.setTimeout(() => icon.remove(), 700)
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>): void {
    showAffection(event)

    if (!allowWindowDrag) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = {
      pointerScreenX: event.screenX,
      pointerScreenY: event.screenY,
      windowScreenX: window.screenX,
      windowScreenY: window.screenY
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>): void {
    showAffection(event)

    if (allowWindowDrag && event.buttons === 1 && dragStartRef.current) {
      window.moveTo(
        Math.round(
          dragStartRef.current.windowScreenX + event.screenX - dragStartRef.current.pointerScreenX
        ),
        Math.round(
          dragStartRef.current.windowScreenY + event.screenY - dragStartRef.current.pointerScreenY
        )
      )
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>): void {
    dragStartRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      className={`pet-shell ${compact ? 'pet-shell--compact' : ''} mood-${visibleMood}`}
      style={{ '--pet-size': `${size}px` } as CSSProperties}
    >
      <MascotSpritePreloader
        species={pet.species}
        includeBodyTint={isDuck || petColor.cssFilter !== 'none'}
        currentSpriteConfig={spriteConfig}
      />
      <motion.div
        className="pet-stage sprite-stage"
        animate={controls}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <SpriteFrame
          key={displayMood}
          spriteConfig={spriteConfig}
          frameIndex={frameIndex}
          size={size}
          colorFilter={petColor.cssFilter}
          bodyTintHex={
            petColor.bodyTintHex ?? (petColor.cssFilter !== 'none' ? petColor.hex : undefined)
          }
          bodyTintBackground={petColor.bodyTintBackground}
          tintScope={petColor.tintScope}
          accessory={pet.accessory}
          mirrorHorizontally={mirrorHorizontally}
        />
      </motion.div>

      {!compact && (
        <div className="pet-readout">
          <strong>{pet.name}</strong>
          <span>{getMascotMoodLabel(displayMood, text)}</span>
          <div className="battery-track" aria-label={`${text.battery} ${batteryPct}%`}>
            <div
              style={{
                width: `${batteryPct}%`,
                background: `linear-gradient(90deg, ${batteryColor}99, ${batteryColor})`
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: '#6e6e73', marginTop: -2 }}>{batteryPct}%</span>
        </div>
      )}
    </div>
  )
}
