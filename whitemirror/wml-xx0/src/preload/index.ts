import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
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

type Listener = (...args: unknown[]) => void

const wmlApi = {
  getState: () => ipcRenderer.invoke('get-state'),
  recordActivity: (kind: string) => ipcRenderer.invoke('record-activity', kind),
  openAppWindow: (route: string) => ipcRenderer.invoke('open-app-window', route),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),
  savePet: (pet: unknown) => ipcRenderer.invoke('save-pet', pet),
  buyShopItem: (item: unknown) => ipcRenderer.invoke('buy-shop-item', item),
  sellShopItem: (item: unknown) => ipcRenderer.invoke('sell-shop-item', item),
  setMood: (mood: string) => ipcRenderer.invoke('set-mood', mood),
  chargePet: () => ipcRenderer.invoke('charge-pet'),
  revivePet: () => ipcRenderer.invoke('revive-pet'),
  saveLunaApiKey: (apiKey: string) => ipcRenderer.invoke('save-luna-api-key', apiKey),
  askAssistant: (message: string) => ipcRenderer.invoke('ask-assistant', message),
  applyAssistantAction: (actionId: string) =>
    ipcRenderer.invoke('apply-assistant-action', actionId),
  approveSuggestion: (suggestion: string) => ipcRenderer.invoke('approve-suggestion', suggestion),
  dismissSuggestion: (suggestion: string) => ipcRenderer.invoke('dismiss-suggestion', suggestion),
  onStateUpdated: (callback: Listener): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown): void => callback(state)
    ipcRenderer.on('state-updated', listener)
    return (): void => {
      ipcRenderer.removeListener('state-updated', listener)
    }
  },
  onPetActivity: (callback: Listener): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, activity: unknown): void =>
      callback(activity)
    ipcRenderer.on('pet-activity', listener)
    return (): void => {
      ipcRenderer.removeListener('pet-activity', listener)
    }
  },
  onNavigate: (callback: Listener): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, route: unknown): void => callback(route)
    ipcRenderer.on('navigate', listener)
    return (): void => {
      ipcRenderer.removeListener('navigate', listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('wml', wmlApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.wml = wmlApi
}
