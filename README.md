# CO-PO Question Builder

**Write better exam questions. Verify Bloom's taxonomy. Map to your accreditation outcomes.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-20%2B-green?logo=node.js)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-31-blue?logo=electron)](https://www.electronjs.org/)
[![Build & Release](https://github.com/<your-username>/copo-qbuilder/actions/workflows/build-release.yml/badge.svg)](https://github.com/<your-username>/copo-qbuilder/actions/workflows/build-release.yml)

A desktop app for outcome-based education (OBE) practitioners. Define POs and COs, build the CO-PO mapping matrix, write and verify exam questions, then export a print-ready A4 `.docx`.

### ⬇️ Download (no installation needed)
**[→ Download latest installer](https://github.com/<your-username>/copo-qbuilder/releases/latest)**

Run the `.exe` installer. Done. No Python, no Node.js, nothing else required.

> Windows SmartScreen may warn (app is unsigned) — click **More info → Run anyway**.

---

## Running from source

**Requirements:** Node.js 20+, npm

```bash
git clone https://github.com/<your-username>/copo-qbuilder.git
cd copo-qbuilder
npm install
npm run dev
```

The app opens immediately. That's it.

## Building a distributable installer

```bash
npm run package:win    # Windows .exe installer
npm run package:mac    # macOS .dmg
npm run package:linux  # Linux AppImage
```

Output goes to `release/`.

## How it works

- **Verb check** — deterministic lookup against a static Bloom's verb dictionary. Instant, no API needed.
- **Semantic check (optional)** — LLM checks whether the question's actual complexity matches the claimed level, and which CO it best maps to. Uses your own API key (OpenAI / Anthropic / Gemini).
- **CO → PO weights** — looked up directly from the matrix you define. No model involved.

The app works fully without any API key. The LLM layer is additive.

## API key setup

Go to **⚙ Settings**, pick a provider, paste your key, click **Test Connection**, then **Save**. The key is encrypted using Electron's `safeStorage` (OS-level encryption) — never stored in plaintext.

- [Get an OpenAI key](https://platform.openai.com/api-keys)
- [Get an Anthropic key](https://console.anthropic.com/settings/keys)
- [Get a Gemini key](https://aistudio.google.com/app/apikey)

## Tech stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron 31 |
| UI | React 18 + TypeScript |
| Build | Vite + electron-vite |
| Styling | Tailwind CSS |
| Word export | `docx` npm package |
| Secure storage | Electron `safeStorage` |
| Packaging | electron-builder (NSIS installer) |

## License

MIT © 2026 Tashreef Muhammad
