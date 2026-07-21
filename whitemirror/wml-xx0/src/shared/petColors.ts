export type PetColorId =
  | 'base'
  | 'white'
  | 'black'
  | 'light-pink'
  | 'light-yellow'
  | 'light-green'
  | 'light-red'
  | 'light-blue'
  | 'aurora-premium'

export interface PetColorDefinition {
  id: PetColorId
  label: {
    es: string
    en: string
  }
  hex: string
  swatchBackground?: string
  bodyTintHex?: string
  bodyTintBackground?: string
  tintScope?: 'body' | 'full'
  minPoints: number
  cssFilter: string
  speciesOverrides?: Partial<
    Record<string, Partial<Omit<PetColorDefinition, 'id' | 'speciesOverrides'>>>
  >
}

export const DUCK_UNLOCK_POINTS = 100000

export const PET_COLOR_CATALOG: PetColorDefinition[] = [
  {
    id: 'base',
    label: { es: 'Original', en: 'Original' },
    hex: '#c98543',
    minPoints: 0,
    cssFilter: 'none'
  },
  {
    id: 'white',
    label: { es: 'Blanco', en: 'White' },
    hex: '#f7f7f2',
    minPoints: 10000,
    cssFilter: 'grayscale(1) brightness(1.55) contrast(0.9) saturate(0.2)',
    speciesOverrides: {
      duck: {
        minPoints: 10000,
        bodyTintHex: '#f7f7f2',
        cssFilter: 'grayscale(1) brightness(1.52) contrast(0.96) saturate(0.18)'
      }
    }
  },
  {
    id: 'black',
    label: { es: 'Negro', en: 'Black' },
    hex: '#2a2725',
    minPoints: 10000,
    cssFilter: 'grayscale(1) brightness(0.34) contrast(1.35)',
    speciesOverrides: {
      duck: {
        minPoints: 10000,
        bodyTintHex: '#2a2725',
        cssFilter: 'grayscale(1) brightness(0.36) contrast(1.38)'
      }
    }
  },
  {
    id: 'light-pink',
    label: { es: 'Rosa claro', en: 'Light pink' },
    hex: '#f6b8cf',
    minPoints: 25000,
    cssFilter: 'sepia(0.35) saturate(1.25) hue-rotate(290deg) brightness(1.18) contrast(0.94)',
    speciesOverrides: {
      duck: {
        minPoints: 25000,
        bodyTintHex: '#ff91c2',
        cssFilter: 'sepia(0.2) saturate(1.55) hue-rotate(287deg) brightness(1.07) contrast(1.02)'
      }
    }
  },
  {
    id: 'light-yellow',
    label: { es: 'Amarillo claro', en: 'Light yellow' },
    hex: '#f4dc7a',
    minPoints: 25000,
    cssFilter: 'sepia(0.55) saturate(1.55) hue-rotate(8deg) brightness(1.18) contrast(0.93)',
    speciesOverrides: {
      duck: {
        label: { es: 'Marron', en: 'Brown' },
        hex: '#9b6234',
        minPoints: 25000,
        bodyTintHex: '#9b6234',
        cssFilter: 'sepia(0.72) saturate(1.22) hue-rotate(348deg) brightness(0.9) contrast(1.1)'
      }
    }
  },
  {
    id: 'light-green',
    label: { es: 'Verde claro', en: 'Light green' },
    hex: '#a7ddb2',
    minPoints: 25000,
    cssFilter: 'sepia(0.55) saturate(1.25) hue-rotate(62deg) brightness(1.14) contrast(0.92)',
    speciesOverrides: {
      duck: {
        minPoints: 25000,
        bodyTintHex: '#71d986',
        cssFilter: 'sepia(0.28) saturate(1.28) hue-rotate(57deg) brightness(1.03) contrast(0.98)'
      }
    }
  },
  {
    id: 'light-red',
    label: { es: 'Rojo claro', en: 'Light red' },
    hex: '#ef8a86',
    minPoints: 25000,
    cssFilter: 'sepia(0.45) saturate(1.35) hue-rotate(316deg) brightness(1.08) contrast(0.96)',
    speciesOverrides: {
      duck: {
        minPoints: 25000,
        bodyTintHex: '#ff716d',
        cssFilter: 'sepia(0.24) saturate(1.62) hue-rotate(318deg) brightness(0.98) contrast(1.05)'
      }
    }
  },
  {
    id: 'light-blue',
    label: { es: 'Azul claro', en: 'Light blue' },
    hex: '#9bc7ef',
    minPoints: 25000,
    cssFilter: 'sepia(0.42) saturate(1.55) hue-rotate(165deg) brightness(1.12) contrast(0.92)',
    speciesOverrides: {
      duck: {
        minPoints: 25000,
        bodyTintHex: '#5ebcff',
        cssFilter: 'sepia(0.18) saturate(1.5) hue-rotate(154deg) brightness(1.04) contrast(1)'
      }
    }
  },
  {
    id: 'aurora-premium',
    label: { es: 'Diamante prismático', en: 'Prismatic diamond' },
    hex: '#c9f6ff',
    swatchBackground:
      'linear-gradient(135deg, #ffffff 0%, #8ceeff 18%, #e9fbff 34%, #89b7ff 50%, #f7f1ff 66%, #c7b0ff 82%, #ffffff 100%)',
    minPoints: 99000,
    speciesOverrides: {
      duck: {
        label: { es: 'Plateado brillante', en: 'Sparkling silver' },
        hex: '#d9e1e7',
        swatchBackground:
          'linear-gradient(135deg, #f8fbfd 0%, #b8c2cb 20%, #eef3f6 38%, #8f9da8 52%, #ffffff 66%, #aab6bf 82%, #e6edf1 100%)',
        minPoints: 99000,
        bodyTintHex: '#d9e1e7',
        bodyTintBackground:
          'linear-gradient(118deg, #7f8b95 0%, #cbd4db 18%, #ffffff 32%, #a6b2bc 44%, #e8eef2 56%, #ffffff 68%, #9aa7b1 82%, #dce5ea 100%)',
        tintScope: 'full',
        cssFilter:
          'grayscale(1) saturate(0.16) brightness(1.36) contrast(1.34) drop-shadow(0 0 2px rgba(245, 250, 255, 0.55))'
      }
    },
    cssFilter:
      'grayscale(0.14) sepia(0.14) saturate(1.52) hue-rotate(158deg) brightness(1.34) contrast(1.24) drop-shadow(0 0 2px rgba(235, 255, 255, 0.45))'
  }
]

export function getPetColor(colorId: string): PetColorDefinition {
  return PET_COLOR_CATALOG.find((color) => color.id === colorId) ?? PET_COLOR_CATALOG[0]
}

export function getPetColorForSpecies(colorId: string, species: string): PetColorDefinition {
  const color = getPetColor(colorId)
  const override = color.speciesOverrides?.[species]

  return override ? { ...color, ...override } : color
}

export function getPetColorMinPointsForSpecies(colorId: string, species: string): number {
  return getPetColorForSpecies(colorId, species).minPoints
}
