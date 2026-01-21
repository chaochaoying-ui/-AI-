
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  score: number;
  summary: string;
  category: 'Research' | 'Industry' | 'Social' | 'Finance';
  viralPotential: number;
}

export interface GeneratedArticle {
  title: string;
  hook: string;
  background: string;
  analysis: string;
  insights: string;
  conclusion: string;
  images: string[];
}

export enum AppStatus {
  SENSING = 'SENSING',
  DECIDING = 'DECIDING',
  GENERATING = 'GENERATING',
  IDLE = 'IDLE'
}

export interface TopicCluster {
  id: string;
  mainTopic: string;
  relatedEvents: string[];
  viralScore: number;
  potentialHook: string;
  sources?: { title: string; uri: string }[];
}