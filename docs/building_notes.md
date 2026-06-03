# Tool Call Notes

Nanoloop keeps tool calling deliberately small. A tool has two parts:

- OpenAI-facing definition: name, description, JSON schema parameters, and `strict: true`.
- Local implementation: parse the tool call arguments, run code in the workspace, and return a string result.

The tool map is keyed by tool name so dispatch stays generic:

```ts
const tool = tools[toolCall.name];
const args = JSON.parse(toolCall.arguments);
const output = await tool.run(args);
```

Each tool receives one JSON object argument. Avoid generic handler calls such as
`fn(...Object.values(args))`; tool parameters are named fields, and keeping the object intact makes the
contract easier to read.

## Manual Tool Definitions

For this project, write tool schemas directly in the tool file. This is a little repetitive, but it keeps
the educational path clear: learners can see exactly what the model sees.

```ts
{
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
}
```

Runtime code should still treat parsed arguments as untrusted input. The current tools use small local
checks such as `requiredStringArg`; if those checks grow complex, prefer another tiny helper over a schema
abstraction.

## Mental Model

```txt
user asks a question
  -> model chooses text or one or more tool calls
  -> nanoloop runs requested tools one at a time
  -> tool outputs are sent back to the model
  -> loop repeats until the model answers normally
```
