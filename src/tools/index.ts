import { createEditFileTool } from "./edit-file";
import { createReadFileTool } from "./read-file";
import { ToolRegistry } from "./registry";
import { createRunCommandTool } from "./run_command";

export function createDefaultTools(workspaceRoot: string): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register(createReadFileTool(workspaceRoot));
  registry.register(createEditFileTool(workspaceRoot));
  registry.register(createRunCommandTool(workspaceRoot));
  return registry;
}
