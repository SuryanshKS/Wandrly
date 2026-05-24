import { GoogleGenerativeAI } from "@google/generative-ai";

//initialise the SDK using key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * A reusable engine to call the LLM and strictly return a JSON object.
 * @param {string} systemPrompt - The rules the AI must follow.
 * @param {string} userContext - The raw itinerary/weather data.
 */

// export const generativeStructuredAIResponse = async (systemPrompt, userContext) => {

//     try {
//         //we use flash as its fast and handles JSON perfectly
//         const model = genAI.getGenerativeModel({
//             model: "gemini-2.5-flash",
//             tools: [{ googleSearch: {} }], // NEW: Enables real-time map/search grounding!
//             generationConfig: {
//                 responseMimeType: "application/json",
//             }
//         });

//         const fullPrompt = `${systemPrompt}\n\nHere is the contextual data:\n${userContext}`;

//         const result = await model.generateContent(fullPrompt);
//         const textResponse = result.response.text();

//         // Parse the AI's string response directly into a JavaScript Object
//         return JSON.parse(textResponse);
//     }
//     catch (error) {
//         console.error("LLM Generation Error:", error);

//         // Pass the real error up the chain so controllers can read 429/503 statuses
//         throw error;
//     }
// };

export const generativeStructuredAIResponse = async (systemPrompt, userContext) => {
    try {
        // Initialize the model WITH grounding, but WITHOUT the strict JSON mime type
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: [{ googleSearch: {} }]
        });

        const fullPrompt = `${systemPrompt}\n\nHere is the contextual data:\n${userContext}\n\nCRITICAL: Respond ONLY with the raw JSON object. Do not include markdown formatting, code blocks, or conversational text.`;

        const result = await model.generateContent(fullPrompt);
        let textResponse = result.response.text();

        // Fallback: Strip markdown code blocks just in case Gemini still wraps it
        textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();

        try {
            // 2. Try to parse the cleaned string
            const parsedData = JSON.parse(textResponse);
            return parsedData;
        } catch (error) {
            // 3. Ultimate fallback: Extract whatever is between the first {/[ and last }/]
            const jsonMatch = textResponse.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Could not extract valid JSON from AI response.");
            }
        }
        // Parse the cleaned string directly into a JavaScript Object
        // return JSON.parse(textResponse);
    }
    catch (error) {
        console.error("LLM Generation Error:", error);
        throw error;
    }
};