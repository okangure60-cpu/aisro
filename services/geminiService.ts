
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getOracleAdvice = async (lvl: number, location: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sen Silkroad Online evreninde bilge bir kahinsin. ${location} civarında ${lvl}. seviye bir savaşçıya çok kısa, motive edici ve gizemli bir tavsiye ver (Maksimum 15 kelime).`,
      config: {
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Kılıcın keskin, ruhun özgür olsun.";
  } catch (error) {
    return "Kaderin yolları karmaşıktır, savaşmaya devam et.";
  }
};
