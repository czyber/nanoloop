import { OpenAI } from "openai";

import * as dotenv from "dotenv";
import { Tool } from "openai/resources/responses/responses.js";
import { ResponseCreateParamsBase, ResponseInput, ResponseInputItem } from "openai/resources/responses/responses.mjs";
import { isToolCall } from "./utils";
dotenv.config()

const client = new OpenAI();
const done = false;

const SYSTEM_PROMPT = "Hello, You are a helpful assistant."
const MODEL = "gpt-5.4-mini"
const tools: Array<Tool> = [
    {
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
];

function getHoroscope(sign: string) {
    return `${sign}: you will befriend a baby otter.`
}

let input: Array<ResponseInputItem> = [
    { role: "user", content: "What is my horoscope, I am a Virgo!" },
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

        if (item.name === "get_horoscope") {
            const { sign } = JSON.parse(item.arguments);
            const horoscope = getHoroscope(sign);
            toolOutputs.push({
                type: "function_call_output",
                call_id: item.call_id,
                output: horoscope
            })
            response = await client.responses.create({
                model: MODEL,
                tools: tools,
                input: toolOutputs,
                previous_response_id: response.id
            })
        }
    }
    console.log(response.output_text)



}

main().catch(console.error);