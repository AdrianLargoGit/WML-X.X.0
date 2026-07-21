import {
  DUCK_UNLOCK_POINTS,
  PET_COLOR_CATALOG,
  type PetColorId,
  getPetColorMinPointsForSpecies
} from './petColors'

export type ShopItemKind = 'species' | 'color' | 'accessory'

export interface PetSpeciesDefinition {
  id: string
  label: {
    es: string
    en: string
  }
  price: number
  protected?: boolean
}

export interface PetAccessoryDefinition {
  id: string
  label: {
    es: string
    en: string
  }
  price: number
}

export interface PetInventory {
  species: string[]
  colors: Record<string, PetColorId[]>
  accessories: string[]
}

export const DEFAULT_SPECIES_ID = 'spark'
export const DEFAULT_COLOR_ID: PetColorId = 'base'
const CROWN_ACCESSORY_ID = 'crown'

export const PET_SPECIES_CATALOG: PetSpeciesDefinition[] = [
  {
    id: DEFAULT_SPECIES_ID,
    label: { es: 'Erizo', en: 'Hedgehog' },
    price: 0,
    protected: true
  },
  {
    id: 'duck',
    label: { es: 'Pato', en: 'Duck' },
    price: DUCK_UNLOCK_POINTS
  }
]

export const PET_ACCESSORY_CATALOG: PetAccessoryDefinition[] = [
  {
    id: CROWN_ACCESSORY_ID,
    label: { es: 'Corona', en: 'Crown' },
    price: 75000
  }
]

export const DEFAULT_PET_INVENTORY: PetInventory = {
  species: [DEFAULT_SPECIES_ID],
  colors: {
    [DEFAULT_SPECIES_ID]: [DEFAULT_COLOR_ID],
    duck: [DEFAULT_COLOR_ID]
  },
  accessories: []
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function validColorId(colorId: unknown): colorId is PetColorId {
  return typeof colorId === 'string' && PET_COLOR_CATALOG.some((color) => color.id === colorId)
}

export function getPetSpeciesPrice(speciesId: string): number {
  return PET_SPECIES_CATALOG.find((species) => species.id === speciesId)?.price ?? 0
}

export function getPetAccessoryPrice(accessoryId: string): number {
  return PET_ACCESSORY_CATALOG.find((accessory) => accessory.id === accessoryId)?.price ?? 0
}

export function normalizePetInventory(rawInventory: unknown): PetInventory {
  const raw = rawInventory as Partial<PetInventory> | undefined
  const rawSpecies = Array.isArray(raw?.species) ? raw.species : []
  const rawAccessories = Array.isArray(raw?.accessories) ? raw.accessories : []
  const rawColors =
    raw?.colors && typeof raw.colors === 'object' ? (raw.colors as Record<string, unknown>) : {}

  const species = unique([
    DEFAULT_SPECIES_ID,
    ...rawSpecies.filter((speciesId) =>
      PET_SPECIES_CATALOG.some((species) => species.id === speciesId)
    )
  ])
  const colors: Record<string, PetColorId[]> = {}

  for (const speciesDefinition of PET_SPECIES_CATALOG) {
    const speciesColors = Array.isArray(rawColors[speciesDefinition.id])
      ? (rawColors[speciesDefinition.id] as unknown[])
      : []

    colors[speciesDefinition.id] = unique([DEFAULT_COLOR_ID, ...speciesColors.filter(validColorId)])
  }

  const accessories = unique(
    rawAccessories.filter((accessoryId) =>
      PET_ACCESSORY_CATALOG.some((accessory) => accessory.id === accessoryId)
    )
  )

  return { species, colors, accessories }
}

export function createLegacyInventoryFromPoints(points: number): PetInventory {
  const inventory = normalizePetInventory(undefined)

  for (const species of PET_SPECIES_CATALOG) {
    if (points >= species.price) {
      inventory.species = unique([...inventory.species, species.id])
    }

    for (const color of PET_COLOR_CATALOG) {
      if (points >= getPetColorMinPointsForSpecies(color.id, species.id)) {
        inventory.colors[species.id] = unique([...inventory.colors[species.id], color.id])
      }
    }
  }

  return inventory
}

export function isPetSpeciesOwned(speciesId: string, inventory: PetInventory): boolean {
  return inventory.species.includes(speciesId)
}

export function isPetColorOwnedForSpecies(
  colorId: string,
  speciesId: string,
  inventory: PetInventory
): boolean {
  return Boolean(inventory.colors[speciesId]?.includes(colorId as PetColorId))
}

export function isPetAccessoryOwned(accessoryId: string, inventory: PetInventory): boolean {
  return inventory.accessories.includes(accessoryId)
}

export function normalizePetSpeciesForInventory(
  speciesId: unknown,
  inventory: PetInventory
): string {
  return typeof speciesId === 'string' && isPetSpeciesOwned(speciesId, inventory)
    ? speciesId
    : DEFAULT_SPECIES_ID
}

export function normalizePetColorForInventory(
  colorId: unknown,
  speciesId: string,
  inventory: PetInventory
): PetColorId {
  return typeof colorId === 'string' && isPetColorOwnedForSpecies(colorId, speciesId, inventory)
    ? (colorId as PetColorId)
    : DEFAULT_COLOR_ID
}

export function normalizePetAccessoryForInventory(
  accessoryId: unknown,
  inventory: PetInventory
): string | null {
  return typeof accessoryId === 'string' && isPetAccessoryOwned(accessoryId, inventory)
    ? accessoryId
    : null
}

export function getPetColorPriceForSpecies(colorId: PetColorId, speciesId: string): number {
  return getPetColorMinPointsForSpecies(colorId, speciesId)
}

export function getPetSellValue(price: number): number {
  return Math.floor(price * 0.25)
}
