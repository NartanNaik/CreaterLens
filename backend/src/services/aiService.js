import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Dynamically load keys from all providers into a unified rotation fleet
const getApiKeys = () => {
  const providers = [];

  // 1. Gemini Keys (Prioritized)
  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(',').map(key => key.trim()).filter(Boolean)
      .forEach(key => providers.push({ type: 'gemini', key }));
  } else {
    Object.keys(process.env).filter((key) => key.startsWith("GEMINI_API_KEY")).forEach((key) => {
      if (process.env[key]) providers.push({ type: 'gemini', key: process.env[key] });
    });
  }

  // 2. Groq Keys
  if (process.env.GROQ_API_KEYS) {
    process.env.GROQ_API_KEYS.split(',').map(key => key.trim()).filter(Boolean)
      .forEach(key => providers.push({ type: 'groq', key }));
  } else {
    Object.keys(process.env).filter((key) => key.startsWith("GROQ_API_KEY")).forEach((key) => {
      if (process.env[key]) providers.push({ type: 'groq', key: process.env[key] });
    });
  }

  // 3. OpenRouter Keys
  if (process.env.OPENROUTER_API_KEYS) {
    process.env.OPENROUTER_API_KEYS.split(',').map(key => key.trim()).filter(Boolean)
      .forEach(key => providers.push({ type: 'openrouter', key }));
  } else {
    Object.keys(process.env).filter((key) => key.startsWith("OPENROUTER_API_KEY")).forEach((key) => {
      if (process.env[key]) providers.push({ type: 'openrouter', key: process.env[key] });
    });
  }

  // 4. Pollinations Key
  if (process.env.POLLINATIONS_API_KEY) {
    providers.push({ type: 'pollinations', key: process.env.POLLINATIONS_API_KEY });
  }

  return providers.length > 0 ? providers : null;
};

// Helper to fetch the image and return both Gemini format AND standard OpenAI base64 format
const fetchImageAsBase64 = async (imageUrl) => {
  if (!imageUrl) return null;
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 5000 });
    const buffer = Buffer.from(response.data, "binary");
    const mimeType = response.headers["content-type"] || "image/jpeg";
    const base64Data = buffer.toString("base64");
    
    return {
      geminiFormat: {
        inlineData: {
          data: base64Data,
          mimeType
        }
      },
      openAiFormat: `data:${mimeType};base64,${base64Data}`
    };
  } catch (error) {
    console.warn("⚠️ Failed to fetch thumbnail for AI analysis, proceeding with text only.");
    return null;
  }
};

const getBestDynamicModel = async (apiKey) => {
  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const availableFlashModels = response.data.models
      .map(m => m.name.replace('models/', ''))
      .filter(name => name.includes('flash') && !name.includes('vision') && !name.includes('tuning'));
    
    if (availableFlashModels.length > 0) {
      const bestModel = availableFlashModels.sort().reverse()[0];
      return bestModel;
    }
  } catch (error) {
    console.warn("⚠️ [AI Engine] Dynamic discovery failed for Gemini. Reverting to default.");
  }
  return "gemini-1.5-flash"; 
};

// Universal OpenAI-compatible Caller for Groq, OpenRouter, and Pollinations
const callOpenAICompatible = async (provider, textPrompt, imagePartBase64) => {
  let url = "";
  let model = "";
  let headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${provider.key}`
  };

  // Configure endpoints and assign the best free vision models per provider
  if (provider.type === "groq") {
    url = "https://api.groq.com/openai/v1/chat/completions";
    model = "llama-3.2-90b-vision-preview"; // Groq's blazing fast Llama 3.2 Vision
  } else if (provider.type === "openrouter") {
    url = "https://openrouter.ai/api/v1/chat/completions";
    model = "qwen/qwen-2.5-vl-72b-instruct:free"; // Extremely powerful free vision model on OpenRouter
    headers["HTTP-Referer"] = "https://creatorlens.local"; 
    headers["X-Title"] = "CreatorLens Pipeline";
  } else if (provider.type === "pollinations") {
    url = "https://text.pollinations.ai/openai/chat/completions";
    model = "openai"; 
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: [{ type: "text", text: textPrompt }] }
  ];

  if (imagePartBase64) {
    messages[1].content.push({
      type: "image_url",
      image_url: { url: imagePartBase64 }
    });
  }

  const response = await axios.post(url, {
    model: model,
    messages: messages,
    response_format: { type: "json_object" },
    temperature: 0.4
  }, { headers, timeout: 30000 });

  let responseText = response.data.choices[0].message.content;
  responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(responseText);
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
    throw new Error("No API keys found. Please add GEMINI, GROQ, OPENROUTER, or POLLINATIONS keys to your .env file.");
  }

  const imagePart = await fetchImageAsBase64(thumbnailUrl);
  
  const contentPrompt = `
    Provided Display Name/Title: ${username || "Unknown"}
    Caption & Extracted Metadata: 
    ${caption || "No caption provided."}
    
    Dynamically analyze the visual and textual data to classify the account type (Female, Male, Brand), determine the clean handle, engagement metrics, and profile attributes.
  `;

  // Key-Rotation Cascade across ALL providers
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const provider = apiKeys[keyIndex];
    
    try {
      if (provider.type === 'gemini') {
        const targetModel = await getBestDynamicModel(provider.key);
        console.log(`🧠 [AI Engine] Trying Gemini Model: ${targetModel}`);
        
        const ai = new GoogleGenAI({ apiKey: provider.key });
        const requestContents = imagePart ? [contentPrompt, imagePart.geminiFormat] : [contentPrompt];
        
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
        return JSON.parse(responseText);

      } else {
        console.log(`🧠 [AI Engine] Trying ${provider.type.toUpperCase()} Model...`);
        return await callOpenAICompatible(provider, contentPrompt, imagePart ? imagePart.openAiFormat : null);
      }

    } catch (error) {
      const isRateLimit = error.status === 429 || error.message?.includes("429") || error.message?.includes("quota") || error.response?.status === 429;
      
      console.warn(`⚠️ [AI Engine] ${provider.type.toUpperCase()} Provider failed: ${error.message}`);

      if (isRateLimit) {
        console.warn(`🔄 [AI Engine] Quota exhausted for ${provider.type}. Rotating to next provider...`);
        continue; 
      }
      
      // If a specific provider model rejects the vision payload, rotate gracefully
      if (error.response?.status === 400 || error.message?.includes("vision")) {
        console.warn(`🔄 [AI Engine] Model compatibility issue with ${provider.type}. Rotating...`);
        continue;
      }
      
      // If it's a random crash and it's the absolute last key in your fleet, throw it back to the queue
      if (keyIndex === apiKeys.length - 1) {
        throw error; 
      }
    }
  }

  throw new Error("All API providers exhausted or rate-limited. The cascade is empty.");
};