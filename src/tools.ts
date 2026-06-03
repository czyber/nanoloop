import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { createTwoFilesPatch } from "diff";
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

function countOccurences(text: string, search: string): number {
  if (search.length === 0) {
    return 0;
  }
  return text.split(search).length - 1;
}

async function editFileTool(
  workspaceRoot: string,
  path: string,
  oldSnippet: string,
  newSnippet: string,
): Promise<string> {
  const filePath = resolveWorkspacePath(workspaceRoot, path);
  const before = await readFile(filePath, "utf-8");
  const occurences = countOccurences(before, oldSnippet);

  if (occurences === 0) {
    throw new Error(`Snippet to be replaced not found in ${filePath}`);
  }

  if (occurences > 1) {
    throw new Error(
      `Multiple occurences of the snippet to be replaced were found in ${filePath}. Choose a more specific snippet.`,
    );
  }

  const after = before.replace(oldSnippet, newSnippet);
  const diff = createTwoFilesPatch(filePath, filePath, before, after, "before", "after");
  await writeFile(filePath, after, "utf-8");
  return JSON.stringify(diff);
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
      description: "Read the contents of a file.",
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

  registry.register({
    definition: {
      type: "function",
      name: "edit_file",
      description: "Edit the contents of a file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the file to edit.",
          },
          oldSnippet: {
            type: "string",
            description: "The snippet that should be replaced.",
          },
          newSnippet: {
            type: "string",
            description: "The content of the new snippet. For deletion pass an empty string",
          },
        },
        required: ["path", "oldSnippet", "newSnippet"],
        additionalProperties: false,
      },
      strict: true,
    },
    run: async (input) => {
      const { path, oldSnippet, newSnippet } = input as { path: string; oldSnippet: string; newSnippet: string };
      return await editFileTool(workspaceRoot, path, oldSnippet, newSnippet);
    },
  });
  return registry;
}
