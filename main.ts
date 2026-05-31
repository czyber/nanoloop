import { OpenAI } from "openai";

import * as dotenv from "dotenv";

dotenv.config()

const client = new OpenAI();

async function main() {
    const response = await client.chat.completions.create({
        messages: [{ role: "user", content: "Say this is a test" }],
        model: "gpt-3.5-turbo",
    });

    console.log(response.choices[0]?.message.content);
}

main().catch(console.error);