import { FunctionTool, ResponseFunctionToolCall, ResponseInputItem } from "openai/resources/responses/responses.mjs";
type ToolHandler = {
    definition: FunctionTool,
    run: (args: any) => string | Promise<string>

}


function getHoroscope({ sign }: {sign: string}) {
        return `${sign}: you will befriend a baby otter.`;
}

const toolRegistry = {
    get_horoscope: {
        definition: {
            type: "function",
            name: "get_horoscope",
            description: "Get today's horoscope for an astrological sign.",
            parameters: {
                type: "object",
                properties: {
                    sign: {
                        type: "string",
                        description: "An astrological sign like Taurus or Aquarius",
                    }
                },
                required: ["sign"],
                additionalProperties: false
            },
            strict: true
        },
    run: getHoroscope
    }
} satisfies Record<string, ToolHandler>

function handleToolCall(toolCall: ResponseFunctionToolCall): ResponseInputItem.FunctionCallOutput {
    const tool = toolRegistry[toolCall.name as keyof typeof toolRegistry]
    if (!tool) {
        throw new Error(`Invalid tool call: ${toolCall.name}`);
    }
    const args = JSON.parse(toolCall.arguments);
    const output = tool.run(args);
    return {
        type: "function_call_output",
        call_id: toolCall.call_id,
        output
    }
}

const tools = Object.values(toolRegistry).map((toolHandler: ToolHandler) => toolHandler.definition);


export {
    handleToolCall,
    tools
};
