import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import type { ReactElement } from 'react'
import Mascota from './Mascota'
import type { AppState } from '../../../preload/index'
import { getTranslations } from '../i18n'

function SettingsIcon(): ReactElement {
  return (
    <svg className="widget-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" />
      <path d="M19.1 13.4a7.8 7.8 0 0 0 .1-1.4 7.8 7.8 0 0 0-.1-1.4l2-1.5-1.9-3.2-2.4 1a7.6 7.6 0 0 0-2.3-1.3L14.2 3h-4.4l-.3 2.6a7.6 7.6 0 0 0-2.3 1.3l-2.4-1-1.9 3.2 2 1.5a7.8 7.8 0 0 0-.1 1.4 7.8 7.8 0 0 0 .1 1.4l-2 1.5 1.9 3.2 2.4-1a7.6 7.6 0 0 0 2.3 1.3l.3 2.6h4.4l.3-2.6a7.6 7.6 0 0 0 2.3-1.3l2.4 1 1.9-3.2-2-1.5Z" />
    </svg>
  )
}

function SitIcon(): ReactElement {
  return (
    <svg className="widget-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4.5a2 2 0 1 1 4 0v4.2h3.3c1.3 0 2.3 1 2.3 2.3v3.1h2.1v2.4H17v3.2h-2.6v-3.2H8.7l-1.2 3.2H4.8l1.3-3.6A3.4 3.4 0 0 1 4 13V9.4h2.6V13c0 .7.6 1.3 1.3 1.3H15v-2.7H9.8A1.8 1.8 0 0 1 8 9.8V4.5Z" />
    </svg>
  )
}

function ChatIcon(): ReactElement {
  return (
    <svg className="widget-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 4.2h13c1.4 0 2.5 1.1 2.5 2.5v7.1c0 1.4-1.1 2.5-2.5 2.5h-6.2l-4.8 3.5v-3.5h-2c-1.4 0-2.5-1.1-2.5-2.5V6.7c0-1.4 1.1-2.5 2.5-2.5Zm1.2 4.1v2.1h10.6V8.3H6.7Zm0 4v2.1h6.7v-2.1H6.7Z" />
    </svg>
  )
}

const initialState: AppState = {
  points: 0,
  battery: 100,
  mood: 'active',
  pet: {
    name: 'Nimbo',
    species: 'spark',
    color: 'base',
    accessory: null
  },
  inventory: {
    species: ['spark'],
    colors: {
      spark: ['base'],
      duck: ['base']
    },
    accessories: []
  },
  settings: {
    launchSuggestions: true,
    privacyMode: false,
    launchAtLogin: true,
    localAIEnabled: true,
    lunaEnabled: false,
    lunaModel: 'gpt-5-nano',
    lunaApiKeyConfigured: false,
    language: 'es'
  },
  suggestions: [],
  localAI: {
    enabled: true,
    summary: 'IA local activa',
    actions: []
  }
}

function isWindowOnLeftHalf(): boolean {
  const screenWidth = window.screen.availWidth || window.screen.width
  const windowCenter = window.screenX + window.innerWidth / 2

  return windowCenter < screenWidth / 2
}

export default function Widget(): ReactElement {
  const [state, setState] = useState<AppState>(initialState)
  const [isHovered, setIsHovered] = useState(false)
  const [activityPulse, setActivityPulse] = useState<'click' | 'type' | null>(null)
  const [mirrorPet, setMirrorPet] = useState(isWindowOnLeftHalf)
  const stateRef = useRef(state)
  const activityPulseTimerRef = useRef<number | null>(null)
  const text = getTranslations(state.settings.language)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    document.documentElement.classList.add('widget-window')
    document.body.classList.add('widget-window')

    return () => {
      document.documentElement.classList.remove('widget-window')
      document.body.classList.remove('widget-window')
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMirrorPet(isWindowOnLeftHalf())
    }, 120)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!window.wml) {
      console.error('[widget] window.wml is missing: check this BrowserWindow preload')
      return
    }

    window.wml
      .getState()
      .then(setState)
      .catch((err) => console.error('[widget] getState failed', err))
    const unsubscribeState = window.wml.onStateUpdated(setState)
    const unsubscribeActivity = window.wml.onPetActivity((kind) => {
      if (stateRef.current.mood !== 'active') {
        return
      }

      if (activityPulseTimerRef.current) {
        window.clearTimeout(activityPulseTimerRef.current)
      }

      setActivityPulse(kind as 'click' | 'type')
      activityPulseTimerRef.current = window.setTimeout(() => {
        setActivityPulse(null)
        activityPulseTimerRef.current = null
      }, 260)
    })

    return () => {
      if (activityPulseTimerRef.current) {
        window.clearTimeout(activityPulseTimerRef.current)
        activityPulseTimerRef.current = null
      }
      unsubscribeState()
      unsubscribeActivity()
    }
  }, [])

  const openSettings = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    event?.stopPropagation()
    window.wml
      ?.openAppWindow('settings')
      .catch((err) => console.error('[widget] openAppWindow failed', err))
  }, [])

  const toggleSit = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    event?.stopPropagation()
    window.wml?.setMood('sitting').catch((err) => console.error('[widget] setMood failed', err))
  }, [])

  const openAssistant = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    event?.stopPropagation()
    window.wml
      ?.openAppWindow('chat')
      .catch((err) => console.error('[widget] openAppWindow failed', err))
  }, [])

  const acceptSuggestion = useCallback((suggestion: string) => {
    window.wml
      ?.approveSuggestion(suggestion)
      .catch((err) => console.error('[widget] approveSuggestion failed', err))
  }, [])

  const dismissSuggestion = useCallback((suggestion: string) => {
    window.wml
      ?.dismissSuggestion(suggestion)
      .catch((err) => console.error('[widget] dismissSuggestion failed', err))
  }, [])

  return (
    <div
      className={`widget-root${isHovered ? ' is-hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="widget-hover-controls">
        <button
          className="widget-control-btn"
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={openSettings}
          title={text.settings}
          aria-label={text.openSettings}
        >
          <SettingsIcon />
        </button>
        <button
          className={`widget-control-btn${state.mood === 'sitting' ? ' active' : ''}`}
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={toggleSit}
          title={state.mood === 'sitting' ? text.stand : text.sit}
          aria-label={text.toggleSitting}
        >
          <SitIcon />
        </button>
        <button
          className="widget-control-btn"
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={openAssistant}
          title={text.assistant}
          aria-label={text.openAssistant}
        >
          <ChatIcon />
        </button>
      </div>

      <div className="drag-surface drag-handle">
        <Mascota
          state={state}
          compact
          activityPulse={activityPulse}
          allowWindowDrag
          mirrorHorizontally={mirrorPet}
        />
        <div className="widget-readout">
          <span className="pet-name-label">{state.pet.name}</span>
          <span className="pet-points-label">
            {state.points} {text.pointsShort}
          </span>
        </div>
      </div>

      {state.suggestions.length > 0 && (
        <div
          className="suggestion-panel"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span>{text.suggestion}</span>
          <strong>{state.suggestions[0]}</strong>
          <div>
            <button type="button" onClick={() => acceptSuggestion(state.suggestions[0])}>
              {text.accept}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => dismissSuggestion(state.suggestions[0])}
            >
              {text.dismiss}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
