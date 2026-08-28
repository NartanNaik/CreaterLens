import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// The ordered fallback list (Newest/Smartest -> Stable -> Fastest/Cheapest)
const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

// Dynamically load all available API keys from the environment
const getApiKeys = () => {
  const keys = Object.keys(process.env)
    .filter((key) => key.startsWith("GEMINI_API_KEY"))
    .map((key) => process.env[key])
    .filter(Boolean);
  
  return keys.length > 0 ? keys : null;
};

// Helper to fetch the image and convert to Base64 for Gemini Vision
const fetchImageAsBase64 = async (imageUrl) => {
  if (!imageUrl) return null;
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 5000 });
    const buffer = Buffer.from(response.data, "binary");
    const mimeType = response.headers["content-type"] || "image/jpeg";
    return {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType
      }
    };
  } catch (error) {
    console.warn("⚠️ Failed to fetch thumbnail for AI analysis, proceeding with text only.");
    return null;
  }
};

const SYSTEM_PROMPT = `
You are an expert AI profiling assistant. Analyze the provided Instagram Reel thumbnail image, caption, and username.
Extract the demographic and physical attributes based strictly on the visual and text evidence.

You MUST return a valid JSON object matching this exact schema:
{
  "username": "handle",
  "nation": { "value": "String (e.g., USA, India, UK)", "confidence": 0.0 to 1.0 },
  "skinTone": { "value": "String (e.g., Fair, Tan, Dark)", "confidence": 0.0 to 1.0 },
  "bodyType": { "value": "String (e.g., Fit, Slim, Fat, Curvy)", "confidence": 0.0 to 1.0 },
  "reelType": { "value": "String (e.g., Hot, Erotic, Beautiful, Dance, Fitness)", "confidence": 0.0 to 1.0 },
  "specialPart": { "value": "String (e.g., Breast, Face, Whole body, null if none)", "confidence": 0.0 to 1.0 },
  "ageRange": { "value": "String (e.g., 18 to 28, 29 to 35, 36+)", "confidence": 0.0 to 1.0 },
  "aiSuggestions": ["String array of 1-2 brief insights or suggestions based on your analysis"]
}

Rules:
1. If you are uncertain about a field (confidence < 0.70), set its value to null.
2. Return ONLY the raw JSON object. Do not include markdown formatting like \`\`\`json.
`;

export const analyzeReelMedia = async ({ videoUrl, thumbnailUrl, caption, username }) => {
  const apiKeys = getApiKeys();

  if (!apiKeys) {
    throw new Error("No Gemini API keys found. Please add GEMINI_API_KEY_1 to your .env file.");
  }

  const imagePart = await fetchImageAsBase64(thumbnailUrl);
  
  const contentPrompt = `
    Username: ${username || "Unknown"}
    Caption: ${caption || "No caption provided."}
    Analyze the visual and textual data to determine the profile attributes.
  `;

  const requestContents = imagePart 
    ? [contentPrompt, imagePart] 
    : [contentPrompt];

  // The Core Key-Rotation and Model-Fallback Cascade
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const currentKey = apiKeys[keyIndex];
    const ai = new GoogleGenAI({ apiKey: currentKey });

    for (let modelIndex = 0; modelIndex < FALLBACK_MODELS.length; modelIndex++) {
      const currentModel = FALLBACK_MODELS[modelIndex];

      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: requestContents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            temperature: 0.2 // Low temperature for consistent, analytical JSON formatting
          }
        });

        let responseText = response.text;
        
        // Safety cleanup just in case the model returns markdown blocks despite instructions
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const parsedJson = JSON.parse(responseText);

        // If we made it here, the API call was successful. Return the data.
        return parsedJson;

      } catch (error) {
        const isRateLimit = error.status === 429 || error.message?.includes("429") || error.message?.includes("quota");
        
        console.warn(`⚠️ [AI Engine] Key ${keyIndex + 1} | Model ${currentModel} failed: ${error.message}`);

        // If it's a rate limit/quota issue, break out of the model loop and try the next API Key immediately
        if (isRateLimit) {
          console.warn(`🔄 [AI Engine] Quota exhausted for Key ${keyIndex + 1}. Rotating to next API Key...`);
          break; 
        }
        
        // If it's just a model-specific failure (e.g., 500 error), the loop continues to the next fallback model
      }
    }
  }

  // If the code reaches this point, every single key and model combination has failed.
  throw new Error("All API keys and fallback models exhausted. Please check your Google Cloud quotas or manually enter the profile details.");
};