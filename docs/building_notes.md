# Add Initial Tool Call

Current state: basic tool definitions exist, but `handleToolCall` is not implemented yet.

## Tool Dispatch Direction

Keep two related concepts separate:

- OpenAI-facing tool definition: JSON schema, description, name, strict mode.
- App-facing tool implementation: runtime argument validation and the function to execute.

Use a registry keyed by tool name, then derive the OpenAI `tools` array from that registry. This keeps dispatch generic:

```ts
const tool = toolRegistry[toolCall.name];
const rawArgs = JSON.parse(toolCall.arguments);
const output = await tool.execute(rawArgs);
```

Do not call handlers generically with `fn(...Object.values(args))`. Tool arguments are named JSON object fields, so each handler should accept one object argument.

## Zod Argument Validation

Use Zod as the source of truth for tool argument shape:

- Convert the Zod schema to JSON schema for the OpenAI tool definition.
- Parse/validate `JSON.parse(toolCall.arguments)` before running local code.
- Let `z.infer<typeof schema>` type the handler arguments.

Sketch:

```ts
import { z } from "zod";
import type {
    FunctionTool,
    ResponseFunctionToolCall,
} from "openai/resources/responses/responses.mjs";

type RunnableTool = {
    description: string;
    parameters: FunctionTool["parameters"];
    execute: (rawArgs: unknown) => string | Promise<string>;
};

function defineTool<Schema extends z.ZodTypeAny>(config: {
    description: string;
    schema: Schema;
    run: (args: z.infer<Schema>) => string | Promise<string>;
}): RunnableTool {
    return {
        description: config.description,
        parameters: z.toJSONSchema(config.schema),
        execute(rawArgs) {
            const args = config.schema.parse(rawArgs);
            return config.run(args);
        },
    };
}
```

Example registry:

```ts
const toolRegistry = {
    get_horoscope: defineTool({
        description: "Get today's horoscope for an astrological sign.",
        schema: z.object({
            sign: z.string().describe("An astrological sign like Taurus or Aquarius"),
        }),
        run: ({ sign }) => `${sign}: you will befriend a baby otter.`,
    }),
} satisfies Record<string, RunnableTool>;
```

Derive model-facing tools:

```ts
export const tools: FunctionTool[] = Object.entries(toolRegistry).map(
    ([name, tool]) => ({
        type: "function",
        name,
        description: tool.description,
        parameters: tool.parameters,
        strict: true,
    }),
);
```

Implement generic handling:

```ts
export async function handleToolCall(toolCall: ResponseFunctionToolCall) {
    const tool = toolRegistry[toolCall.name];

    if (!tool) {
        throw new Error(`Invalid tool call: ${toolCall.name}`);
    }

    const rawArgs = JSON.parse(toolCall.arguments);
    const output = await tool.execute(rawArgs);

    return {
        type: "function_call_output" as const,
        call_id: toolCall.call_id,
        output,
    };
}
```

Mental model:

```txt
Zod schema
  -> JSON schema for OpenAI
  -> runtime validation for parsed tool arguments
  -> typed args for the local handler
```
