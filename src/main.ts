import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import * as dotenv from "dotenv";
import { OpenAI } from "openai";
import type { FunctionTool, ResponseFunctionToolCall } from "openai/resources/responses/responses.mjs";
import { createDefaultTools } from "./tools";
import { handleToolCall, type ToolMap, type ToolOutput, toolDefinitions } from "./tools/registry";
import { isToolCall } from "./utils";

dotenv.config();

const client = new OpenAI();
const MODEL = "gpt-5.4-mini";
const MAX_TOOL_TURNS = 8;

type Agent = {
  tools: ToolMap;
  toolDefinitions: FunctionTool[];
  previousResponseId?: string;
};

type UserInput = {
  role: "user";
  content: string;
};

type TurnInput = Array<UserInput | ToolOutput>;

function createAgent(workspaceRoot: string): Agent {
  const tools = createDefaultTools(workspaceRoot);

  return {
    tools,
    toolDefinitions: toolDefinitions(tools),
  };
}

// Start reading here: this is the command-line loop for the agent.
async function mainLoop(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const agent = createAgent(process.cwd());

  try {
    while (true) {
      const userInput = await rl.question("> ");
      console.log(await runOneUserTurn(agent, userInput));
    }
  } finally {
    rl.close();
  }
}

async function runOneUserTurn(agent: Agent, userInput: string): Promise<string> {
  let turnInput: TurnInput = [{ role: "user", content: userInput }];

  for (let turn = 0; turn < MAX_TOOL_TURNS; ++turn) {
    const response = await client.responses.create({
      model: MODEL,
      input: turnInput,
      tools: agent.toolDefinitions,
      previous_response_id: agent.previousResponseId,
    });

    agent.previousResponseId = response.id;

    const toolCalls = response.output.filter(isToolCall);
    if (toolCalls.length === 0) {
      return response.output_text;
    }

    turnInput = await runToolCalls(agent.tools, toolCalls);
  }

  throw new Error(`Exceeded max tool turns ${MAX_TOOL_TURNS}`);
}

async function runToolCalls(tools: ToolMap, toolCalls: ResponseFunctionToolCall[]): Promise<ToolOutput[]> {
  const toolOutputs: ToolOutput[] = [];

  for (const toolCall of toolCalls) {
    toolOutputs.push(await handleToolCall(tools, toolCall));
  }

  return toolOutputs;
}

async function main() {
  await mainLoop();
}

main().catch(console.error);
