import { OpenAI } from "openai";

import * as dotenv from "dotenv";
import { ResponseInputItem } from "openai/resources/responses/responses.mjs";
import { isToolCall } from "./utils";
import {handleToolCall, tools} from "./tools";
import { ResponsesEmitter } from "openai/resources/responses/internal-base.mjs";
import { Response } from "openai/resources/responses/responses.js";
dotenv.config()

const client = new OpenAI();

const MODEL = "gpt-5.4-mini"

let input: Array<ResponseInputItem> = [
    { role: "user", content: "Hello there! What is my horoscope, I am a Virgo!" },
]

async function run(input: Array<ResponseInputItem>, maxTurns = 8): Promise<Response> {
    let previous_response_id: string | undefined
    for (let turn = 0; turn < maxTurns; ++turn) {
        const response = await client.responses.create({
            model: MODEL,
            input,
            tools,
            previous_response_id
        });
        const toolOutputs: Array<ResponseInputItem> = await Promise.all(response.output.filter(isToolCall).map(handleToolCall))
        if (toolOutputs.length === 0) {
            return response;
        }
        input = toolOutputs;
        previous_response_id = response.id;
    }
    throw new Error(`Exceeded max tool turns ${maxTurns}`);
}

async function main() {
    const response = await run(input);
    console.log(response.output_text);
}

main().catch(console.error);