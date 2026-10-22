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
const callOpenAICompatible = async (provider, textPrompt, systemInstruction, imagePartBase64) => {
  let url = "";
  let model = "";
  let headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${provider.key}`
  };
  
  // Flag to determine if this specific provider tier can handle vision payloads
  let supportsVision = false;

  if (provider.type === "groq") {
    url = "https://api.groq.com/openai/v1/chat/completions";
    model = "llama-3.2-11b-vision-preview"; 
    supportsVision = true;
  } else if (provider.type === "openrouter") {
    url = "https://openrouter.ai/api/v1/chat/completions";
    model = "openrouter/free"; // Often routes to text-only models
    headers["HTTP-Referer"] = "https://creatorlens.local"; 
    headers["X-Title"] = "CreatorLens Pipeline";
    supportsVision = false; 
  } else if (provider.type === "pollinations") {
    url = "https://text.pollinations.ai/openai/chat/completions";
    model = "openai"; 
    supportsVision = false;
  }

  const combinedText = `${systemInstruction}\n\n${textPrompt}`;
  let messages = [];

  // THE FIX: Dynamically build the payload structure based on Vision capability
  if (supportsVision && imagePartBase64) {
    messages = [
      { 
        role: "user", 
        content: [
          { type: "text", text: combinedText },
          { type: "image_url", image_url: { url: imagePartBase64 } }
        ] 
      }
    ];
  } else {
    // Standard text-only string format to prevent 400 Bad Request crashes
    messages = [
      { 
        role: "user", 
        content: combinedText
      }
    ];
  }

  const response = await axios.post(url, {
    model: model,
    messages: messages,
    temperature: 0.4
  }, { headers, timeout: 25000 });

  let responseText = response.data.choices[0].message.content;
  
  // The Bulletproof JSON Hunter
  const jsonStart = responseText.indexOf('{');
  const jsonEnd = responseText.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1) {
    responseText = responseText.substring(jsonStart, jsonEnd + 1);
  }

  return JSON.parse(responseText);
};

export const analyzeReelMedia = async ({ videoUrl, thumbnailUrl, caption, username }, { userApiKey, customColumns }) => {
  // If a user key was passed from authController, put it at the absolute top of the fleet
  const fleetKeys = getApiKeys() || [];
  const apiKeys = userApiKey ? [{ type: 'openrouter', key: userApiKey }, ...fleetKeys] : fleetKeys;

  if (apiKeys.length === 0) {
    throw new Error("No API keys found. Please add a key to your environment.");
  }

  // 1. Build the dynamic schema expectations from the user's custom columns
  const customSchemaPrompts = customColumns.map(col => {
    if (col.inputType === 'dropdown' && Array.isArray(col.options)) {
      return `"${col.columnId}": "String (choose one of: ${col.options.join(", ")}, or '-' if unknown)"`;
    }
    return `"${col.columnId}": "String (extract or infer ${col.displayName}, or '-' if unknown)"`;
  });

  const customSchemaJson = customSchemaPrompts.length > 0 
    ? customSchemaPrompts.join(",\n    ") 
    : `"exampleAttribute": "String"`;

  const DYNAMIC_SYSTEM_PROMPT = `
You are a highly perceptive, expert AI profiling analyst. Your task is to dynamically evaluate a creator's vibe, aesthetics, demographics, and overall engagement based on visual evidence from their Reel thumbnail and provided metadata.

CRITICAL FILTERING TASK (accountType):
You must determine if this specific username/profile belongs to a Female, a Male, or a Brand/Company (e.g., meme pages, businesses, products, theme pages).

Do not force the data into unnatural assumptions. If the visual or textual evidence leans a certain way, trust your dynamic analysis. 

ENGAGEMENT & STATS INSTRUCTIONS:
- Extract the exact true username (without spaces).

You MUST return a valid JSON object matching this exact schema:
{
  "username": "exact_handle_without_spaces",
  "accountType": "String (Female, Male, or Brand)",
  "customCategories": {
    ${customSchemaJson}
  },
  "aiInsights": "One short sentence analyzing their visual aesthetic."
}

Rules:
1. Return ONLY the raw JSON object. Do not include markdown formatting like \`\`\`json.
2. If you cannot determine a custom category value, output "-".
`;

  const imagePart = await fetchImageAsBase64(thumbnailUrl);
  
  const contentPrompt = `
    Provided Display Name/Title: ${username || "Unknown"}
    Caption & Extracted Metadata: 
    ${caption || "No caption provided."}
    
    Dynamically analyze the visual and textual data to classify the account type (Female, Male, Brand), determine the clean handle, and extract the requested custom attributes.
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
            systemInstruction: DYNAMIC_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            temperature: 0.4 
          }
        });

        let responseText = response.text;
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(responseText);

      } else {
        console.log(`🧠 [AI Engine] Trying ${provider.type.toUpperCase()} Model...`);
        return await callOpenAICompatible(provider, contentPrompt, DYNAMIC_SYSTEM_PROMPT, imagePart ? imagePart.openAiFormat : null);
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