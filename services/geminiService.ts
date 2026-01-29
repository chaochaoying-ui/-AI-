
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
      contents: "深度扫描全球过去72小时AI with科技动态。识别3个具有极强财富效应的话题。要求：全球视野，A股落脚。在 mainTopic 中结合热点与A股机会。返回JSON。",
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
    
    【核心时空校准】：
    【重要】当前真实时间是 2026 年。请务必进行严格的日期核查与溯源。
    严禁出现“2024年下半场”等陈旧表述。所有逻辑必须基于 2026 年的当前现状。

    【固定开头格式】：
    文章第一句话必须是：“大家好，我是趣潮Ai复利，带你一起开启复利增长人生”

    选题主题：${topic.mainTopic}。
    相关事件：${topic.relatedEvents.join(", ")}。

    【标题生成要求（核心指令）】：
    请在文章开头输出 5 个爆款候选标题，字数严格控制在 16 字以内。
    必须精准套用以下公式库，并融入高能情绪词：

    公式库：
    1. 恐惧唤醒：[主体]刚刚宣布：[震撼动作]，[利益群体]彻夜难眠
    2. 贪婪触发：[权威人物]透露：掌握这[数字]个[技能]，[时间]内[具体收益]
    3. 认知颠覆：99%的人不知道：[反常识观点]的真相竟然是...
    4. 紧迫制造：[时间节点]前必看！[主体]即将[重大变化]
    5. 悬念钩子：[知名主体]突然[动作]，背后原因令人[情绪词]
    6. 数据冲击：[主体][时间段]狂揽[惊人数字]，[对比对象]彻底慌了
    7. 身份锚定：[特定群体]注意！[主体]新规直接影响你的[利益点]
    8. 利益直击：用[工具]做[任务]，效率提升[数字]倍，[从业者]都在用

    高能词库：
    - 恐惧：颠覆、淘汰、红线、崩盘、围剿、出局
    - 贪婪：暴涨、狂揽、红利、财富密码、造富神话、风口
    - 愤怒/惊奇：真相、内幕、打脸、王炸、逆天、封神
    - 认同/紧迫：觉醒、破局、翻盘、崛起、倒计时、窗口期

    【内容生成准则】：
    1. 【严谨溯源】：数据点必须逻辑自洽。
    2. 【A股映射】：深度分析该热点在 2026 年 A 股环境下的传导路径。
    3. 【核心标的】：使用表格展示 3-5 家【A股上市公司】。
       表格格式要求：
       [TABLE: 核心资产 | 2026核心优势 | 潜在风险 | 估值评级 \n 企业A(代码) | 优势描述... | 风险描述... | 评级 \n 企业B(代码) | 优势描述... | 风险描述... | 评级]

    【排版协议】：
    - 严禁任何 Markdown。
    - 在正文中插入 [IMAGE: N] 标签（1-3）。
    - 全文末尾输出：
      [封面锚点: 描述 2.35:1 比例视觉封面]
      [视觉锚点1: 详细描述]
      [视觉锚点2: 详细描述]
      [视觉锚点3: 详细描述]

    【标签系统】：
    - [TITLE: 章节名] 
    - [QUOTE: 金句] 
    - [HIGHLIGHT: 产业真相]
    - [LIST: 操作指南]
    - [TABLE: ...]
    - [IMAGE: N]

    字数要求：3000字以上。`;

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
    const enhancedPrompt = `A high-end financial technology digital masterpiece for a WeChat Official Account cover. 
    Style: cinematic lighting, corporate blue and gold color palette, professional financial magazine style.
    Aspect Ratio: 2.35:1.
    Theme: ${prompt}. 
    MANDATORY COMPOSITION RULE: 
    1. Keep all critical visual subjects and all text strictly within the CENTRAL HORIZONTAL 50% of the image (the "Safe Zone"). 
    2. Leave significant empty negative space at the edges to avoid UI cropping. 
    3. If there is text like "A股" or "AI", it must be centered, large, and bold. 
    Visual Details: Professional financial magazine aesthetic, high contrast, clean professional layout, 8k resolution.`;
    
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
    const enhancedPrompt = `High-end financial editorial illustration, professional 3D minimalist render, corporate blue and gold color palette, cinematic lighting, crisp 8k details: ${prompt}`;
    
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
