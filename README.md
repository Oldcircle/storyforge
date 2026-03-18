<h1 align="center">
  <br>
  StoryForge
  <br>
</h1>

<h4 align="center">AI-powered visual storytelling — generate a full storyboard from a single sentence.</h4>

<p align="center">
  <a href="https://github.com/Oldcircle/storyforge/actions"><img src="https://img.shields.io/github/actions/workflow/status/Oldcircle/storyforge/ci.yml?branch=main&style=flat-square&logo=githubactions&logoColor=white&label=CI" alt="CI"></a>
  <a href="https://github.com/Oldcircle/storyforge/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Oldcircle/storyforge?style=flat-square&color=blue" alt="License"></a>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 7">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/ComfyUI-ready-FF6B35?style=flat-square" alt="ComfyUI">
  <img src="https://img.shields.io/badge/OpenAI%20API-compatible-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI Compatible">
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#supported-providers">Providers</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

> Brings the **prompt engineering** and **consistency control** pioneered by [SillyTavern](https://github.com/SillyTavern/SillyTavern) and [RisuAI](https://github.com/kwaroran/RisuAI) into an AI visual production pipeline.

## What is StoryForge?

StoryForge is a **local-first** AI visual content creation tool. You describe a scene in natural language, a Director LLM interprets your intent, generates a structured storyboard, and dispatches image generation tasks to backends like [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — producing character-consistent, style-controlled comic panels or image sequences.

**Core idea**: Character Cards lock down appearances. Scene Books lock down environments. Director Presets control narrative. Render Presets control image quality. — Four asset layers, each with a single responsibility. LLM handles creativity; the program handles consistency.

## Features

- **Character Cards** — Lock character appearance with base prompts, LoRA triggers, reference images, expressions, and outfit variants. Import directly from SillyTavern PNG cards.
- **Scene Books** — Keyword-triggered environment descriptions with three-way routing: `director_only` / `image_only` / `shared` — non-visual text never leaks into CLIP. Import from SillyTavern World Books.
- **Director Engine** — LLM generates structured storyboard JSON from natural language. Prompt assembler injects character/scene context automatically.
- **Three Prompt Modes** — Rules (deterministic), LLM-Assisted (visual intent), LLM Prompt Writer (focused 60-80 word SD prompts). Project-level toggle.
- **Render Presets** — Quality word packs, negative prompts, default generation parameters (checkpoint, sampler, steps, CFG, clip skip), and customizable Prompt Writer system prompts per art style.
- **Workflow Templates** — ComfyUI node graphs with slot mapping. Fill checkpoint, prompt, seed, resolution into any workflow via declarative slot definitions.
- **Execution Snapshots** — Every generation records the full parameter set (prompt, seed, workflow version, timestamp) for reproducibility and debugging.
- **Batch Generation** — Generate all shots in a storyboard sequentially with progress tracking. Single-shot failures don't block the rest.
- **Multi-Provider LLM** — Data-driven provider system: DeepSeek, OpenAI, OpenRouter, Groq, SiliconFlow, Ollama, or any custom OpenAI-compatible endpoint.
- **SillyTavern Import** — Character Card PNG (tEXt chunk ccv3/chara), World Book JSON, embedded character_book extraction.

## Quick Start

### Prerequisites

- **Node.js 22+** (recommend [mise](https://mise.jdx.dev/) for version management)
- **[ComfyUI](https://github.com/comfyanonymous/ComfyUI)** running locally or remotely
- An **LLM API key** (DeepSeek / OpenAI / OpenRouter / etc.)

### Install & Run

```bash
git clone https://github.com/Oldcircle/storyforge.git
cd storyforge
npm install
npm run dev
```

Open `http://localhost:5174` and you're ready to go.

### First Steps

1. **Settings** → Configure LLM provider and API key
2. **Settings** → Set ComfyUI URL (default: `http://127.0.0.1:8188`)
3. **Dashboard** → Create a project → Add character cards → Add scene books
4. **Storyboard** → Describe a scene → Generate storyboard JSON
5. **Generation** → Pick shots → Generate images (single or batch)

## Architecture

```
┌───────────────────────────────────────────────────┐
│                  UI Layer (React)                  │
│  Dashboard │ Characters │ Storyboard │ Generation  │
├───────────────────────────────────────────────────┤
│               Director Engine                      │
│  Prompt Assembler → Storyboard Parser              │
│  → Prompt Writer (LLM) → Task Scheduler            │
├───────────────────────────────────────────────────┤
│                 Asset Layer                         │
│  Character │ Scene Book │ Director │ Render │ WF   │
│  Card      │            │ Preset   │ Preset │ Tmpl │
├───────────────────────────────────────────────────┤
│               Adapter Layer                        │
│  LLM (OpenAI-compat) │ ComfyUI │ (more planned)   │
└───────────────────────────────────────────────────┘
```

### Core Data Flow

```
Natural language input
        │
        ▼
  Director LLM ─── parse intent + query assets + generate storyboard JSON
        │
        ▼
  Prompt Writer (optional) ─── LLM rewrites assets into focused SD prompt
        │
        ▼
  Render Plan Compiler ─── inject quality tokens + character anchors
        │
        ▼
  Workflow Template ─── fill slots → ComfyUI API JSON
        │
        ▼
  ComfyUI ─── generate image → write result back to storyboard
```

## How It Works

### Three Prompt Compilation Modes

| Mode | How it works | Best for |
|------|-------------|----------|
| **Rules** | Character + Scene + Render Preset → deterministic prompt assembly | Reproducibility, debugging |
| **LLM-Assisted** | Director LLM outputs `visualIntent` per shot; program merges with character anchors | Creative framing with consistency guardrails |
| **LLM Prompt Writer** | Dedicated LLM call converts structured assets into a focused 60-80 word SD prompt | Best image quality; solves CLIP attention scatter from mechanical concatenation |

> **Design principle**: LLM never decides hardware parameters. Checkpoint, sampler, steps, CFG scale, and clip skip are always controlled by the Render Preset.

### Key Concepts

| Concept | Role | ST/RisuAI Equivalent |
|---------|------|---------------------|
| **Character Card** | Locks character visuals: base prompt, LoRA, reference images, expressions, outfits | Character Card |
| **Scene Book** | Keyword-triggered environment descriptions with `director_only` / `image_only` / `shared` routing | World Book |
| **Director Preset** | LLM system prompt + storyboard rules + adapter selection | Preset |
| **Render Preset** | Quality tokens, negative prompts, generation defaults, Prompt Writer system prompt | — |
| **Workflow Template** | ComfyUI node graph + slot mapping for parameter injection | — |
| **Execution Snapshot** | Full record of a single generation (prompt, seed, workflow, timestamps) | — |

### Comparison with SillyTavern / RisuAI

| Dimension | ST / RisuAI | StoryForge |
|-----------|-------------|------------|
| Primary output | Text dialogue | Images / video / comics |
| Character Card purpose | Control LLM writing style | Control visual consistency |
| World Book purpose | Inject lore into LLM context | Inject scene descriptions into image prompts |
| Prompt routing | All to LLM | Dual-path: LLM (intent) + image API (visuals) |
| Consistency | Variables + context management | Reference images + LoRA + seed + ControlNet |
| Plugin ecosystem | Text processing / RAG / TTS | Image gen / video gen / voice backends |

## Supported Providers

### LLM (OpenAI-Compatible)

- [DeepSeek](https://platform.deepseek.com/)
- [OpenAI](https://platform.openai.com/)
- [OpenRouter](https://openrouter.ai/)
- [Groq](https://groq.com/)
- [SiliconFlow](https://siliconflow.cn/)
- [Ollama](https://ollama.com/) (local)
- Any custom OpenAI-compatible endpoint

### Image Generation

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) (via HTTP API)
- SD WebUI, FLUX, and more adapters planned

## Development

```bash
npm install       # install dependencies
npm run dev       # start dev server (port 5174)
npm run check     # typecheck (tsc --noEmit)
npm run build     # production build
```

### ComfyUI Proxy

In dev mode, Vite proxies `/comfyui-api` → your ComfyUI instance to bypass browser CORS restrictions. The frontend uses `import.meta.env.DEV` to decide whether to route through the proxy.

### Project Structure

```
src/
├── types/           # Shared type definitions
├── stores/          # Zustand state management
├── engine/          # Director engine core
│   ├── director.ts          # Director LLM orchestration
│   ├── prompt-assembler.ts  # Prompt assembly + Render Plan compilation
│   ├── prompt-writer.ts     # LLM Prompt Writer
│   ├── storyboard-parser.ts # Storyboard JSON parser
│   └── keyword-matcher.ts   # Keyword matching (Scene Books)
├── adapters/        # Backend adapters
│   ├── llm/         # LLM (OpenAI-compatible)
│   └── image/       # Image generation (ComfyUI)
├── data/            # Defaults + provider definitions
├── components/      # UI components
├── pages/           # Page components
├── db/              # Dexie.js (IndexedDB) database
└── utils/           # Utilities
```

## Roadmap

- **Workflow Templates** — Custom editor, validation, complex node chains (hires, ControlNet, IP-Adapter)
- **Consistency Pipeline** — Reference images, LoRA management, seed strategies
- **Export** — Comic PDF, image sequences, MP4 video
- **Video Adapters** — Kling, Runway, Pika
- **Voice Adapters** — Fish-TTS, ChatTTS, ElevenLabs
- **Timeline Editor** — Multi-track arrangement with subtitles
- **Plugin SDK** — Standard adapter interface + documentation
- **Community** — Asset sharing format (`.storyforge`), marketplace

## Acknowledgements

- [SillyTavern](https://github.com/SillyTavern/SillyTavern) — Character cards, world books, and prompt management architecture
- [RisuAI](https://github.com/kwaroran/RisuAI) — Data-driven multi-provider configuration, modular design patterns
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — Image generation backend

## License

[MIT](LICENSE)
