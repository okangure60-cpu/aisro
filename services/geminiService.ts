import { GoogleGenAI } from "@google/genai";

// Oracle advice function using Google Gemini API to provide roleplay advice
export const getOracleAdvice = async (lvl: number, location: string) => {
  try {
    // Initializing with direct process.env.API_KEY as per coding guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sen Silkroad Online evreninde bilge bir kahinsin. ${location} civarında ${lvl}. seviye bir savaşçıya çok kısa, motive edici ve gizemli bir tavsiye ver (Maksimum 15 kelime).`,
      config: {
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    // Property access .text instead of method call
    return response.text || "Kılıcın keskin, ruhun özgür olsun.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Kaderin yolları karmaşıktır, savaşmaya devam et.";
  }
};
