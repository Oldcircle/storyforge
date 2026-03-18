export interface DirectorPreset {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;

  /** LLM 采样参数（对应 ST 预设的 API 参数区） */
  llm: {
    adapter: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
  };

  /** 导演系统提示词（对应 ST 的 main prompt） */
  systemPrompt: string;
  /** 分镜输出 JSON Schema */
  storyboardSchema: string;

  /** 默认生图适配器选择（仅选择，不配生图参数） */
  defaultImageAdapter: string;

  /** Prompt 组装模板 */
  promptTemplates: {
    characterTemplate: string;
    sceneTemplate: string;
    finalTemplate: string;
  };

  /**
   * @deprecated 历史遗留，生图参数已迁移到 RenderPreset。
   * 保留字段用于向后兼容旧数据，新代码不应读取此字段。
   */
  visualStyle?: {
    defaultImageAdapter?: string;
    steps?: number;
    cfgScale?: number;
    sampler?: string;
    checkpoint?: string;
    width?: number;
    height?: number;
    clipSkip?: number;
  };
}
