# nanoloop

nanoloop is a tiny educational coding agent.

It exists to teach one idea clearly: how a language model can use tools in a loop.

```txt
user asks for something
  -> model replies with text or tool calls
  -> nanoloop runs those tools
  -> tool results go back to the model
  -> repeat until the model gives a final answer
```

That loop is one of the central ideas behind tools like Codex, Claude Code, Cursor agents, and other
agentic coding tools. nanoloop is not an implementation of those products. It is a small, readable
example of the core mechanism they build much larger systems around.

## Start Here

The project entrypoint is [src/main.ts](src/main.ts).

Read it in this order:

- `mainLoop`: reads user input and prints answers
- `runOneUserTurn`: runs the model-tool loop for one user message
- `runToolCalls`: executes the tool calls one at a time
- `createAgent`: creates the tools and keeps conversation state

## What This Really Is

nanoloop is:

- a learning project
- a minimal command-line coding agent
- a concrete example of model -> tool call -> tool result -> next model call
- a place to experiment with simple tools such as reading files, editing files, and running shell commands

nanoloop is not:

- a production coding agent
- a replacement for Codex, Claude Code, Cursor, or similar tools
- a secure sandbox
- a complete agent architecture
- a best-practices template for production automation

The code intentionally avoids a lot of machinery that real products need. The point is to make the loop
small enough to read and modify.

## What It Can Do

The current agent has four tools:

- `read_file`: read a file inside the current workspace
- `write_file`: create or overwrite a complete file
- `edit_file`: replace one exact snippet in a file
- `run_command`: run a shell command in the current workspace

These tools are intentionally plain. Their definitions show the JSON schema the model sees, and their
implementations show the local code that runs when the model asks for a tool.

`write_file` and `edit_file` are both useful, but they teach different editing styles. `write_file` is
best for new files or whole-file rewrites. `edit_file` is best for small targeted changes where the
existing surrounding code should stay untouched.

## Safety Note

nanoloop can edit files and run shell commands.

Run it only in a workspace you are comfortable changing. For learning, use a small test repo or a
temporary directory. It does not provide the approval flows, sandboxing, permission controls, or recovery
features that professional coding agents usually have.

## Setup

Install dependencies:

```sh
pnpm install
```

Create a local environment file:

```sh
cp .env.example .env
```

Set your OpenAI API key in `.env`:

```txt
OPENAI_API_KEY=your_api_key_here
```

Start the agent from the directory you want it to work in:

```sh
pnpm start
```

Then type a request:

```txt
> read package.json and summarize the project
```

## Code Tour

- [src/main.ts](src/main.ts): the agent loop and command-line prompt
- [src/tools/index.ts](src/tools/index.ts): the plain map of available tools
- [src/tools/registry.ts](src/tools/registry.ts): shared tool-call helpers
- [src/tools/read-file.ts](src/tools/read-file.ts): file-reading tool
- [src/tools/write-file.ts](src/tools/write-file.ts): whole-file writing tool
- [src/tools/edit-file.ts](src/tools/edit-file.ts): exact-snippet file editing tool
- [src/tools/run_command.ts](src/tools/run_command.ts): shell command tool
- [docs/building_notes.md](docs/building_notes.md): notes about the tool-call structure

If you only read one file, read [src/main.ts](src/main.ts).

## What Real Coding Agents Add

Real tools build a lot around this simple loop:

- larger system prompts and instruction layers
- repository search and context selection
- patch application and review flows
- sandboxing and command approval
- long-running command handling
- tool error recovery
- git integration
- streaming user interfaces
- context compaction
- plugin or MCP tool ecosystems
- product-specific safety and policy logic

nanoloop leaves most of that out on purpose. Once the basic loop is clear, those features are easier to
understand as additions instead of mysteries.

## Development

Run the type checker:

```sh
pnpm typecheck
```

Run formatting and lint checks:

```sh
pnpm check
```

The test script currently runs the type checker:

```sh
pnpm test
```
