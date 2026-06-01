import { OpenAI } from "openai";

import * as dotenv from "dotenv";
import { ResponseInputItem } from "openai/resources/responses/responses.mjs";
import { isToolCall } from "./utils";
import {handleToolCall, tools} from "./tools";
dotenv.config()

const client = new OpenAI();

const MODEL = "gpt-5.4-mini"

let input: Array<ResponseInputItem> = [
    { role: "user", content: "Hello there! What is my horoscope, I am a Virgo!" },
]

async function main() {
    let response = await client.responses.create({
        model: MODEL,
        input,
        tools
    });
    const toolOutputs: Array<ResponseInputItem> = [];
    for (const item of response.output) {
        if (!isToolCall(item)) continue;

        const toolOutput = handleToolCall(item);
        toolOutputs.push(toolOutput);

    }
    if (toolOutputs.length) {
        response = await client.responses.create({
            model: MODEL,
            tools: tools,
            input: toolOutputs,
            previous_response_id: response.id
        })
    }
    console.log(response.output_text)



}

main().catch(console.error);