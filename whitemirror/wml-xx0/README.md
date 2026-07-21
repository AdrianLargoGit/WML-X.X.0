# WML X.X.0

A desktop widget with an interactive pet, local AI, and an optional OpenAI-powered assistant. It is built with Electron, React, and TypeScript, and is designed to live quietly on top of the desktop: it keeps the user company, observes basic system signals, suggests useful actions, and always asks for confirmation before doing anything meaningful.

<p align="center">
  <img src="public/icons/icon.png" alt="WML X.X.0 icon" width="96" />
</p>

## What It Does

WML X.X.0 displays a floating pet in a transparent, always-on-top window. The pet reacts to user activity, changes state based on battery and inactivity, earns points, and lets the user buy animals, colors, and accessories from the settings panel.

The app combines two assistance layers:

- Local AI: in-app rules for battery suggestions, activity patterns, usual processes, and simple security warnings.
- Optional OpenAI model: can be enabled from settings with an API key. If it fails or is not configured, the app automatically falls back to local AI.

## Preview

Some visual assets included in the project:

<p>
  <img src="public/animals/hedgehog/erizoactivo-max-px-frames-36-rows-6-cols-6.png" alt="Hedgehog sprite" width="180" />
  <img src="public/animals/duck/patoactivo-normalized.png" alt="Active duck" width="120" />
  <img src="public/accessories/corona-trimmed.png" alt="Crown accessory" width="80" />
</p>

## Main Features

- Floating pet with a transparent, draggable, always-on-top window.
- Pet states: active, sitting, sleeping, alert, low battery, and powered off.
- Reactions to clicks and typing without reading what the user types.
- Activity-based points system.
- Visual shop with species, colors, and accessories.
- Settings panel with Spanish/English language support, privacy mode, launch at login, local AI, and OpenAI model configuration.
- Assistant chat for practical recommendations and local actions.
- Controlled proactive suggestions designed to avoid overwhelming the user.
- Confirmable local actions: open usual apps, close non-critical background apps, clean old temporary files, and run a quick security scan when available.
- Local persistence with `electron-store`.
- Windows, Linux, and macOS packaging with `electron-builder`.

## Privacy

The project is designed to send as little information as possible outside the device.

Local activity is used as a simple signal, not as content. WML X.X.0 does not read the text you type in other apps and does not access personal documents.

If the OpenAI model is enabled, the app sends a summarized and anonymized state: language, approximate battery level, pet state, points, enabled settings, and the current suggestion if one exists. The request uses `store: false` and expects strict JSON output. If there is no API key, no network connection, or the API returns an error, local AI is used instead.

## Requirements

- Node.js compatible with the project.
- npm.
- Desktop operating system: Windows, Linux, or macOS.

On Windows, some security actions depend on Microsoft Defender. On macOS and Linux, some builds may require platform-specific system tools.

## Installation

```bash
npm install
```

## Development

Start the app in development mode:

```bash
npm run dev
```

Check TypeScript types:

```bash
npm run typecheck
```

Run ESLint:

```bash
npm run lint
```

Format the project:

```bash
npm run format
```

## Build

Base Electron/Vite build:

```bash
npm run build
```

Generate an unpacked app folder:

```bash
npm run build:unpack
```

Package by platform:

```bash
npm run build:win
npm run build:linux
npm run build:mac
```

Aliases are also available:

```bash
npm run package:win
npm run package:linux
npm run package:mac
```

Notes:

- `build:win` generates Windows artifacts with NSIS.
- `build:linux` generates `AppImage` and `.deb`.
- `build:mac` generates `.dmg` and `.zip`.
- macOS builds should be run on macOS to work correctly.

## OpenAI Model

The settings panel lets the user enter an API key and enable an OpenAI model. By default, the project uses `gpt-5-nano`, although it can be changed from the interface.

You can also use the environment variable:

```bash
OPENAI_API_KEY=your_api_key
```

The API is optional. Without it, WML X.X.0 keeps working with local AI.

## Project Structure

```text
.
|-- public/                 # Icons, sprites, and visual accessories
|-- scripts/                # Helper scripts for cleanup/build tasks
|-- src/main/               # Electron main process
|-- src/preload/            # Safe API exposed to the renderer
|-- src/renderer/           # React interface
|-- src/shared/             # Shared shop/color catalogs
|-- package.json            # Scripts and dependencies
`-- WIDGET_OVERVIEW.md      # Extended functional overview
```

## How It Works Internally

- `src/main/index.ts` creates the windows and manages persistent state, battery, activity, suggestions, local actions, and optional model calls.
- `src/preload/index.ts` exposes a controlled API to the renderer through IPC.
- `src/renderer/src/components/Widget.tsx` renders the floating pet and the small readout panel.
- `src/renderer/src/components/Settings.tsx` renders settings, shop, customization, and AI configuration.
- `src/renderer/src/components/AssistantChat.tsx` renders the assistant.
- `src/shared/petShop.ts` and `src/shared/petColors.ts` define species, accessories, colors, and prices.

## Available Actions

The assistant and suggestion system can only propose actions from a closed catalog:

- Open or focus locally detected usual apps.
- Close non-critical background apps.
- Clean old temporary files.
- Run a quick security scan when the system allows it.

The app does not execute free-form commands generated by AI.

## Troubleshooting

If `npm install` fails on native dependencies, make sure your environment has the required tools to compile Electron modules.

If the OpenAI model does not respond, check the API key, model name, and connection. The app will continue using local AI.

If the macOS build fails outside macOS, that is expected: Mac artifacts should be generated on macOS.

If you see broken characters in older text files, check the file encoding and save as UTF-8.

## Project Status

Desktop project in active development. The functional base includes the widget, settings panel, shop, local AI, optional assistant, and multiplatform packaging.
