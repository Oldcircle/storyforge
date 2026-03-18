/**
 * WorkflowTemplate — maps a RenderPlan's values into a concrete ComfyUI workflow JSON.
 *
 * Each slot defines which node + input in the workflow JSON receives a value
 * from the RenderPlan. The `template` field holds the full ComfyUI API-format
 * workflow with placeholder values that get overwritten at generation time.
 */

export interface WorkflowSlot {
  /** ComfyUI node ID (string key in the workflow JSON). */
  nodeId: string;
  /** Input field name on that node. */
  inputKey: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  adapter: string;  // "comfyui" | "sdwebui" | ...
  createdAt: number;
  updatedAt: number;

  /** The raw ComfyUI API-format workflow JSON (nodes object). */
  template: Record<string, unknown>;

  /** Slot mapping: render plan field → node/input location. */
  slots: {
    checkpoint?: WorkflowSlot;
    positive?: WorkflowSlot;
    negative?: WorkflowSlot;
    seed?: WorkflowSlot;
    steps?: WorkflowSlot;
    cfgScale?: WorkflowSlot;
    sampler?: WorkflowSlot;
    width?: WorkflowSlot;
    height?: WorkflowSlot;
    clipSkip?: WorkflowSlot;
    batchSize?: WorkflowSlot;
  };

  /** Whether this is a built-in template (not user-editable). */
  builtin?: boolean;
}
