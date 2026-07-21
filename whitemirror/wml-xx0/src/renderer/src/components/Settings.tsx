import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import Mascota from './Mascota'
import type {
  AppLanguage,
  AppState,
  PetProfile,
  Settings as SettingsType,
  ShopItemRequest
} from '../../../preload/index'
import { getTranslations, type TranslationSet } from '../i18n'
import {
  PET_COLOR_CATALOG,
  getPetColorForSpecies,
  getPetColorMinPointsForSpecies
} from '../../../shared/petColors'
import {
  DEFAULT_COLOR_ID,
  PET_ACCESSORY_CATALOG,
  PET_SPECIES_CATALOG,
  isPetAccessoryOwned,
  isPetColorOwnedForSpecies,
  isPetSpeciesOwned
} from '../../../shared/petShop'

const APP_NAME = 'WML X.X.0'

const NAV_ITEMS = [
  { id: 'overview', labelKey: 'navOverview' },
  { id: 'appearance', labelKey: 'navAppearance' },
  { id: 'intelligence', labelKey: 'navIntelligence' },
  { id: 'system', labelKey: 'navSystem' }
] as const

type NavId = (typeof NAV_ITEMS)[number]['id']

const appIcon = new URL('../../../../public/icons/icon.svg', import.meta.url).href
const crownImage = new URL('../../../../public/accessories/corona-trimmed.png', import.meta.url)
  .href

function moodLabel(mood: string, text: TranslationSet): string {
  const labels: Record<string, string> = {
    active: text.moodActive,
    sitting: text.moodSitting,
    sleeping: text.moodSleeping,
    scared: text.moodScared,
    critical: text.moodCritical,
    dead: text.moodDead
  }

  return labels[mood] ?? mood
}

export default function Settings(): ReactElement {
  const [state, setState] = useState<AppState | null>(null)
  const [nav, setNav] = useState<NavId>('overview')
  const [nameDraft, setNameDraft] = useState('')
  const [apiKeyDraft, setApiKeyDraft] = useState('')

  useEffect(() => {
    if (!window.wml) {
      console.error('[settings] window.wml is missing: check this BrowserWindow preload')
      return
    }

    window.wml.getState().then((nextState) => {
      setState(nextState)
      setNameDraft(nextState.pet.name)
    })

    const unsubscribe = window.wml.onStateUpdated((nextState) => {
      setState(nextState)
      setNameDraft((current) => current || nextState.pet.name)
    })

    return () => unsubscribe()
  }, [])

  if (!state) {
    return (
      <div className="app-shell settings-shell">
        <main className="workspace settings-workspace">{getTranslations().loading}</main>
      </div>
    )
  }

  const text = getTranslations(state.settings.language)

  const updatePet = (partial: Partial<PetProfile>): void => {
    window.wml.savePet(partial)
  }

  const buyShopItem = (item: ShopItemRequest): void => {
    window.wml.buyShopItem(item)
  }

  const sellShopItem = (item: ShopItemRequest): void => {
    window.wml.sellShopItem(item)
  }

  const updateSetting = (partial: Partial<SettingsType>): void => {
    window.wml.saveSettings(partial)
  }

  const saveApiKey = (): void => {
    window.wml.saveLunaApiKey(apiKeyDraft)
    setApiKeyDraft('')
  }

  const battery = Math.round(state.battery)

  return (
    <div className="app-shell settings-shell">
      <aside className="sidebar settings-sidebar">
        <div>
          <div className="sidebar-brand">
            <img className="brand-mark brand-icon" src={appIcon} alt="" />
            <div>
              <strong>{APP_NAME}</strong>
              <span>{text.widgetLocal}</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={nav === item.id ? 'is-active' : ''}
                onClick={() => setNav(item.id)}
              >
                {text[item.labelKey]}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-card settings-device-card">
          <Mascota state={state} compact displaySize={92} />
          <strong>{state.pet.name}</strong>
          <span>{moodLabel(state.mood, text)}</span>
          <div className="metric-row">
            <span>{text.battery}</span>
            <strong>{battery}%</strong>
          </div>
          <div className="battery-track">
            <div style={{ width: `${battery}%` }} />
          </div>
        </div>
      </aside>

      <main className="workspace settings-workspace">
        {nav === 'overview' && (
          <>
            <header className="page-header settings-header">
              <span>{APP_NAME}</span>
              <h1>{text.controlCenter}</h1>
              <p>{text.overviewCopy}</p>
            </header>

            <section className="settings-hero">
              <Mascota state={state} compact displaySize={118} />
              <div>
                <span>{text.currentStatus}</span>
                <strong>{moodLabel(state.mood, text)}</strong>
                <small>{state.localAI.summary}</small>
              </div>
            </section>

            <div className="status-strip settings-status-strip">
              <article>
                <span>{text.points}</span>
                <strong>{state.points}</strong>
              </article>
              <article>
                <span>{text.battery}</span>
                <strong>{battery}%</strong>
              </article>
              <article>
                <span>{text.localAI}</span>
                <strong>{state.localAI.enabled ? text.active : text.paused}</strong>
              </article>
            </div>

            <div className="content-grid">
              <div className="panel panel-span">
                <h2>{text.actions}</h2>
                <p className="panel-copy">{text.actionsCopy}</p>
                <div className="button-row">
                  <button onClick={() => window.wml.chargePet()}>{text.syncBattery}</button>
                  <button
                    className="danger"
                    disabled={state.mood !== 'dead'}
                    onClick={() => window.wml.revivePet()}
                  >
                    {text.revive}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {nav === 'appearance' && (
          <>
            <header className="page-header settings-header">
              <span>{text.personalization}</span>
              <h1>{text.appearance}</h1>
              <p>{text.appearanceCopy}</p>
            </header>

            <div className="content-grid">
              <div className="panel">
                <h2>{text.identity}</h2>
                <div className="field">
                  <span>{text.visibleName}</span>
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onBlur={() => updatePet({ name: nameDraft })}
                    maxLength={24}
                  />
                </div>

                <div className="setting-note">
                  <strong>{text.animal}</strong>
                  <div className="shop-list">
                    {PET_SPECIES_CATALOG.map((species) => {
                      const owned = isPetSpeciesOwned(species.id, state.inventory)
                      const selected = state.pet.species === species.id
                      const canBuy = state.points >= species.price

                      return (
                        <div className="shop-item" key={species.id}>
                          <button
                            type="button"
                            className={selected ? 'is-selected' : ''}
                            disabled={!owned && !canBuy}
                            onClick={() =>
                              owned
                                ? updatePet({ species: species.id })
                                : buyShopItem({ kind: 'species', id: species.id })
                            }
                          >
                            <strong>{species.label[state.settings.language]}</strong>
                            <small>
                              {selected
                                ? text.equipped
                                : owned
                                  ? text.owned
                                  : `${text.buy} ${species.price} ${text.pointsShort}`}
                            </small>
                          </button>
                          {owned && !species.protected && (
                            <button
                              type="button"
                              className="shop-sell-button"
                              onClick={() => sellShopItem({ kind: 'species', id: species.id })}
                            >
                              {text.sell}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="panel">
                <h2>{text.color}</h2>
                <div className="color-palette">
                  {PET_COLOR_CATALOG.map((color) => {
                    const displayColor = getPetColorForSpecies(color.id, state.pet.species)
                    const price = getPetColorMinPointsForSpecies(color.id, state.pet.species)
                    const owned = isPetColorOwnedForSpecies(
                      color.id,
                      state.pet.species,
                      state.inventory
                    )
                    const selected = state.pet.color === color.id
                    const canBuy = state.points >= price

                    return (
                      <div className="shop-item" key={color.id}>
                        <button
                          type="button"
                          className={selected ? 'is-selected' : ''}
                          disabled={!owned && !canBuy}
                          onClick={() =>
                            owned
                              ? updatePet({ color: color.id })
                              : buyShopItem({
                                  kind: 'color',
                                  id: color.id,
                                  species: state.pet.species
                                })
                          }
                        >
                          <span
                            style={{
                              background: displayColor.swatchBackground ?? displayColor.hex
                            }}
                          />
                          <strong>{displayColor.label[state.settings.language]}</strong>
                          <small>
                            {selected
                              ? text.equipped
                              : owned
                                ? text.owned
                                : `${text.buy} ${price} ${text.pointsShort}`}
                          </small>
                        </button>
                        {owned && color.id !== DEFAULT_COLOR_ID && (
                          <button
                            type="button"
                            className="shop-sell-button"
                            onClick={() =>
                              sellShopItem({
                                kind: 'color',
                                id: color.id,
                                species: state.pet.species
                              })
                            }
                          >
                            {text.sell}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="panel panel-span">
                <h2>{text.clothesAccessories}</h2>
                <p className="panel-copy">{text.clothesAccessoriesCopy}</p>
                <div className="accessory-shop-list">
                  {PET_ACCESSORY_CATALOG.map((accessory) => {
                    const owned = isPetAccessoryOwned(accessory.id, state.inventory)
                    const selected = state.pet.accessory === accessory.id
                    const canBuy = state.points >= accessory.price

                    return (
                      <div className="shop-item accessory-shop-item" key={accessory.id}>
                        <button
                          type="button"
                          className={selected ? 'is-selected' : ''}
                          disabled={!owned && !canBuy}
                          onClick={() =>
                            owned
                              ? updatePet({ accessory: accessory.id })
                              : buyShopItem({ kind: 'accessory', id: accessory.id })
                          }
                        >
                          <img src={crownImage} alt="" />
                          <strong>{accessory.label[state.settings.language]}</strong>
                          <small>
                            {selected
                              ? text.equipped
                              : owned
                                ? text.owned
                                : `${text.buy} ${accessory.price} ${text.pointsShort}`}
                          </small>
                        </button>
                        {owned && (
                          <div className="shop-actions">
                            {selected && (
                              <button
                                type="button"
                                className="shop-secondary-button"
                                onClick={() => updatePet({ accessory: null })}
                              >
                                {text.unequip}
                              </button>
                            )}
                            <button
                              type="button"
                              className="shop-sell-button"
                              onClick={() => sellShopItem({ kind: 'accessory', id: accessory.id })}
                            >
                              {text.sell}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {nav === 'intelligence' && (
          <>
            <header className="page-header settings-header">
              <span>{text.onDevice}</span>
              <h1>{text.localAI}</h1>
              <p>{text.localAICopy}</p>
            </header>

            <div className="content-grid">
              <div className="panel panel-span">
                <label className="toggle">
                  <span>
                    <strong>{text.localAIActive}</strong>
                    <small>{text.localAIActiveCopy}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={state.settings.localAIEnabled}
                    onChange={(event) => updateSetting({ localAIEnabled: event.target.checked })}
                  />
                </label>

                <label className="toggle">
                  <span>
                    <strong>{text.proactiveSuggestions}</strong>
                    <small>{text.proactiveSuggestionsCopy}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={state.settings.launchSuggestions}
                    onChange={(event) => updateSetting({ launchSuggestions: event.target.checked })}
                  />
                </label>
              </div>

              <div className="panel panel-span">
                <h2>{text.lunaProvider}</h2>
                <p className="panel-copy">{text.lunaProviderCopy}</p>

                <label className="toggle">
                  <span>
                    <strong>{text.lunaEnabled}</strong>
                    <small>{text.lunaEnabledCopy}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={state.settings.lunaEnabled}
                    onChange={(event) => updateSetting({ lunaEnabled: event.target.checked })}
                  />
                </label>

                <div className="field">
                  <span>{text.lunaModel}</span>
                  <input
                    type="text"
                    value={state.settings.lunaModel}
                    onChange={(event) => updateSetting({ lunaModel: event.target.value })}
                    maxLength={64}
                  />
                </div>

                <div className="field api-key-field">
                  <span>
                    {text.lunaApiKey} -{' '}
                    {state.settings.lunaApiKeyConfigured
                      ? text.lunaApiKeyConfigured
                      : text.lunaApiKeyMissing}
                  </span>
                  <div>
                    <input
                      type="password"
                      value={apiKeyDraft}
                      onChange={(event) => setApiKeyDraft(event.target.value)}
                      placeholder="sk-..."
                      maxLength={240}
                    />
                    <button type="button" onClick={saveApiKey}>
                      {text.saveApiKey}
                    </button>
                  </div>
                </div>
              </div>

              <div className="panel panel-span">
                <h2>{text.localReading}</h2>
                <div className="ai-list">
                  {state.localAI.actions.map((action) => (
                    <div key={action}>{action}</div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {nav === 'system' && (
          <>
            <header className="page-header settings-header">
              <span>{text.system}</span>
              <h1>{text.startupPrivacy}</h1>
              <p>{text.startupPrivacyCopy}</p>
            </header>

            <div className="content-grid">
              <div className="panel panel-span">
                <label className="toggle">
                  <span>
                    <strong>{text.language}</strong>
                    <small>{text.languageCopy}</small>
                  </span>
                  <select
                    value={state.settings.language}
                    onChange={(event) =>
                      updateSetting({ language: event.target.value as AppLanguage })
                    }
                  >
                    <option value="es">{text.spanish}</option>
                    <option value="en">{text.english}</option>
                  </select>
                </label>

                <label className="toggle">
                  <span>
                    <strong>{text.openAtLogin}</strong>
                    <small>{text.openAtLoginCopy}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={state.settings.launchAtLogin}
                    onChange={(event) => updateSetting({ launchAtLogin: event.target.checked })}
                  />
                </label>

                <label className="toggle">
                  <span>
                    <strong>{text.privateMode}</strong>
                    <small>{text.privateModeCopy}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={state.settings.privacyMode}
                    onChange={(event) => updateSetting({ privacyMode: event.target.checked })}
                  />
                </label>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
