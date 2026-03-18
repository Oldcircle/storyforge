import { create } from "zustand";
import { db } from "../db";
import { createBuiltinTxt2imgTemplate } from "../data/defaults";
import type { WorkflowTemplate } from "../types/workflow-template";

type WorkflowTemplateStore = {
  workflowTemplates: WorkflowTemplate[];
  selected: WorkflowTemplate | null;
  loadAll: () => Promise<void>;
  select: (id: string) => Promise<void>;
};

function getBuiltinTemplates(): WorkflowTemplate[] {
  return [createBuiltinTxt2imgTemplate()];
}

export const useWorkflowTemplateStore = create<WorkflowTemplateStore>((set) => ({
  workflowTemplates: [],
  selected: null,

  loadAll: async () => {
    const customTemplates = await db.workflowTemplates.orderBy("updatedAt").reverse().toArray();
    set({
      workflowTemplates: [...getBuiltinTemplates(), ...customTemplates]
    });
  },

  select: async (id) => {
    const builtin = getBuiltinTemplates().find((template) => template.id === id);
    if (builtin) {
      set({ selected: builtin });
      return;
    }

    const template = await db.workflowTemplates.get(id);
    set({ selected: template ?? null });
  }
}));
