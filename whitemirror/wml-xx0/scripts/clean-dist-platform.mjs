import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const platform = process.argv[2]
const distDir = join(process.cwd(), 'dist')

const platformTargets = {
  win: [
    /^win-unpacked(?:\.tmp)?$/,
    /\.exe$/i,
    /\.exe\.blockmap$/i,
    /^latest\.yml$/i,
    /^builder-(debug|effective-config)\.ya?ml$/i
  ],
  linux: [
    /^linux-unpacked(?:\.tmp)?$/,
    /^__snap-/,
    /\.AppImage$/i,
    /\.deb$/i,
    /\.snap$/i,
    /\.rpm$/i,
    /^latest-linux\.ya?ml$/i,
    /^builder-(debug|effective-config)\.ya?ml$/i
  ],
  mac: [
    /^mac(?:-[^/\\]+)?$/,
    /^mac-unpacked(?:\.tmp)?$/,
    /\.dmg$/i,
    /\.dmg\.blockmap$/i,
    /^latest-mac\.ya?ml$/i,
    /^builder-(debug|effective-config)\.ya?ml$/i
  ]
}

if (!platform || !platformTargets[platform]) {
  console.error('Usage: node scripts/clean-dist-platform.mjs <win|linux|mac>')
  process.exit(1)
}

if (!existsSync(distDir)) {
  process.exit(0)
}

for (const entry of readdirSync(distDir)) {
  if (!platformTargets[platform].some((pattern) => pattern.test(entry))) {
    continue
  }

  const target = join(distDir, entry)
  try {
    rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 })
  } catch (error) {
    console.error(`Could not remove ${target}. Close WMLXX0/Electron and retry.`)
    throw error
  }
}
