import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Dynamically load keys from a comma-separated string (e.g., GEMINI_API_KEYS="key1,key2,key3")
const getApiKeys = () => {
  if (process.env.GEMINI_API_KEYS) {
    const keys = process.env.GEMINI_API_KEYS.split(',').map(key => key.trim()).filter(Boolean);
    if (keys.length > 0) return keys;
  }
  
  const numberedKeys = Object.keys(process.env)
    .filter((key) => key.startsWith("GEMINI_API_KEY"))
    .map((key) => process.env[key])
    .filter(Boolean);
  
  return numberedKeys.length > 0 ? numberedKeys : null;
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

/**
 * THE USER'S GENIUS IDEA: DYNAMIC MODEL DISCOVERY
 * Asks Google's API for the live list of models this key can access, 
 * and automatically picks the newest/best "flash" model available.
 */
const getBestDynamicModel = async (apiKey) => {
  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    // Filter the live list for models that generate content, are fast ("flash"), and aren't experimental/tuning models
    const availableFlashModels = response.data.models
      .map(m => m.name.replace('models/', ''))
      .filter(name => name.includes('flash') && !name.includes('vision') && !name.includes('tuning'));
    
    if (availableFlashModels.length > 0) {
      // Sort alphabetically descending so newer versions (gemini-2.0) are picked before older ones (gemini-1.5)
      const bestModel = availableFlashModels.sort().reverse()[0];
      console.log(`🧠 [AI Engine] Dynamically selected best available model: ${bestModel}`);
      return bestModel;
    }
  } catch (error) {
    console.warn("⚠️ [AI Engine] Dynamic discovery failed. Reverting to rock-solid default.");
  }
  
  // The ultimate safe fallback if the live-fetch fails
  return "gemini-1.5-flash"; 
};

const SYSTEM_PROMPT = `
You are a highly perceptive, expert AI profiling analyst. Your task is to dynamically evaluate a creator's vibe, aesthetics, demographics, and overall engagement based on visual evidence from their Reel thumbnail and provided metadata.

CRITICAL FILTERING TASK (accountType):
You must determine if this specific username/profile belongs to a Female, a Male, or a Brand/Company (e.g., meme pages, businesses, products, theme pages).

Do not force the data into unnatural assumptions. If the visual or textual evidence leans a certain way, trust your dynamic analysis. 

ENGAGEMENT & STATS INSTRUCTIONS:
- Look for the "[SYSTEM - Deep Scrape Data]" block in the prompt (if provided). 
- Use this block to extract the exact true username (without spaces) and the exact integers for Followers, Views, Likes, and Comments. 
- If the deep scrape data is missing, estimate based on caption context, or return 0. Convert strings like "1.5M" to raw integers (1500000).

You MUST return a valid JSON object matching this exact schema:
{
  "username": "exact_handle_without_spaces",
  "accountType": { "value": "String (Female, Male, or Brand)", "confidence": 0.0 to 1.0 },
  "totalFollowers": 0,
  "avgViewsPerWeek": 0,
  "avgLikes": 0,
  "avgComments": 0,
  "nation": { "value": "String (e.g., USA, India, UK)", "confidence": 0.0 to 1.0 },
  "skinTone": { "value": "String (e.g., Fair, Tan, Dark)", "confidence": 0.0 to 1.0 },
  "bodyType": { "value": "String (e.g., Fit, Slim, Fat, Curvy)", "confidence": 0.0 to 1.0 },
  "reelType": { "value": "String (e.g., Hot, Erotic, Beautiful, Dance, Fitness)", "confidence": 0.0 to 1.0 },
  "specialPart": { "value": "String (e.g., Breast, Face, Whole body, null if none)", "confidence": 0.0 to 1.0 },
  "ageRange": { "value": "String (e.g., 18 to 28, 29 to 35, 36+)", "confidence": 0.0 to 1.0 },
  "aiSuggestions": ["String array of 1-3 highly dynamic, perceptive insights about the creator's style, aesthetic, or audience appeal"]
}

Rules:
1. If you are uncertain about a demographic attribute (confidence < 0.60), set its value to null rather than guessing blindly.
2. Return ONLY the raw JSON object. Do not include markdown formatting like \`\`\`json.
`;

export const analyzeReelMedia = async ({ videoUrl, thumbnailUrl, caption, username }) => {
  const apiKeys = getApiKeys();

  if (!apiKeys) {
    throw new Error("No Gemini API keys found. Please add GEMINI_API_KEYS to your .env file.");
  }

  const imagePart = await fetchImageAsBase64(thumbnailUrl);
  
  const contentPrompt = `
    Provided Display Name/Title: ${username || "Unknown"}
    Caption & Extracted Metadata: 
    ${caption || "No caption provided."}
    
    Dynamically analyze the visual and textual data to classify the account type (Female, Male, Brand), determine the clean handle, engagement metrics, and profile attributes.
  `;

  const requestContents = imagePart 
    ? [contentPrompt, imagePart] 
    : [contentPrompt];

  // Key-Rotation Cascade
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const currentKey = apiKeys[keyIndex];
    
    // Dynamically figure out what the best model for this specific key is right now
    const targetModel = await getBestDynamicModel(currentKey);
    
    const ai = new GoogleGenAI({ apiKey: currentKey });

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: requestContents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.4 
        }
      });

      let responseText = response.text;
      
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedJson = JSON.parse(responseText);

      return parsedJson;

    } catch (error) {
      const isRateLimit = error.status === 429 || error.message?.includes("429") || error.message?.includes("quota");
      
      console.warn(`⚠️ [AI Engine] Key ${keyIndex + 1} | Model ${targetModel} failed: ${error.message}`);

      // If the key is exhausted, loop to the next key. If this was the last key, it throws the error below.
      if (isRateLimit) {
        console.warn(`🔄 [AI Engine] Quota exhausted for Key ${keyIndex + 1}. Rotating to next API Key...`);
        continue; 
      }
      
      // If it's a random crash (not a quota issue), we can throw so the stagingController marks it "Failed. Retry?"
      throw error; 
    }
  }

  throw new Error("All API keys exhausted or rate-limited. Please check your Google Cloud quotas.");
};