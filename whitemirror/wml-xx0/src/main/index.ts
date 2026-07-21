import { app, BrowserWindow, ipcMain, shell, powerMonitor, screen, Menu } from 'electron'
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'fs'
import * as os from 'os'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { uIOhook } from 'uiohook-napi'
import si from 'systeminformation'
import type { PetColorId } from '../shared/petColors'
import {
  DEFAULT_COLOR_ID,
  DEFAULT_PET_INVENTORY,
  DEFAULT_SPECIES_ID,
  PET_ACCESSORY_CATALOG,
  PET_SPECIES_CATALOG,
  type PetInventory,
  type ShopItemKind,
  createLegacyInventoryFromPoints,
  getPetAccessoryPrice,
  getPetColorPriceForSpecies,
  getPetSellValue,
  getPetSpeciesPrice,
  isPetAccessoryOwned,
  isPetColorOwnedForSpecies,
  isPetSpeciesOwned,
  normalizePetAccessoryForInventory,
  normalizePetColorForInventory,
  normalizePetInventory,
  normalizePetSpeciesForInventory
} from '../shared/petShop'

type PetMood = 'active' | 'sitting' | 'sleeping' | 'scared' | 'critical' | 'dead'
type ActivityKind = 'click' | 'type'
type AppLanguage = 'es' | 'en'

type SuggestionId =
  'open_usual_workspace' | 'close_background_apps' | 'clean_old_temp_files' | 'run_security_scan'

interface HabitualApp {
  id: string
  labels: Record<AppLanguage, string>
  processes: string[]
  launch: Partial<Record<NodeJS.Platform | 'default', string>> & { default: string }
  role?: 'editor' | 'browser'
  storageFolder?: string
  restoreArgs?: string[]
  urls?: string[]
}

interface WidgetSize {
  width: number
  height: number
}

interface Settings {
  launchSuggestions: boolean
  privacyMode: boolean
  launchAtLogin: boolean
  localAIEnabled: boolean
  lunaEnabled: boolean
  lunaModel: string
  lunaApiKeyConfigured: boolean
  language: AppLanguage
}

interface PetProfile {
  name: string
  species: string
  color: string
  accessory: string | null
}

interface ShopItemRequest {
  kind: ShopItemKind
  id: string
  species?: string
}

interface AppState {
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

type AssistantActionId =
  'open_usual_workspace' | 'close_background_apps' | 'clean_old_temp_files' | 'run_security_scan'

interface AssistantAction {
  id: AssistantActionId
  label: string
  description: string
}

interface LocalSuggestion {
  id: SuggestionId
  text: string
  critical: boolean
}

interface AssistantChatResult {
  message: string
  source: 'luna' | 'local'
  action?: AssistantAction
  error?: string
}

const SCALE_SIZES = {
  normal: { width: 220, height: 250 }
}

const WIDGET_LIMITS = {
  minWidth: 170,
  minHeight: 210,
  maxWidth: 420,
  maxHeight: 500
}

const store = new Store()
const execFileAsync = promisify(execFile)
const appId = 'com.whitemirror.wmlxx0'
const packagedIconPath = [
  path.join(process.resourcesPath, 'public', 'icons', 'icon.png'),
  path.join(app.getAppPath(), 'public', 'icons', 'icon.png')
].find((iconPath) => existsSync(iconPath))
const appIconPath = app.isPackaged
  ? (packagedIconPath ?? path.join(app.getAppPath(), 'public', 'icons', 'icon.png'))
  : path.join(__dirname, '../../public/icons/icon.png')
const ACTIVITY_PULSE_INTERVAL_MS = 220

app.setName('WML X.X.0')
app.setAppUserModelId(appId)

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

let widgetWindow: BrowserWindow | null = null
let appWindow: BrowserWindow | null = null
let lastActivityAt = Date.now()
let idleTimer: NodeJS.Timeout | null = null
let drainTimer: NodeJS.Timeout | null = null
let batteryPollTimer: NodeJS.Timeout | null = null
let recentActivity: ActivityKind[] = []
let lastActivityPulseAt = 0
let lastHabitualAppScanAt = 0
let lastSecurityStatusScanAt = 0

const NORMAL_SUGGESTION_COOLDOWN_MS = 5 * 60 * 1000
const SITTING_SUGGESTION_COOLDOWN_MS = 10 * 60 * 1000
const TEMP_FILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const SAFE_BACKGROUND_APP_IDS = new Set([
  'discord',
  'slack',
  'teams',
  'whatsapp',
  'telegram',
  'spotify'
])

const SUSPICIOUS_PROCESS_PATTERNS = [
  'mimikatz',
  'nanodump',
  'procdump',
  'pwdump',
  'lazagne',
  'rubeus',
  'bloodhound',
  'sharphound',
  'cobaltstrike',
  'meterpreter',
  'keylogger'
]

const SECURITY_STATUS_SCAN_INTERVAL_MS = 5 * 60 * 1000

const HABITUAL_APPS: HabitualApp[] = [
  {
    id: 'vscode',
    labels: { es: 'Visual Studio Code', en: 'Visual Studio Code' },
    processes: ['code.exe', 'code', 'visual studio code'],
    launch: { win32: 'code', darwin: 'Visual Studio Code', linux: 'code', default: 'code' },
    role: 'editor',
    storageFolder: 'Code'
  },
  {
    id: 'cursor',
    labels: { es: 'Cursor', en: 'Cursor' },
    processes: ['cursor.exe', 'cursor'],
    launch: { win32: 'cursor', darwin: 'Cursor', linux: 'cursor', default: 'cursor' },
    role: 'editor',
    storageFolder: 'Cursor'
  },
  {
    id: 'chrome',
    labels: { es: 'Chrome', en: 'Chrome' },
    processes: ['chrome.exe', 'chrome', 'google chrome'],
    launch: { win32: 'chrome', darwin: 'Google Chrome', linux: 'google-chrome', default: 'chrome' },
    role: 'browser',
    restoreArgs: ['--restore-last-session']
  },
  {
    id: 'edge',
    labels: { es: 'Edge', en: 'Edge' },
    processes: ['msedge.exe', 'msedge', 'microsoft edge'],
    launch: {
      win32: 'msedge',
      darwin: 'Microsoft Edge',
      linux: 'microsoft-edge',
      default: 'msedge'
    },
    role: 'browser',
    restoreArgs: ['--restore-last-session']
  },
  {
    id: 'firefox',
    labels: { es: 'Firefox', en: 'Firefox' },
    processes: ['firefox.exe', 'firefox'],
    launch: { win32: 'firefox', darwin: 'Firefox', linux: 'firefox', default: 'firefox' },
    role: 'browser',
    restoreArgs: ['--restore-last-session']
  },
  {
    id: 'discord',
    labels: { es: 'Discord', en: 'Discord' },
    processes: ['discord.exe', 'discord'],
    launch: { win32: 'discord', darwin: 'Discord', linux: 'discord', default: 'discord' },
    urls: ['discord://']
  },
  {
    id: 'slack',
    labels: { es: 'Slack', en: 'Slack' },
    processes: ['slack.exe', 'slack'],
    launch: { win32: 'slack', darwin: 'Slack', linux: 'slack', default: 'slack' },
    urls: ['slack://open']
  },
  {
    id: 'teams',
    labels: { es: 'Teams', en: 'Teams' },
    processes: ['teams.exe', 'ms-teams.exe', 'msteams.exe', 'teams'],
    launch: { win32: 'msteams', darwin: 'Microsoft Teams', linux: 'teams', default: 'teams' },
    urls: ['msteams://']
  },
  {
    id: 'outlook',
    labels: { es: 'Outlook', en: 'Outlook' },
    processes: ['outlook.exe', 'olk.exe', 'outlook'],
    launch: { win32: 'outlook', darwin: 'Microsoft Outlook', linux: 'outlook', default: 'outlook' },
    urls: ['outlookmail://']
  },
  {
    id: 'whatsapp',
    labels: { es: 'WhatsApp', en: 'WhatsApp' },
    processes: ['whatsapp.exe', 'whatsapp'],
    launch: {
      win32: 'whatsapp',
      darwin: 'WhatsApp',
      linux: 'whatsapp-for-linux',
      default: 'whatsapp'
    },
    urls: ['whatsapp://send']
  },
  {
    id: 'telegram',
    labels: { es: 'Telegram', en: 'Telegram' },
    processes: ['telegram.exe', 'telegram desktop', 'telegram'],
    launch: {
      win32: 'telegram',
      darwin: 'Telegram',
      linux: 'telegram-desktop',
      default: 'telegram'
    },
    urls: ['tg://']
  },
  {
    id: 'spotify',
    labels: { es: 'Spotify', en: 'Spotify' },
    processes: ['spotify.exe', 'spotify'],
    launch: { win32: 'spotify', darwin: 'Spotify', linux: 'spotify', default: 'spotify' },
    urls: ['spotify://']
  },
  {
    id: 'obsidian',
    labels: { es: 'Obsidian', en: 'Obsidian' },
    processes: ['obsidian.exe', 'obsidian'],
    launch: { win32: 'obsidian', darwin: 'Obsidian', linux: 'obsidian', default: 'obsidian' },
    urls: ['obsidian://']
  }
]

const defaultSettings: Settings = {
  launchSuggestions: true,
  privacyMode: false,
  launchAtLogin: true,
  localAIEnabled: true,
  lunaEnabled: false,
  lunaModel: 'gpt-5-nano',
  lunaApiKeyConfigured: false,
  language: 'es'
}

const defaultPet: PetProfile = {
  name: 'Nimbo',
  species: DEFAULT_SPECIES_ID,
  color: DEFAULT_COLOR_ID,
  accessory: null
}

const mainText = {
  es: {
    localAIPaused: 'IA local pausada',
    enableLocalAI: 'Activa la IA local para recibir ayuda contextual.',
    privacyPaused: 'Modo privado activo: seguimiento de actividad pausado.',
    lowBattery: 'Bateria baja: conecta el cargador para evitar que WML X.X.0 se apague.',
    sleeping: 'WML X.X.0 esta descansando; cualquier click o escritura lo reactivara.',
    fastTyping: 'Ritmo de escritura alto: prepara accesos y sugerencias de flujo de trabajo.',
    stable: 'Todo estable. WML X.X.0 seguira observando patrones locales sin enviar datos fuera.',
    localAIActive: 'IA local activa en este dispositivo',
    lunaReady:
      'Modelo de OpenAI preparado. Luna se recomienda si esta disponible por su baja latencia.',
    lunaFallback: 'Modelo de OpenAI no disponible; usando IA local practica.',
    openWorkspaceSuggestion: 'Hare: abrir o enfocar tus apps habituales detectadas localmente.',
    cleanOldTempSuggestion:
      'Hare: borrar archivos temporales antiguos de WML y del sistema. Aviso: no borrare documentos personales.',
    securityScanSuggestion:
      'ALERTA: posible riesgo de seguridad. Hare: ejecutar un analisis rapido de Microsoft Defender.',
    privacyRiskSuggestion:
      'Recomendacion: activa modo privado en ajustes si estas trabajando con informacion sensible.',
    settings: 'Ajustes de WML X.X.0',
    petState: 'Estado de la Mascota',
    standPet: 'Levantar Mascota',
    sitPet: 'Sentar Mascota',
    quit: 'Cerrar WML X.X.0'
  },
  en: {
    localAIPaused: 'Local AI paused',
    enableLocalAI: 'Turn on local AI to receive contextual help.',
    privacyPaused: 'Private mode is on: activity tracking is paused.',
    lowBattery: 'Low battery: plug in the charger to keep WML X.X.0 running.',
    sleeping: 'WML X.X.0 is resting; any click or typing will wake it up.',
    fastTyping: 'High typing rhythm: prepare shortcuts and workflow suggestions.',
    stable:
      'Everything is steady. WML X.X.0 will keep watching local patterns without sending data out.',
    localAIActive: 'Local AI active on this device',
    lunaReady: 'OpenAI model ready. Luna is recommended when available for low latency.',
    lunaFallback: 'OpenAI model unavailable; using practical local AI.',
    openWorkspaceSuggestion: 'Will do: open or focus your locally detected usual apps.',
    cleanOldTempSuggestion:
      'Will do: delete old temporary files from WML and the system. Warning: personal documents will not be deleted.',
    securityScanSuggestion:
      'ALERT: possible security risk. Will do: run a Microsoft Defender quick scan.',
    privacyRiskSuggestion:
      'Recommendation: enable private mode in settings if you are working with sensitive information.',
    settings: 'WML X.X.0 Settings',
    petState: 'Pet Status',
    standPet: 'Stand Pet Up',
    sitPet: 'Sit Pet Down',
    quit: 'Quit WML X.X.0'
  }
} as const

function getLunaApiKey(): string {
  const storedKey = store.get('lunaApiKey', '') as string
  return storedKey.trim() || process.env['OPENAI_API_KEY']?.trim() || ''
}

function getSettings(): Settings {
  const storedSettings = store.get('settings', {}) as Partial<Settings>
  const storedModel =
    typeof storedSettings.lunaModel === 'string' ? storedSettings.lunaModel.trim() : ''
  return {
    ...defaultSettings,
    ...storedSettings,
    lunaApiKeyConfigured: getLunaApiKey().length > 0,
    lunaModel: storedModel.length > 0 ? storedModel : defaultSettings.lunaModel
  }
}

function persistSettings(settings: Settings): void {
  const settingsToStore: Partial<Settings> = { ...settings }
  delete settingsToStore.lunaApiKeyConfigured
  store.set('settings', settingsToStore)
}

function getLanguage(settings = getSettings()): AppLanguage {
  return settings.language === 'en' ? 'en' : 'es'
}

function tMain(settings: Settings): (typeof mainText)[AppLanguage] {
  return mainText[getLanguage(settings)]
}

async function getSystemBattery(): Promise<number | null> {
  try {
    const data = await si.battery()
    if (!data.hasBattery) return null
    return Math.round(data.percent)
  } catch {
    return null
  }
}

async function syncBatteryFromSystem(): Promise<void> {
  const systemBattery = await getSystemBattery()
  if (systemBattery === null) return

  const state = getState()
  if (state.mood === 'dead') return

  store.set('battery', systemBattery)

  // Actualizar mood según el nivel real
  if (systemBattery <= 0) {
    store.set('mood', 'dead')
  } else if (systemBattery <= 12) {
    if (!['sitting', 'sleeping'].includes(state.mood)) {
      store.set('mood', 'critical')
    }
  } else if (state.mood === 'critical') {
    store.set('mood', 'active')
  }

  sendState()
}

function getInventory(points: number): PetInventory {
  if (!store.has('petInventory')) {
    const legacyInventory = createLegacyInventoryFromPoints(points)
    store.set('petInventory', legacyInventory)
    return legacyInventory
  }

  const inventory = normalizePetInventory(store.get('petInventory', DEFAULT_PET_INVENTORY))
  store.set('petInventory', inventory)
  return inventory
}

function setInventory(inventory: PetInventory): void {
  store.set('petInventory', normalizePetInventory(inventory))
}

function getRequestedSpecies(item: ShopItemRequest): string {
  return item.kind === 'color' ? (item.species ?? getState().pet.species) : item.id
}

function isShopItemRequest(item: unknown): item is ShopItemRequest {
  if (!item || typeof item !== 'object') {
    return false
  }

  const maybeItem = item as Partial<ShopItemRequest>
  return (
    (maybeItem.kind === 'species' ||
      maybeItem.kind === 'color' ||
      maybeItem.kind === 'accessory') &&
    typeof maybeItem.id === 'string' &&
    (maybeItem.species === undefined || typeof maybeItem.species === 'string')
  )
}

function isKnownShopItem(item: ShopItemRequest): boolean {
  if (item.kind === 'species') {
    return PET_SPECIES_CATALOG.some((species) => species.id === item.id)
  }

  if (item.kind === 'accessory') {
    return PET_ACCESSORY_CATALOG.some((accessory) => accessory.id === item.id)
  }

  return typeof item.id === 'string'
}

function getShopItemPrice(item: ShopItemRequest): number {
  if (item.kind === 'species') {
    return getPetSpeciesPrice(item.id)
  }

  if (item.kind === 'accessory') {
    return getPetAccessoryPrice(item.id)
  }

  return getPetColorPriceForSpecies(item.id as PetColorId, getRequestedSpecies(item))
}

function isShopItemOwned(item: ShopItemRequest, inventory: PetInventory): boolean {
  if (item.kind === 'species') {
    return isPetSpeciesOwned(item.id, inventory)
  }

  if (item.kind === 'accessory') {
    return isPetAccessoryOwned(item.id, inventory)
  }

  return isPetColorOwnedForSpecies(item.id, getRequestedSpecies(item), inventory)
}

function updatePetAfterInventoryChange(inventory: PetInventory): void {
  const currentPet = { ...defaultPet, ...(store.get('pet', {}) as Partial<PetProfile>) }
  const species = normalizePetSpeciesForInventory(currentPet.species, inventory)
  const color = normalizePetColorForInventory(currentPet.color, species, inventory)
  const accessory = normalizePetAccessoryForInventory(currentPet.accessory, inventory)

  store.set('pet', {
    ...currentPet,
    species,
    color,
    accessory
  })
}

function normalizeMood(value: unknown, fallback: PetMood): PetMood {
  if (
    value === 'active' ||
    value === 'sitting' ||
    value === 'sleeping' ||
    value === 'scared' ||
    value === 'critical' ||
    value === 'dead'
  ) {
    return value
  }

  return value === 'hidden' ? 'active' : fallback
}

function getState(): AppState {
  const points = Number(store.get('points', 0))
  const battery = Number(store.get('battery', 86))
  const storedPet = { ...defaultPet, ...(store.get('pet', {}) as Partial<PetProfile>) }
  const inventory = getInventory(points)
  const settings = getSettings()
  const mood = normalizeMood(store.get('mood'), battery <= 0 ? 'dead' : 'active')
  const species = normalizePetSpeciesForInventory(storedPet.species, inventory)
  const pet = {
    ...storedPet,
    name:
      typeof storedPet.name === 'string' && storedPet.name.trim().length > 0
        ? storedPet.name.trim()
        : defaultPet.name,
    color: normalizePetColorForInventory(storedPet.color, species, inventory),
    species,
    accessory: normalizePetAccessoryForInventory(storedPet.accessory, inventory)
  }
  return {
    points,
    battery,
    mood,
    pet,
    inventory,
    settings,
    suggestions: store.get('suggestions', []) as string[],
    localAI: getLocalAIState(settings, battery, mood)
  }
}

function getHabitualApps(): HabitualApp[] {
  const scores = store.get('habitualAppScores', {}) as Record<string, number>
  const maxScore = Math.max(0, ...Object.values(scores))

  if (maxScore <= 0) {
    return []
  }

  return HABITUAL_APPS.filter((habitualApp) => (scores[habitualApp.id] ?? 0) === maxScore).sort(
    (left, right) => (scores[right.id] ?? 0) - (scores[left.id] ?? 0)
  )
}

async function getRunningProcesses(): Promise<Array<{ name: string; cmd?: string }>> {
  const { default: psList } = await import('ps-list')
  return (await psList({ all: false })).map((processInfo) => ({
    name: processInfo.name,
    cmd: 'cmd' in processInfo && typeof processInfo.cmd === 'string' ? processInfo.cmd : undefined
  }))
}

function getRunningProcessNames(processes: Array<{ name: string }>): Set<string> {
  return new Set(processes.map((processInfo) => processInfo.name.toLowerCase()))
}

function getRunningSafeBackgroundApps(): HabitualApp[] {
  const runningIds = new Set(store.get('runningSafeBackgroundAppIds', []) as string[])
  return HABITUAL_APPS.filter(
    (habitualApp) => SAFE_BACKGROUND_APP_IDS.has(habitualApp.id) && runningIds.has(habitualApp.id)
  )
}

function updateSecuritySignalsFromProcesses(
  processes: Array<{ name: string; cmd?: string }>
): boolean {
  const suspiciousProcess = processes.find((processInfo) => {
    const fingerprint = `${processInfo.name} ${processInfo.cmd ?? ''}`.toLowerCase()
    return SUSPICIOUS_PROCESS_PATTERNS.some((pattern) => fingerprint.includes(pattern))
  })

  if (!suspiciousProcess) {
    return false
  }

  store.set('securitySignal', {
    detectedAt: Date.now(),
    reason: suspiciousProcess.name
  })
  return true
}

async function scanSecurityStatus(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false
  }

  const now = Date.now()
  if (now - lastSecurityStatusScanAt < SECURITY_STATUS_SCAN_INTERVAL_MS) {
    return false
  }
  lastSecurityStatusScanAt = now

  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      '(Get-MpComputerStatus).RealTimeProtectionEnabled'
    ])
    if (stdout.trim().toLowerCase() === 'false') {
      store.set('securitySignal', {
        detectedAt: Date.now(),
        reason: 'Defender RealTimeProtection disabled'
      })
      return true
    }
  } catch {
    // Defender status can be unavailable due to edition, policy, or permissions.
  }

  return false
}

async function scanHabitualApps(): Promise<void> {
  const now = Date.now()
  if (now - lastHabitualAppScanAt < 15_000) {
    return
  }
  lastHabitualAppScanAt = now

  try {
    const processes = await getRunningProcesses()
    const runningNames = getRunningProcessNames(processes)
    const currentScores = store.get('habitualAppScores', {}) as Record<string, number>
    const nextScores = { ...currentScores }
    const runningSafeBackgroundAppIds: string[] = []
    let changed = false

    const securityChanged = updateSecuritySignalsFromProcesses(processes)
    const securityStatusChanged = await scanSecurityStatus()

    for (const habitualApp of HABITUAL_APPS) {
      const isRunning = habitualApp.processes.some((processName) =>
        runningNames.has(processName.toLowerCase())
      )
      if (isRunning) {
        if (SAFE_BACKGROUND_APP_IDS.has(habitualApp.id)) {
          runningSafeBackgroundAppIds.push(habitualApp.id)
        }
        const nextScore = (nextScores[habitualApp.id] ?? 0) + 1
        if (nextScore !== nextScores[habitualApp.id]) {
          changed = true
        }
        nextScores[habitualApp.id] = nextScore
      }
    }

    if (changed) {
      store.set('habitualAppScores', nextScores)
    }

    store.set('runningSafeBackgroundAppIds', runningSafeBackgroundAppIds)
    if (changed || securityChanged || securityStatusChanged) sendState()
  } catch (error) {
    console.error('[main] habitual app scan failed', error)
  }
}

function getLocalAIState(settings: Settings, battery: number, mood: PetMood): AppState['localAI'] {
  const text = tMain(settings)

  if (!settings.localAIEnabled) {
    return { enabled: false, summary: text.localAIPaused, actions: [text.enableLocalAI] }
  }

  const actions: string[] = []

  if (settings.privacyMode) {
    actions.push(text.privacyPaused)
  }

  if (battery <= 20) {
    actions.push(text.lowBattery)
  }

  if (mood === 'sleeping') {
    actions.push(text.sleeping)
  }

  if (recentActivity.filter((item) => item === 'type').length >= 5) {
    actions.push(text.fastTyping)
  }

  if (actions.length === 0) {
    actions.push(text.stable)
  }

  actions.push(
    settings.lunaEnabled && settings.lunaApiKeyConfigured ? text.lunaReady : text.lunaFallback
  )

  return {
    enabled: true,
    summary: text.localAIActive,
    actions
  }
}

function isRecentSecuritySignal(): boolean {
  const signal = store.get('securitySignal', null) as { detectedAt?: number } | null
  return typeof signal?.detectedAt === 'number' && Date.now() - signal.detectedAt < 10 * 60 * 1000
}

function formatCloseBackgroundAppsSuggestion(state: AppState, apps: HabitualApp[]): string {
  const labels = apps.map((habitualApp) => habitualApp.labels[state.settings.language]).join(', ')
  return state.settings.language === 'es'
    ? `Hare: cerrar ${labels} para ahorrar bateria. Aviso: podrias perder trabajo no guardado.`
    : `Will do: close ${labels} to save battery. Warning: unsaved work could be lost.`
}

function getLocalSuggestions(state: AppState): LocalSuggestion[] {
  const text = tMain(state.settings)
  const suggestions: LocalSuggestion[] = []

  if (isRecentSecuritySignal()) {
    suggestions.push({
      id: 'run_security_scan',
      text: text.securityScanSuggestion,
      critical: true
    })
  }

  if (
    !state.settings.localAIEnabled ||
    !state.settings.launchSuggestions ||
    state.settings.privacyMode
  ) {
    return suggestions
  }

  if (
    getHabitualApps().length > 0 &&
    recentActivity.filter((item) => item === 'type').length >= 5
  ) {
    suggestions.push({
      id: 'open_usual_workspace',
      text: text.openWorkspaceSuggestion,
      critical: false
    })
  }

  const safeBackgroundApps = getRunningSafeBackgroundApps()
  if (state.battery <= 45 && state.mood !== 'dead' && safeBackgroundApps.length > 0) {
    suggestions.push({
      id: 'close_background_apps',
      text: formatCloseBackgroundAppsSuggestion(state, safeBackgroundApps),
      critical: false
    })
  }

  if (state.points > 60 && state.points % 55 < 3) {
    suggestions.push({
      id: 'clean_old_temp_files',
      text: text.cleanOldTempSuggestion,
      critical: false
    })
  }

  return suggestions
}

function getSuggestionByText(state: AppState, suggestionText: string): LocalSuggestion | undefined {
  return getLocalSuggestions(state).find((suggestion) => suggestion.text === suggestionText)
}

function buildSuggestions(state: AppState): string[] {
  const currentSuggestions = store.get('suggestions', []) as string[]
  const dismissedSuggestions = new Set(store.get('dismissedSuggestions', []) as string[])
  const candidates = getLocalSuggestions(state).filter(
    (suggestion) => suggestion.critical || !dismissedSuggestions.has(suggestion.text)
  )
  const criticalSuggestion = candidates.find((suggestion) => suggestion.critical)

  if (criticalSuggestion) {
    return [criticalSuggestion.text]
  }

  if ((state.mood === 'sleeping' || state.mood === 'dead') && currentSuggestions.length === 0) {
    return []
  }

  if (currentSuggestions.length > 0) {
    return currentSuggestions.slice(0, 1)
  }

  const lastShownAt = Number(store.get('lastSuggestionShownAt', 0))
  const cooldown =
    state.mood === 'sitting' ? SITTING_SUGGESTION_COOLDOWN_MS : NORMAL_SUGGESTION_COOLDOWN_MS
  if (Date.now() - lastShownAt < cooldown) {
    return []
  }

  return candidates.slice(0, 1).map((suggestion) => suggestion.text)
}

function refreshSuggestions(state = getState()): void {
  const nextSuggestions = buildSuggestions(state)
  const currentSuggestions = store.get('suggestions', []) as string[]

  if (JSON.stringify(currentSuggestions) !== JSON.stringify(nextSuggestions)) {
    if (currentSuggestions.length === 0 && nextSuggestions.length > 0) {
      store.set('lastSuggestionShownAt', Date.now())
    }
    store.set('suggestions', nextSuggestions)
  }
}

function sendState(): void {
  refreshSuggestions()
  const state = getState()
  widgetWindow?.webContents.send('state-updated', state)
  appWindow?.webContents.send('state-updated', state)
}

function loadRenderer(window: BrowserWindow, route: string): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/${route}`)
  } else {
    window.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: route })
  }
}

function clampWidgetSize(size: Partial<WidgetSize>): WidgetSize {
  const width = Number(size.width ?? SCALE_SIZES.normal.width)
  const height = Number(size.height ?? SCALE_SIZES.normal.height)

  return {
    width: Math.round(Math.min(Math.max(width, WIDGET_LIMITS.minWidth), WIDGET_LIMITS.maxWidth)),
    height: Math.round(Math.min(Math.max(height, WIDGET_LIMITS.minHeight), WIDGET_LIMITS.maxHeight))
  }
}

function getWidgetSize(): WidgetSize {
  const customSize = store.get('widgetSize') as Partial<WidgetSize> | undefined
  if (customSize && typeof customSize.width === 'number' && typeof customSize.height === 'number') {
    return clampWidgetSize(customSize)
  }

  return SCALE_SIZES.normal
}

function clampWidgetPosition(
  x: number,
  y: number,
  size = getWidgetSize()
): { x: number; y: number } {
  const display = screen.getDisplayMatching({ x, y, width: size.width, height: size.height })
  const area = display.workArea

  return {
    x: Math.min(Math.max(Math.round(x), area.x), area.x + area.width - size.width),
    y: Math.min(Math.max(Math.round(y), area.y), area.y + area.height - size.height)
  }
}

function getInitialWidgetPosition(size: WidgetSize): { x?: number; y?: number } {
  const saved = store.get('widgetPosition') as Partial<{ x: number; y: number }> | undefined

  if (typeof saved?.x === 'number' && typeof saved?.y === 'number') {
    return clampWidgetPosition(saved.x, saved.y, size)
  }

  return {}
}

function saveWidgetPosition(): void {
  if (!widgetWindow) {
    return
  }

  const { x, y } = widgetWindow.getBounds()
  store.set('widgetPosition', { x, y })
}

function syncLaunchAtLogin(enabled = getState().settings.launchAtLogin): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
    args: is.dev ? [app.getAppPath()] : []
  })
}

function spawnDetached(command: string, args: string[]): void {
  spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref()
}

function uriToLocalPath(uri: string | undefined): string | null {
  if (!uri || !uri.startsWith('file:')) {
    return null
  }

  try {
    return fileURLToPath(uri.replace(/^file:\/\/\/([a-zA-Z])%3A/i, 'file:///$1:'))
  } catch {
    return null
  }
}

function readRecentEditorTarget(habitualApp: HabitualApp): string | null {
  if (!habitualApp.storageFolder) {
    return null
  }

  const storagePath = path.join(
    app.getPath('appData'),
    habitualApp.storageFolder,
    'User',
    'globalStorage',
    'storage.json'
  )
  if (!existsSync(storagePath)) {
    return null
  }

  try {
    const storage = JSON.parse(readFileSync(storagePath, 'utf8')) as {
      openedPathsList?: {
        entries?: Array<{
          folderUri?: string
          fileUri?: string
          workspace?: {
            configPathUri?: string
          }
        }>
      }
    }

    for (const entry of storage.openedPathsList?.entries ?? []) {
      const target =
        uriToLocalPath(entry.folderUri) ??
        uriToLocalPath(entry.workspace?.configPathUri) ??
        uriToLocalPath(entry.fileUri)
      if (target && existsSync(target)) {
        return target
      }
    }
  } catch (error) {
    console.error(`[main] failed reading recent ${habitualApp.id} target`, error)
  }

  return null
}

function focusHabitualApp(habitualApp: HabitualApp): void {
  const label = habitualApp.labels.en.replace(/'/g, "''")

  if (process.platform === 'win32') {
    spawnDetached('powershell.exe', [
      '-NoProfile',
      '-WindowStyle',
      'Hidden',
      '-Command',
      `$shell = New-Object -ComObject WScript.Shell; [void]$shell.AppActivate('${label}')`
    ])
    return
  }

  if (process.platform === 'darwin') {
    spawnDetached('open', ['-a', habitualApp.launch.darwin ?? habitualApp.launch.default])
  }
}

async function launchHabitualApp(habitualApp: HabitualApp): Promise<void> {
  focusHabitualApp(habitualApp)

  const command = habitualApp.launch[process.platform] ?? habitualApp.launch.default
  const launchArgs =
    habitualApp.role === 'editor'
      ? [readRecentEditorTarget(habitualApp)].filter((target): target is string => Boolean(target))
      : (habitualApp.restoreArgs ?? [])

  if (habitualApp.role !== 'editor') {
    for (const url of habitualApp.urls ?? []) {
      try {
        await shell.openExternal(url)
      } catch {
        // Try the next known opener.
      }
    }
  }

  if (process.platform === 'win32') {
    spawnDetached('cmd.exe', ['/c', 'start', '', command, ...launchArgs])
    return
  }

  if (process.platform === 'darwin') {
    const args =
      habitualApp.role === 'browser'
        ? ['-a', command, '--args', ...launchArgs]
        : ['-a', command, ...launchArgs]
    spawnDetached('open', args)
    return
  }

  spawnDetached(command, launchArgs)
}

async function openUsualWorkspace(): Promise<void> {
  await scanHabitualApps()
  const habitualApps = getHabitualApps()

  if (habitualApps.length === 0) {
    createAppWindow('settings')
    return
  }

  await Promise.all(habitualApps.map((habitualApp) => launchHabitualApp(habitualApp)))
}

async function closeSafeBackgroundApps(): Promise<void> {
  const appsToClose = getRunningSafeBackgroundApps()

  for (const habitualApp of appsToClose) {
    for (const processName of habitualApp.processes) {
      if (process.platform === 'win32') {
        spawnDetached('taskkill.exe', ['/IM', processName, '/T'])
      } else {
        spawnDetached('pkill', ['-x', processName])
      }
    }
  }

  store.set('runningSafeBackgroundAppIds', [])
}

function cleanOldTempFiles(): void {
  const tempRoots = Array.from(new Set([os.tmpdir(), path.join(app.getPath('temp'), 'wml-xx0')]))
  const cutoff = Date.now() - TEMP_FILE_MAX_AGE_MS

  for (const tempRoot of tempRoots) {
    if (!existsSync(tempRoot)) {
      continue
    }

    for (const entryName of readdirSync(tempRoot)) {
      const entryPath = path.join(tempRoot, entryName)
      try {
        const stats = statSync(entryPath)
        if (stats.mtimeMs < cutoff) {
          rmSync(entryPath, { recursive: true, force: true })
        }
      } catch {
        // Ignore locked temp files.
      }
    }
  }
}

function runSecurityScan(): void {
  if (process.platform === 'win32') {
    spawnDetached('powershell.exe', [
      '-NoProfile',
      '-WindowStyle',
      'Hidden',
      '-Command',
      'Start-MpScan -ScanType QuickScan'
    ])
    return
  }

  if (process.platform === 'darwin') {
    spawnDetached('xprotect', [])
    return
  }

  spawnDetached('sh', ['-c', 'clamscan --recursive --infected "$HOME"'])
}

function getAssistantActions(settings: Settings): AssistantAction[] {
  const spanish = getLanguage(settings) === 'es'
  return [
    {
      id: 'open_usual_workspace',
      label: spanish ? 'Abrir apps habituales' : 'Open usual apps',
      description: spanish
        ? 'Intentara abrir o enfocar tus apps habituales detectadas localmente.'
        : 'Attempts to open or focus locally detected usual apps.'
    },
    {
      id: 'close_background_apps',
      label: spanish ? 'Cerrar apps de fondo' : 'Close background apps',
      description: spanish
        ? 'Cerrara apps no criticas detectadas en segundo plano. Puede perderse trabajo no guardado.'
        : 'Closes detected non-critical background apps. Unsaved work could be lost.'
    },
    {
      id: 'clean_old_temp_files',
      label: spanish ? 'Limpiar temporales antiguos' : 'Clean old temp files',
      description: spanish
        ? 'Borrara archivos temporales antiguos. No borra documentos personales.'
        : 'Deletes old temporary files. Personal documents are not deleted.'
    },
    {
      id: 'run_security_scan',
      label: spanish ? 'Ejecutar analisis de seguridad' : 'Run security scan',
      description: spanish
        ? 'Ejecutara un analisis rapido con Microsoft Defender cuando este disponible.'
        : 'Runs a Microsoft Defender quick scan when available.'
    }
  ]
}

function findAssistantAction(id: unknown, settings: Settings): AssistantAction | undefined {
  if (typeof id !== 'string') {
    return undefined
  }

  return getAssistantActions(settings).find((action) => action.id === id)
}

function compactAssistantState(state: AppState): Record<string, unknown> {
  return {
    language: state.settings.language,
    battery: Math.round(state.battery),
    mood: state.mood,
    points: state.points,
    privacyMode: state.settings.privacyMode,
    localAIEnabled: state.settings.localAIEnabled,
    suggestionsEnabled: state.settings.launchSuggestions,
    lunaEnabled: state.settings.lunaEnabled,
    recentSignals: state.localAI.actions.slice(0, 3),
    activeSuggestion: state.suggestions[0] ?? null
  }
}

function localAssistantResponse(
  message: string,
  state: AppState,
  error?: string
): AssistantChatResult {
  const spanish = getLanguage(state.settings) === 'es'
  const lowerMessage = message.toLowerCase()
  let action: AssistantAction | undefined

  if (
    lowerMessage.includes('virus') ||
    lowerMessage.includes('malware') ||
    lowerMessage.includes('seguridad') ||
    lowerMessage.includes('security')
  ) {
    action = findAssistantAction('run_security_scan', state.settings)
  } else if (lowerMessage.includes('bateria') || lowerMessage.includes('battery')) {
    action = findAssistantAction('close_background_apps', state.settings)
  } else if (
    lowerMessage.includes('energia') ||
    lowerMessage.includes('energy') ||
    lowerMessage.includes('consumo') ||
    lowerMessage.includes('power')
  ) {
    action = findAssistantAction('close_background_apps', state.settings)
  } else if (
    lowerMessage.includes('optimiza') ||
    lowerMessage.includes('optimizar') ||
    lowerMessage.includes('optimize') ||
    lowerMessage.includes('rendimiento') ||
    lowerMessage.includes('performance')
  ) {
    action = findAssistantAction('close_background_apps', state.settings)
  } else if (
    lowerMessage.includes('espacio') ||
    lowerMessage.includes('almacen') ||
    lowerMessage.includes('storage') ||
    lowerMessage.includes('disco')
  ) {
    action = findAssistantAction('clean_old_temp_files', state.settings)
  } else if (
    lowerMessage.includes('abrir') ||
    lowerMessage.includes('buscar') ||
    lowerMessage.includes('perder tiempo') ||
    lowerMessage.includes('open usual') ||
    lowerMessage.includes('workflow')
  ) {
    action = findAssistantAction('open_usual_workspace', state.settings)
  } else if (state.battery <= 25) {
    action = findAssistantAction('close_background_apps', state.settings)
  } else if (state.battery <= 45) {
    action = findAssistantAction('close_background_apps', state.settings)
  }

  return {
    source: 'local',
    error,
    message: spanish
      ? 'Puedo ayudarte con acciones locales practicas para ahorrar tiempo, cuidar bateria y optimizar ajustes. Siempre veras exactamente que hare antes de aceptar.'
      : 'I can help with practical local actions to save time, protect battery health, and optimize settings. You will always see exactly what I will do before accepting.',
    action
  }
}

function parseAssistantPayload(rawText: string, state: AppState): AssistantChatResult {
  try {
    const parsed = JSON.parse(rawText) as { message?: unknown; actionId?: unknown }
    const message = typeof parsed.message === 'string' ? parsed.message.trim() : rawText.trim()
    const action = findAssistantAction(parsed.actionId, state.settings)

    return {
      source: 'luna',
      message: message || localAssistantResponse('', state).message,
      action
    }
  } catch {
    return {
      source: 'luna',
      message: rawText.trim(),
      action: undefined
    }
  }
}

function extractResponseText(responseBody: unknown): string {
  if (!responseBody || typeof responseBody !== 'object') {
    return ''
  }

  const body = responseBody as {
    output_text?: unknown
    output?: Array<{ content?: Array<{ text?: unknown; type?: unknown }> }>
  }

  if (typeof body.output_text === 'string') {
    return body.output_text
  }

  return (
    body.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => (typeof content.text === 'string' ? content.text : ''))
      .join('')
      .trim() ?? ''
  )
}

async function askAssistant(message: string): Promise<AssistantChatResult> {
  const state = getState()
  const apiKey = getLunaApiKey()

  if (!state.settings.lunaEnabled || apiKey.length === 0) {
    return localAssistantResponse(message, state)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: state.settings.lunaModel,
        max_output_tokens: 320,
        store: false,
        temperature: 0.2,
        text: {
          format: {
            type: 'json_schema',
            name: 'wml_assistant_response',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                message: { type: 'string' },
                actionId: {
                  type: ['string', 'null'],
                  enum: [
                    'open_usual_workspace',
                    'close_background_apps',
                    'clean_old_temp_files',
                    'run_security_scan',
                    null
                  ]
                }
              },
              required: ['message', 'actionId']
            }
          }
        },
        input: [
          {
            role: 'system',
            content:
              'You are the WML X.X.0 assistant using an OpenAI model. Be concise. Use anonymized local state only. Prefer practical suggestions that save time, improve battery health, close non-critical apps, clean old temporary files, or run a security scan. Do not request sensitive personal data. Do not propose illegal, harmful, invasive, or morally dubious actions. Never suggest closing WML X.X.0 or its own tab/window. Never claim an action has been executed. Return strict JSON only: {"message":"short helpful answer","actionId":"one allowed id or null"}. Available action ids: ' +
              getAssistantActions(state.settings)
                .map((action) => action.id)
                .join(', ')
          },
          {
            role: 'user',
            content: JSON.stringify({
              userMessage: message,
              localState: compactAssistantState(state)
            })
          }
        ]
      })
    })

    if (!response.ok) {
      return localAssistantResponse(message, state, `HTTP ${response.status}`)
    }

    const rawText = extractResponseText(await response.json())
    if (!rawText) {
      return localAssistantResponse(message, state, 'empty_response')
    }

    return parseAssistantPayload(rawText, state)
  } catch (error) {
    return localAssistantResponse(message, state, error instanceof Error ? error.message : 'error')
  } finally {
    clearTimeout(timeout)
  }
}

async function applyAssistantAction(actionId: AssistantActionId): Promise<AppState> {
  const state = getState()
  const action = findAssistantAction(actionId, state.settings)

  if (!action) {
    return state
  }

  if (actionId === 'open_usual_workspace') {
    await openUsualWorkspace()
  } else if (actionId === 'close_background_apps') {
    await closeSafeBackgroundApps()
  } else if (actionId === 'clean_old_temp_files') {
    cleanOldTempFiles()
  } else if (actionId === 'run_security_scan') {
    runSecurityScan()
    store.delete('securitySignal')
  }

  sendState()
  return getState()
}

function createWidget(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
    return
  }

  const size = getWidgetSize()
  const position = getInitialWidgetPosition(size)

  widgetWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    ...position,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  widgetWindow.setIgnoreMouseEvents(false)
  widgetWindow.setFocusable(true)
  widgetWindow.setMinimumSize(size.width, size.height)
  widgetWindow.setMaximumSize(size.width, size.height)
  loadRenderer(widgetWindow, 'widget')

  widgetWindow.webContents.on('context-menu', (e) => {
    e.preventDefault()
    const mood = normalizeMood(store.get('mood'), 'active')
    const text = tMain(getState().settings)

    const menu = Menu.buildFromTemplate([
      {
        label: text.settings,
        click: () => createAppWindow('settings')
      },
      { type: 'separator' },
      {
        label: text.petState,
        submenu: [
          {
            label: mood === 'sitting' ? text.standPet : text.sitPet,
            click: () => {
              const current = getState().mood
              if (current !== 'dead') {
                store.set('mood', current === 'sitting' ? 'active' : 'sitting')
                sendState()
              }
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: text.quit,
        click: () => app.quit()
      }
    ])
    menu.popup()
  })

  if (process.platform === 'darwin') {
    widgetWindow.on('will-move', (event, newBounds) => {
      if (!widgetWindow) return
      const { width: currentW, height: currentH } = getWidgetSize()
      const display = screen.getDisplayMatching(widgetWindow.getBounds())
      const { x: dx, y: dy, width: dw, height: dh } = display.workArea

      const clampedX = Math.min(Math.max(newBounds.x, dx), dx + dw - currentW)
      const clampedY = Math.min(Math.max(newBounds.y, dy), dy + dh - currentH)

      if (clampedX !== newBounds.x || clampedY !== newBounds.y) {
        event.preventDefault()
        widgetWindow.setBounds({ x: clampedX, y: clampedY, width: currentW, height: currentH })
      }
    })
  } else {
    let isClamping = false
    widgetWindow.on('move', () => {
      if (!widgetWindow || isClamping) return
      const { width: currentW, height: currentH } = getWidgetSize()
      const display = screen.getDisplayMatching(widgetWindow.getBounds())
      const { x: dx, y: dy, width: dw, height: dh } = display.workArea
      const { x, y } = widgetWindow.getBounds()

      const clampedX = Math.min(Math.max(x, dx), dx + dw - currentW)
      const clampedY = Math.min(Math.max(y, dy), dy + dh - currentH)

      if (clampedX !== x || clampedY !== y) {
        isClamping = true
        widgetWindow.setBounds({ x: clampedX, y: clampedY, width: currentW, height: currentH })
        isClamping = false
      }
    })
  }

  let isEnforcingWidgetSize = false
  const enforceWidgetSize = (): void => {
    if (!widgetWindow || isEnforcingWidgetSize) return

    const current = widgetWindow.getBounds()
    const fixedSize = getWidgetSize()
    const fixedPosition = clampWidgetPosition(current.x, current.y, fixedSize)

    if (current.width !== fixedSize.width || current.height !== fixedSize.height) {
      isEnforcingWidgetSize = true
      widgetWindow.setBounds({ ...fixedPosition, ...fixedSize })
      isEnforcingWidgetSize = false
    }

    saveWidgetPosition()
  }

  widgetWindow.on('resize', enforceWidgetSize)
  widgetWindow.on('will-resize', (event) => {
    event.preventDefault()
    enforceWidgetSize()
  })
  widgetWindow.on('maximize', () => {
    widgetWindow?.unmaximize()
    enforceWidgetSize()
  })
  widgetWindow.on('moved', saveWidgetPosition)
  widgetWindow.on('closed', () => {
    widgetWindow = null
  })
}

function createAppWindow(route = 'settings'): void {
  console.log('[main] creando appWindow con route:', route)

  if (appWindow) {
    appWindow.show()
    appWindow.focus()
    appWindow.webContents.send('navigate', route)
    return
  }

  appWindow = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 860,
    minHeight: 620,
    title: 'WML X.X.0',
    icon: appIconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  loadRenderer(appWindow, route)

  appWindow.once('ready-to-show', () => {
    appWindow?.show()
    appWindow?.focus()
  })

  appWindow.webContents.on('did-finish-load', () => {
    appWindow?.webContents.send('navigate', route)
  })

  appWindow.on('closed', () => {
    appWindow = null
  })
}

function recordActivity(kind: ActivityKind): void {
  const state = getState()
  const now = Date.now()
  lastActivityAt = now
  recentActivity = [...recentActivity.slice(-7), kind]

  if (state.mood === 'dead') {
    sendState()
    return
  }

  void scanHabitualApps()

  const points = state.points + 1
  const currentBattery = state.battery
  store.set('points', points)
  const preservesMood = ['sitting', 'scared', 'critical'].includes(state.mood)
  if (state.mood === 'sleeping') {
    store.set('mood', 'active')
  } else if (!preservesMood) {
    store.set('mood', currentBattery <= 0 ? 'dead' : currentBattery <= 12 ? 'critical' : 'active')
  }

  if (now - lastActivityPulseAt >= ACTIVITY_PULSE_INTERVAL_MS) {
    lastActivityPulseAt = now
    widgetWindow?.webContents.send('pet-activity', kind)
  }
  sendState()
}

function startLifecycle(): void {
  void syncBatteryFromSystem()

  idleTimer = setInterval(() => {
    void scanHabitualApps()
    const state = getState()
    if (state.mood !== 'dead' && Date.now() - lastActivityAt > 90_000) {
      store.set('mood', 'sleeping')
      sendState()
    }
  }, 15_000)

  drainTimer = setInterval(() => {
    void syncBatteryFromSystem()
  }, 60_000)

  batteryPollTimer = setInterval(() => {
    void syncBatteryFromSystem()
  }, 30_000)

  powerMonitor.on('on-ac', () => {
    void syncBatteryFromSystem()
  })
  powerMonitor.on('on-battery', () => {
    void syncBatteryFromSystem()
  })
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) {
    return
  }

  syncLaunchAtLogin()
  createWidget()

  uIOhook.on('click', () => recordActivity('click'))
  uIOhook.on('keydown', () => recordActivity('type'))
  uIOhook.start()
  startLifecycle()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWidget()
    }
  })
})

app.on('second-instance', () => {
  if (appWindow && !appWindow.isDestroyed()) {
    appWindow.show()
    appWindow.focus()
    return
  }

  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
  }
})

app.on('before-quit', () => {
  uIOhook.stop()
  if (idleTimer) clearInterval(idleTimer)
  if (drainTimer) clearInterval(drainTimer)
  if (batteryPollTimer) clearInterval(batteryPollTimer)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-state', () => getState())
ipcMain.handle('record-activity', (_, kind: ActivityKind) => {
  recordActivity(kind === 'type' ? 'type' : 'click')
  return getState()
})
ipcMain.handle('open-app-window', (_, route: string) => {
  console.log('[main] open-app-window IPC recibido, route =', route)
  createAppWindow(route)
})
ipcMain.handle('save-settings', (_, settings: Partial<Settings>) => {
  const currentSettings = getState().settings
  const nextSettings = { ...currentSettings, ...settings }
  if (
    settings.language ||
    settings.localAIEnabled !== undefined ||
    settings.launchSuggestions !== undefined ||
    settings.privacyMode !== undefined
  ) {
    store.set('dismissedSuggestions', [])
  }
  persistSettings(nextSettings)
  syncLaunchAtLogin(nextSettings.launchAtLogin)
  sendState()
  return getState()
})
ipcMain.handle('save-luna-api-key', (_, apiKey: string) => {
  if (typeof apiKey === 'string') {
    const trimmedKey = apiKey.trim()
    if (trimmedKey.length > 0) {
      store.set('lunaApiKey', trimmedKey)
    } else {
      store.delete('lunaApiKey')
    }
  }

  sendState()
  return getState()
})
ipcMain.handle('ask-assistant', async (_, message: string) => {
  if (typeof message !== 'string' || message.trim().length === 0) {
    return localAssistantResponse('', getState())
  }

  return askAssistant(message.trim().slice(0, 1200))
})
ipcMain.handle('apply-assistant-action', async (_, actionId: AssistantActionId) => {
  return applyAssistantAction(actionId)
})
ipcMain.handle('save-pet', (_, pet: Partial<PetProfile>) => {
  const currentPet = getState().pet
  const inventory = getState().inventory
  const nextSpecies = normalizePetSpeciesForInventory(pet.species ?? currentPet.species, inventory)
  const nextName = typeof pet.name === 'string' ? pet.name.trim() : currentPet.name
  store.set('pet', {
    ...currentPet,
    name: nextName.length > 0 ? nextName : currentPet.name || defaultPet.name,
    color: normalizePetColorForInventory(pet.color ?? currentPet.color, nextSpecies, inventory),
    species: nextSpecies,
    accessory: normalizePetAccessoryForInventory(
      pet.accessory !== undefined ? pet.accessory : currentPet.accessory,
      inventory
    )
  })
  sendState()
  return getState()
})
ipcMain.handle('buy-shop-item', (_, item: ShopItemRequest) => {
  if (!isShopItemRequest(item)) {
    return getState()
  }

  const state = getState()
  const inventory = normalizePetInventory(state.inventory)
  const points = state.points

  if (!isKnownShopItem(item) || isShopItemOwned(item, inventory)) {
    return state
  }

  if (item.kind === 'color' && !isPetSpeciesOwned(getRequestedSpecies(item), inventory)) {
    return state
  }

  if (item.id === DEFAULT_COLOR_ID || item.id === DEFAULT_SPECIES_ID) {
    return state
  }

  const price = getShopItemPrice(item)
  if (price <= 0 || points < price) {
    return state
  }

  if (item.kind === 'species') {
    inventory.species = Array.from(new Set([...inventory.species, item.id]))
    inventory.colors[item.id] = Array.from(
      new Set([DEFAULT_COLOR_ID, ...(inventory.colors[item.id] ?? [])])
    )
    store.set('pet', {
      ...state.pet,
      species: item.id,
      color: DEFAULT_COLOR_ID
    })
  } else if (item.kind === 'accessory') {
    inventory.accessories = Array.from(new Set([...inventory.accessories, item.id]))
    store.set('pet', {
      ...state.pet,
      accessory: item.id
    })
  } else {
    const species = getRequestedSpecies(item)
    inventory.colors[species] = Array.from(
      new Set([DEFAULT_COLOR_ID, ...(inventory.colors[species] ?? []), item.id as PetColorId])
    )
    if (state.pet.species === species) {
      store.set('pet', {
        ...state.pet,
        color: item.id
      })
    }
  }

  store.set('points', points - price)
  setInventory(inventory)
  updatePetAfterInventoryChange(inventory)
  sendState()
  return getState()
})
ipcMain.handle('sell-shop-item', (_, item: ShopItemRequest) => {
  if (!isShopItemRequest(item)) {
    return getState()
  }

  const state = getState()
  const inventory = normalizePetInventory(state.inventory)

  if (!isKnownShopItem(item) || !isShopItemOwned(item, inventory)) {
    return state
  }

  if (item.id === DEFAULT_COLOR_ID || item.id === DEFAULT_SPECIES_ID) {
    return state
  }

  let refund = getPetSellValue(getShopItemPrice(item))

  if (item.kind === 'species') {
    const species = PET_SPECIES_CATALOG.find((definition) => definition.id === item.id)
    if (species?.protected) {
      return state
    }

    const speciesColors = inventory.colors[item.id] ?? [DEFAULT_COLOR_ID]
    refund += speciesColors
      .filter((colorId) => colorId !== DEFAULT_COLOR_ID)
      .reduce(
        (total, colorId) => total + getPetSellValue(getPetColorPriceForSpecies(colorId, item.id)),
        0
      )
    inventory.species = inventory.species.filter((speciesId) => speciesId !== item.id)
    inventory.colors[item.id] = [DEFAULT_COLOR_ID]
  } else if (item.kind === 'accessory') {
    inventory.accessories = inventory.accessories.filter((accessoryId) => accessoryId !== item.id)
  } else {
    const species = getRequestedSpecies(item)
    inventory.colors[species] = (inventory.colors[species] ?? [DEFAULT_COLOR_ID]).filter(
      (colorId) => colorId !== item.id
    )
  }

  store.set('points', state.points + refund)
  setInventory(inventory)
  updatePetAfterInventoryChange(inventory)
  sendState()
  return getState()
})
ipcMain.handle('set-mood', (_, mood: PetMood) => {
  const current = getState().mood
  const nextMood = normalizeMood(mood, 'active')

  // No hacer nada si está muerto
  if (current === 'dead') {
    return getState()
  }

  if (nextMood === 'sitting') {
    // Toggle: si ya está sentado, levantarse; si no, sentarse
    store.set('mood', current === 'sitting' ? 'active' : 'sitting')
  } else {
    store.set('mood', nextMood)
  }

  sendState()
  return getState()
})
ipcMain.handle('charge-pet', async () => {
  const systemBattery = await getSystemBattery()
  store.set('battery', systemBattery ?? 100)
  store.set('mood', 'active')
  sendState()
  return getState()
})
ipcMain.handle('revive-pet', async () => {
  const points = Math.max(0, getState().points - 30)
  const systemBattery = await getSystemBattery()
  store.set('points', points)
  store.set('battery', systemBattery ?? 45)
  store.set('mood', 'active')
  sendState()
  return getState()
})
ipcMain.handle('approve-suggestion', async (_, suggestion: string) => {
  const state = getState()
  const localSuggestion = getSuggestionByText(state, suggestion)

  if (localSuggestion?.id === 'open_usual_workspace') {
    await openUsualWorkspace()
  } else if (localSuggestion?.id === 'close_background_apps') {
    await closeSafeBackgroundApps()
  } else if (localSuggestion?.id === 'clean_old_temp_files') {
    cleanOldTempFiles()
  } else if (localSuggestion?.id === 'run_security_scan') {
    runSecurityScan()
    store.delete('securitySignal')
  }

  const dismissedSuggestions = new Set(store.get('dismissedSuggestions', []) as string[])
  dismissedSuggestions.add(suggestion)
  store.set('dismissedSuggestions', [...dismissedSuggestions])

  const suggestions = state.suggestions.filter((item) => item !== suggestion)
  store.set('suggestions', suggestions)
  sendState()
  return { ok: true }
})
ipcMain.handle('dismiss-suggestion', (_, suggestion: string) => {
  const dismissedSuggestions = new Set(store.get('dismissedSuggestions', []) as string[])
  dismissedSuggestions.add(suggestion)
  store.set('dismissedSuggestions', [...dismissedSuggestions])
  store.set(
    'suggestions',
    getState().suggestions.filter((item) => item !== suggestion)
  )
  sendState()
})
