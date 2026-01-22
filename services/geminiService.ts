
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { NewsItem, TopicCluster } from "../types";

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async senseTrends(): Promise<TopicCluster[]> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "深度扫描全球过去72小时AI与科技动态。识别3个具有极强财富效应的话题。要求：全球视野，A股落脚。在 mainTopic 中结合热点与A股机会。返回JSON。",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              mainTopic: { type: Type.STRING },
              relatedEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
              viralScore: { type: Type.NUMBER },
              potentialHook: { type: Type.STRING }
            },
            required: ["id", "mainTopic", "relatedEvents", "viralScore", "potentialHook"]
          }
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => {
      if (chunk.web) {
        return {
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri
        };
      }
      return null;
    }).filter((s: any) => s !== null) || [];

    try {
      const text = response.text || '';
      const cleanText = text.replace(/\[\d+\]/g, '').trim();
      if (!cleanText) return [];
      
      const parsed = JSON.parse(cleanText);
      return (Array.isArray(parsed) ? parsed : []).map((item: any) => ({
        ...item,
        sources: sources.length > 0 ? sources : undefined
      }));
    } catch (e) {
      console.error("解析感知数据失败", e);
      return [];
    }
  }

  async *generateArticleStream(topic: TopicCluster) {
    const ai = this.getAI();
    const prompt = `你是一个深谙人性的微信公众号主编，定位「AI × 认知升级 × 财富复利」。
    
    选题主题：${topic.mainTopic}。
    相关事件：${topic.relatedEvents.join(", ")}。

    【标题生成要求】：
    请输出 5 个候选爆款标题，必须精准套用提供的爆款公式（恐惧唤醒、贪婪触发等）。

    【核心内容逻辑】：
    1. 【全球视角】：拆解全球最火的 AI 趋势。
    2. 【A股映射】：深度分析该热点如何传导至【中国 A 股市场】的特定板块。
    3. 【产业拆解】：梳理国内算力、应用层或核心硬件的上下游逻辑。
    4. 【核心标的】：必须使用表格展示 3-5 家【A股上市公司】。
       表格格式要求：
       [TABLE: 核心资产 | 核心优势与护城河 | 潜在风险 | 估值评级 \n 企业A(代码) | 优势描述... | 风险描述... | 评级 \n 企业B(代码) | 优势描述... | 风险描述... | 评级]
    5. 【认知复利】：总结财富操作建议。

    【视觉配图与排版协议】：
    - 严禁任何 Markdown 格式。
    - 在正文中合适的位置插入 [IMAGE: N] 标签（N 为 1-3）。
    - 【重要】：在全文最末尾，必须输出以下锚点：
      [封面锚点: 描述一张极具冲击力的 2.35:1 宽银幕视觉封面]
      [视觉锚点1: 详细描述]
      [视觉锚点2: 详细描述]
      [视觉锚点3: 详细描述]

    【标签系统】：
    - [TITLE: 章节名] 
    - [QUOTE: 金句] 
    - [HIGHLIGHT: 产业真相]
    - [LIST: 操作指南]
    - [TABLE: 核心资产 | 核心优势与护城河 | 潜在风险 | 估值评级 \n ...]
    - [IMAGE: N]

    字数要求：3000字以上，深度剖析。`;

    const result = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 12000 }
      }
    });

    for await (const chunk of result) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  async generateCover(prompt: string): Promise<string | null> {
    const ai = this.getAI();
    const enhancedPrompt = `Ultra-wide cinematic 2.35:1 aspect ratio composition, premium financial magazine cover art, high-end business photography style, futuristic AI tech integration with Chinese stock market symbols, corporate blue and gold lighting, professional 8k render, hyper-detailed, sleek and minimal: ${prompt}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  }

  async generateVisual(prompt: string): Promise<string | null> {
    const ai = this.getAI();
    const enhancedPrompt = `High-end financial editorial illustration, professional 3D minimalist render, corporate blue and gold color palette, cinematic lighting, crisp 8k details, sophisticated corporate aesthetic: ${prompt}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  }
}
