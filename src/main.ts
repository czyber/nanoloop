import * as dotenv from "dotenv";
import { OpenAI } from "openai";
import type { ResponseInputItem } from "openai/resources/responses/responses.mjs";
import { createDefaultTools } from "./tools";
import { isToolCall } from "./utils";

dotenv.config();

const client = new OpenAI();
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

const MODEL = "gpt-5.4-mini";

let inputs: Array<ResponseInputItem> = [];

async function run(maxTurns = 8): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const workspaceRoot = process.cwd();
  const toolRegistry = createDefaultTools(workspaceRoot);
  try {
    while (true) {
      const userInput = await rl.question("> ");
      inputs.push({ role: "user", content: userInput });

      let previous_response_id: string | undefined;
      let completed = false;
      for (let turn = 0; turn < maxTurns; ++turn) {
        const response = await client.responses.create({
          model: MODEL,
          input: inputs,
          tools: toolRegistry.definitions(),
          previous_response_id,
        });
        const toolOutputs: Array<ResponseInputItem> = await Promise.all(
          response.output.filter(isToolCall).map((toolCall) => toolRegistry.handleToolCall(toolCall)),
        );
        if (toolOutputs.length === 0) {
          console.log(response.output_text);
          completed = true;
          break;
        }
        inputs = toolOutputs;
        previous_response_id = response.id;
      }
      if (!completed) {
        throw new Error(`Exceeded max tool turns ${maxTurns}`);
      }
    }
  } finally {
    rl.close();
  }
}

async function main() {
  await run();
}

main().catch(console.error);
