import { OpenAI } from "openai";

import * as dotenv from "dotenv";

dotenv.config()

const client = new OpenAI();
const done = false;

const SYSTEM_PROMPT = "Hello, You are a helpful assistant."

const tools = [
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

let input = [
    {role: "user", content: "What is my horoscope? I'm virgo."},
]

async function main() {
        let response = await client.responses.create({
            model: "gpt-3.5-turbo",
            input,
            tools
        });
        console.log(response.output_text);

        input.push(...response.output)
        for (const item of response.output) {
            if (item.type !== "function_call") continue;

            if (item.name === "get_horoscope") {
                const {sign} = JSON.parse(item.arguments);
                const horoscope = getHoroscope(sign);
                input.push({
                    type: "function_call_output",
                    call_id: item.call_id,
                    output: horoscope
                })
            } 
        }

        response = await client.responses.create({
            model: "gpt-3.5-turbo",
            tools,
            input
        })

        console.log(response.output_text)

}

main().catch(console.error);