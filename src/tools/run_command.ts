import { spawn } from "node:child_process";
import type { ToolHandler } from "./registry";

export async function runCommandTool(workspaceRoot: string, command: string): Promise<string> {
  // TODO: In the future we would also like to return stderr, exitCode
  // TODO: Maybe use execa to simplify this? Got some problems with it initially so for now this is the solution
  return await new Promise((resolve, reject) => {
    const childProcess = spawn(command, { cwd: workspaceRoot, shell: true });
    let stdout = "";

    const timeout = setTimeout(() => {
      childProcess.kill();
      reject(new Error("Command timed out"));
    }, 60_000);

    childProcess.stdout.setEncoding("utf-8");
    childProcess.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    childProcess.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    childProcess.on("close", () => {
      clearTimeout(timeout);
      resolve(stdout);
    });
  });
}

export function createRunCommandTool(workspaceRoot: string): ToolHandler {
  return {
    definition: {
      type: "function",
      name: "run_command",
      description: "Run a bash command.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to be run.",
          },
        },
        required: ["command"],
        additionalProperties: false,
      },
      strict: true,
    },
    run: async (input) => {
      const { command } = input as { command: string }; // TODO: Tidy this typing, probably introduce some kind of runCommandToolArgs

      return await runCommandTool(workspaceRoot, command);
    },
  };
}
