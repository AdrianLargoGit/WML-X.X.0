import { ElectronAPI } from '@electron-toolkit/preload'
import type { PetColorId } from '../shared/petColors'

export type PetMood = 'active' | 'sitting' | 'sleeping' | 'scared' | 'critical' | 'dead'
export type AppLanguage = 'es' | 'en'

export interface Settings {
  launchSuggestions: boolean
  privacyMode: boolean
  launchAtLogin: boolean
  localAIEnabled: boolean
  lunaEnabled: boolean
  lunaModel: string
  lunaApiKeyConfigured: boolean
  language: AppLanguage
}

export interface PetProfile {
  name: string
  species: string
  color: string
  accessory: string | null
}

export interface PetInventory {
  species: string[]
  colors: Record<string, PetColorId[]>
  accessories: string[]
}

export interface ShopItemRequest {
  kind: 'species' | 'color' | 'accessory'
  id: string
  species?: string
}

export interface AppState {
  points: number
  battery: number
  mood: PetMood
  pet: PetProfile
  inventory: PetInventory
  settings: Settings
  suggestions: string[]
  localAI: {
    enabled: boolean
    summary: string
    actions: string[]
  }
}

export interface AssistantAction {
  id: string
  label: string
  description: string
}

export interface AssistantChatResult {
  message: string
  source: 'luna' | 'local'
  action?: AssistantAction
  error?: string
}

export interface WmlAPI {
  getState: () => Promise<AppState>
  recordActivity: (kind: 'click' | 'type') => Promise<AppState>
  openAppWindow: (route: string) => Promise<void>
  saveSettings: (settings: Partial<Settings>) => Promise<AppState>
  savePet: (pet: Partial<PetProfile>) => Promise<AppState>
  buyShopItem: (item: ShopItemRequest) => Promise<AppState>
  sellShopItem: (item: ShopItemRequest) => Promise<AppState>
  setMood: (mood: PetMood) => Promise<AppState>
  chargePet: () => Promise<AppState>
  revivePet: () => Promise<AppState>
  saveLunaApiKey: (apiKey: string) => Promise<AppState>
  askAssistant: (message: string) => Promise<AssistantChatResult>
  applyAssistantAction: (actionId: string) => Promise<AppState>
  approveSuggestion: (suggestion: string) => Promise<{ ok: boolean; reason?: string }>
  dismissSuggestion: (suggestion: string) => Promise<void>
  onStateUpdated: (callback: (state: AppState) => void) => () => void
  onPetActivity: (callback: (activity: 'click' | 'type') => void) => () => void
  onNavigate: (callback: (route: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    wml: WmlAPI
  }
}
