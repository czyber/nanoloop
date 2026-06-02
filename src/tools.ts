import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type {
  FunctionTool,
  ResponseFunctionToolCall,
  ResponseInputItem,
} from "openai/resources/responses/responses.mjs";

type ToolHandler = {
  definition: FunctionTool;
  run: (args: unknown) => string | Promise<string>;
};

function resolveWorkspacePath(workspaceRoot: string, path: string): string {
  const resolvedRoot = resolve(workspaceRoot);
  const resolvedPath = resolve(resolvedRoot, path);
  const relativePath = relative(resolvedRoot, resolvedPath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Path escapes workspace ${path}`);
  }

  return resolvedPath;
}

async function readFileTool(workspaceRoot: string, path: string): Promise<string> {
  const filePath = resolveWorkspacePath(workspaceRoot, path);
  return await readFile(filePath, "utf-8");
}

export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();

  register(toolHandler: ToolHandler): void {
    if (this.tools.has(toolHandler.definition.name)) {
      throw new Error(`Tool ${toolHandler.definition.name} already registered.`);
    }
    this.tools.set(toolHandler.definition.name, toolHandler);
  }

  definitions(): FunctionTool[] {
    return Array.from(this.tools.values(), (toolHandler) => toolHandler.definition);
  }

  async handleToolCall(toolCall: ResponseFunctionToolCall): Promise<ResponseInputItem.FunctionCallOutput> {
    const tool = this.tools.get(toolCall.name);
    if (!tool) {
      throw new Error(`Invalid tool call: ${toolCall.name}`);
    }

    const args = JSON.parse(toolCall.arguments);
    const output = await tool.run(args);
    return {
      type: "function_call_output",
      call_id: toolCall.call_id,
      output,
    };
  }
}

export function createDefaultTools(workspaceRoot: string): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register({
    definition: {
      type: "function",
      name: "read_file",
      description: "Read the contents of a file/path.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the file to read.",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      strict: true,
    },
    run: async (input) => {
      const { path } = input as { path: string }; // TODO: Tidy this typing, probably introduce some kind of readFileToolArgs

      return await readFileTool(workspaceRoot, path);
    },
  });
  return registry;
}
