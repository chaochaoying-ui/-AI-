
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
      contents: "请深度扫描全球过去72小时内最火热的AI、机器人及硬科技动态。识别出3个具有【财富效应】的话题。要求：选题具备全球热度，但必须能够直接映射到【中国A股市场】。在 mainTopic 中体现出全球热点与A股财富机会的结合点。返回JSON。",
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
    
    请针对以下选题撰写深度商业长文：${topic.mainTopic}。
    
    【核心要求】：
    1. 【全球热度+A股落脚】：从全球最前沿的AI动态切入，但必须将文章重心落脚于【中国A股市场】的产业逻辑。
    2. 【产业深度分析】：详细分析中国产业链的上下游机会，解释这一全球热点如何驱动国内相关产业。
    3. 【上市公司点名】：在文章中明确列举并分析深度参与其中的【A股上市企业】。
    4. 【禁止 Markdown】：严禁使用 **加粗** 或 # 标题。所有样式必须通过 [TAG: 内容] 实现。
    5. 【商业化排版】：段落之间要有合理的间隙，不要过于拥挤，文字要有呼吸感。

    【排版标签系统】（前端自动解析）：
    - [TITLE: 章节名] 用于蓝色边框章节标题。
    - [QUOTE: 金句内容] 用于输出具有洞察力的、甚至带点刻薄真相的金句。
    - [HIGHLIGHT: 专家视角] 用于强调底层的财富逻辑或产业真相。
    - [TABLE: 标题1|标题2 \n 数据1|数据2] 用于呈现 A 股相关标的对比或产业链上下游企业。
    - [LIST: 要点内容] 用于输出操作方法论或核心结论。
    - [IMAGE: 1/2/3] 插入。

    视觉锚点在文末提供：[视觉锚点N: 构图描述]。

    文章结构建议：
    - 爆款钩子（戳破认知的表象）
    - 全球热潮背后的真相（全球动态拆解）
    - A股产业底层逻辑（国内产业链深度映射）
    - 核心标的深度扫描（点名具体的A股上市公司及其参与深度）
    - 普通人的财富复利路径（认知升级与操作建议）

    字数：3000字左右。文章要有极强的专业深度和商业博弈感。`;

    const result = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    for await (const chunk of result) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  async generateVisual(prompt: string): Promise<string | null> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: `Professional stock market and AI technology editorial illustration, high-end financial business magazine style, cinematic lighting, 4k: ${prompt}` }]
      },
      config: {
        imageConfig: { 
          aspectRatio: "16:9",
          imageSize: "1K" 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }
}
