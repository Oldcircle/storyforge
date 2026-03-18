<h1 align="center">StoryForge</h1>

<p align="center">AI 漫剧 / 短剧智能制作平台 — 一句话生成一集短剧</p>

<p align="center">
  <a href="https://github.com/Oldcircle/storyforge"><img src="https://img.shields.io/badge/GitHub-StoryForge-blue?style=flat&logo=github" alt="GitHub"></a>
  <a href="https://github.com/Oldcircle/storyforge/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat" alt="MIT License"></a>
</p>

> 把 [SillyTavern](https://github.com/SillyTavern/SillyTavern) / [RisuAI](https://github.com/kwaroran/RisuAI) 在角色扮演领域积累的**提示词工程**和**一致性控制**能力，迁移到 AI 视觉内容生产管线中。

## What is StoryForge?

StoryForge 是一个本地优先的 AI 视觉内容制作工具。用户输入自然语言描述，导演 LLM 自动解析意图、编排分镜，再调度 ComfyUI 等生图后端，产出角色一致、风格可控的漫画分镜或图片序列。

**核心理念**：角色卡锁定外貌，场景书锁定环境，导演预设控制叙事，渲染预设控制画质 — 四层资产各司其职，LLM 负责创意，程序负责一致性。

### 解决了什么问题？

| 痛点 | StoryForge 的解法 | 借鉴来源 |
|------|------------------|----------|
| 角色外貌帧间漂移 | **角色卡**锁定外貌 prompt / LoRA / 参考图 | ST Character Card |
| 手动写 prompt + 调参 | **导演 LLM** 自动生成结构化分镜 + **LLM Prompt Writer** 聚焦写 SD prompt | ST Prompt Manager |
| 工具割裂 | 统一管线 + **适配器插件**对接各种后端 | ST Extension |
| 无法复现 | **项目文件**打包所有资产 + **执行快照**记录每次生成参数 | RisuAI .risu |

## Current Progress

- [x] **资产系统** — 角色卡 / 场景书 / 导演预设 / 渲染预设 CRUD，ST PNG 角色卡 + 世界书 JSON 导入
- [x] **导演引擎** — OpenAI 兼容 LLM 适配器（多 Provider 数据驱动），分镜 JSON 解析器
- [x] **生图管线** — ComfyUI 适配器，Render Plan 编译，WorkflowTemplate 填槽，执行快照落库
- [x] **三种 Prompt 模式** — 规则模式 / LLM 增强模式 / LLM Prompt Writer（项目级切换）
- [x] **体验优化** — 批量生图 + 进度、全屏查看、JSON 导入导出
- [ ] **自定义 WorkflowTemplate** — 编辑器 / 校验 / 复杂节点链（hires / ControlNet / IP-Adapter）
- [ ] **端到端质量打磨** — Prompt Writer 系统提示资产化、ST 世界书导入分类
- [ ] **导出** — 漫画 PDF / 图片序列 / 视频（Phase 4）
- [ ] **生态** — 插件 SDK、资产分享格式、社区市场（Phase 5）

## Architecture

```
┌─────────────────────────────────────────────┐
│               用户界面 (React)                │
│  项目管理 │ 角色编辑 │ 分镜编辑 │ 预览/导出   │
├─────────────────────────────────────────────┤
│              导演引擎 (Director)               │
│  Prompt Assembler → Storyboard Parser        │
│  → Prompt Writer → Task Scheduler            │
├─────────────────────────────────────────────┤
│              资产管理 (Assets)                 │
│  角色卡 │ 场景书 │ 导演预设 │ 渲染预设 │ 工作流 │
├─────────────────────────────────────────────┤
│              适配器层 (Adapters)               │
│  LLM (OpenAI compat) │ ComfyUI │ ...        │
└─────────────────────────────────────────────┘
```

### Core Data Flow

```
用户输入（自然语言）
        ↓
   导演 LLM — 解析意图 + 查询角色卡/场景书 + 生成分镜 JSON
        ↓
   Prompt Writer (可选) — LLM 将素材写成聚焦的 60-80 词 SD prompt
        ↓
   Render Plan Compiler — 注入质量词/负面词/角色一致性锚点
        ↓
   WorkflowTemplate 填槽 — 生成 ComfyUI API JSON
        ↓
   ComfyUI 生图 → 结果回填到分镜
```

### Key Concepts

| 概念 | 说明 | 对应 ST/RisuAI |
|------|------|----------------|
| **角色卡** Character Card | 锁定角色外貌的 prompt + LoRA + 参考图 | Character Card |
| **场景书** Scene Book | 关键词触发的场景 / 环境描述库，支持三路分层（director_only / image_only / shared） | World Book |
| **导演预设** Director Preset | LLM 系统提示 + 分镜规则 + 适配器选择 | Preset |
| **渲染预设** Render Preset | 质量词包 + 负面词 + 默认参数（checkpoint / sampler / steps...）+ Prompt Writer 提示 | — |
| **工作流模板** Workflow Template | ComfyUI 节点图 + slot mapping，支持填槽式参数注入 | — |
| **执行快照** Execution Snapshot | 单次生图的完整参数记录（prompt / seed / workflow / 时间戳） | — |

## Tech Stack

| 模块 | 选型 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 7 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand |
| 本地存储 | Dexie.js (IndexedDB) |
| 生图后端 | ComfyUI（更多适配器计划中） |
| LLM | OpenAI 兼容 API（DeepSeek / OpenAI / OpenRouter / Groq / 硅基流动 / Ollama / 自定义） |

## Getting Started

### Prerequisites

- Node.js 22+（推荐使用 [mise](https://mise.jdx.dev/) 管理版本）
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI)（本地或远程，用于生图）
- 一个 LLM API Key（DeepSeek / OpenAI / OpenRouter 等）

### Install & Run

```bash
git clone https://github.com/Oldcircle/storyforge.git
cd storyforge

npm install
npx vite --port 5174
```

打开 `http://localhost:5174` 即可使用。

### First Steps

1. **设置 → LLM 配置**：选择 Provider，填入 API Key
2. **设置 → ComfyUI 配置**：填入 ComfyUI 地址（默认 `http://127.0.0.1:8188`）
3. **创建项目** → 创建角色卡 → 创建场景书 → 绑定导演预设和渲染预设
4. **分镜页面**：输入场景描述，点击生成，LLM 自动产出分镜 JSON
5. **生成页面**：选择分镜，单镜头或批量生图

### SillyTavern 资产导入

StoryForge 支持直接导入 SillyTavern 资产：

- **角色卡 PNG** — 读取 tEXt chunk（ccv3/chara），映射叙事字段，视觉字段留空由用户填写
- **世界书 JSON** — 映射为场景书（content 放入 environmentPrompt）
- **内嵌世界书** — 角色卡中的 character_book 自动提取为独立场景书

## Development

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run check

# 构建生产版本
npm run build
```

### ComfyUI 代理

开发模式下，Vite dev server 配置了 `/comfyui-api` → ComfyUI 的代理，解决浏览器 CORS 问题。前端代码通过 `import.meta.env.DEV` 判断是否走代理路径。

### Project Structure

```
storyforge/
├── src/
│   ├── types/           # 共享类型定义
│   ├── stores/          # Zustand 状态管理
│   ├── engine/          # 导演引擎核心
│   │   ├── director.ts          # 导演 LLM 调度
│   │   ├── prompt-assembler.ts  # Prompt 组装 + Render Plan 编译
│   │   ├── prompt-writer.ts     # LLM Prompt Writer
│   │   ├── storyboard-parser.ts # 分镜 JSON 解析
│   │   └── keyword-matcher.ts   # 关键词匹配（场景书）
│   ├── adapters/        # 后端适配器
│   │   ├── llm/         # LLM（OpenAI 兼容）
│   │   └── image/       # 生图（ComfyUI）
│   ├── data/            # 默认值 + Provider 定义
│   ├── components/      # UI 组件
│   ├── pages/           # 页面
│   ├── db/              # Dexie.js 数据库
│   └── utils/           # 工具函数
├── test-data/           # 测试用渲染预设 JSON
├── SillyTavern-Backup/  # ST 角色卡/世界书测试数据
├── PLAN.md              # 架构方案
├── DESIGN.md            # 数据模型与技术规范
├── DEV_GUIDE.md         # 逐步开发手册
└── STATUS.md            # 开发进度
```

## Prompt Compilation — Three Modes

StoryForge 提供三种 prompt 生成模式，通过项目级开关切换：

### 1. Rules Mode（规则模式）
角色卡 + 场景书 + 渲染预设 → 程序机械编译 prompt。完全可复现，资产驱动。

### 2. LLM-Assisted Mode（LLM 增强模式）
导演 LLM 在生成分镜时，为每个镜头输出 `visualIntent`（视觉意图草案）。程序将其与角色一致性词合并，LLM 负责创意，程序负责收口。

### 3. LLM Prompt Writer Mode（LLM 写手模式）
在分镜生成和 ComfyUI 之间插入一步 LLM 调用。LLM 接收结构化素材（角色 / 场景 / 镜头），输出 60-80 词的聚焦 SD prompt。解决规则模式机械拼接导致的 CLIP 注意力分散问题。

> 核心原则：**LLM 不管硬件参数**。checkpoint / sampler / steps / cfgScale / clipSkip 完全由 RenderPreset 管控。

## Comparison with ST / RisuAI

| 维度 | ST / RisuAI | StoryForge |
|------|-------------|------------|
| 核心输出 | 文本对话 | 图片 / 视频 / 漫画 |
| 角色卡用途 | 控制 LLM 文风/性格 | 控制视觉一致性 |
| 世界书用途 | 注入知识/设定到 LLM | 注入场景描述到生图 prompt |
| Prompt 流向 | 全部发给 LLM | 双路：LLM（意图）+ 生图 API（视觉） |
| 一致性手段 | 变量 + 上下文 | 参考图 + LoRA + seed + ControlNet |
| 插件生态 | 文本处理 / RAG / TTS | 生图 / 生视频 / 配音后端 |

## Design Decisions

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-03-15 | 借鉴 ST/RisuAI 架构 | 提示词控制和扩展性行业最佳 |
| 2026-03-15 | 双路 Prompt 架构 | LLM 理解意图 + 生图 API 生成视觉，各自独立 |
| 2026-03-15 | 本地优先 + 轻量后端 | 类似 ST 模式，低部署门槛，保护数据 |
| 2026-03-17 | 资产层与执行层分离 | 角色卡/场景书/预设负责复用，执行快照服务复现 |
| 2026-03-17 | SceneEntry 三路分层 | 彻底解决非视觉文本进入 CLIP 的问题 |
| 2026-03-18 | LLM Prompt Writer | 机械拼接 250 词 prompt 效果差，LLM 写手聚焦 60-80 词 |
| 2026-03-18 | RenderPreset 独立于 DirectorPreset | "怎么拍故事"和"怎么炼图"职责分离 |

## Roadmap

- **Phase 4** — 生视频适配器（Kling / Runway）、配音（Fish-TTS / ChatTTS）、字幕、时间轴编排、导出（MP4 / 漫画 PDF）
- **Phase 5** — 插件 SDK、角色卡/场景书分享格式（`.storyforge`）、社区市场

## Acknowledgements

- [SillyTavern](https://github.com/SillyTavern/SillyTavern) — 角色卡、世界书、提示词管理的架构灵感
- [RisuAI](https://github.com/kwaroran/RisuAI) — 数据驱动的多 Provider 配置、模块化设计
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — 生图后端

## License

[MIT](LICENSE)
