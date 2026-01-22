
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  Search, 
  Cpu, 
  Zap, 
  PenTool, 
  Image as ImageIcon, 
  BarChart3, 
  ChevronRight, 
  RefreshCcw,
  CheckCircle2,
  Share2,
  Copy,
  Key,
  ExternalLink,
  Layers,
  Sparkles,
  TrendingUp,
  Target,
  Globe,
  PieChart,
  Rocket,
  Loader2,
  TrendingDown,
  Info,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { GeminiService } from './services/geminiService';
import { AppStatus, TopicCluster } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [topics, setTopics] = useState<TopicCluster[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicCluster | null>(null);
  const [streamedContent, setStreamedContent] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sensing' | 'editor'>('sensing');
  const [hasKey, setHasKey] = useState<boolean>(true);
  const articleRef = useRef<HTMLDivElement>(null);
  
  const geminiRef = useRef(new GeminiService());

  const checkKey = useCallback(async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const selected = await aistudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  }, []);

  useEffect(() => {
    checkKey();
  }, [checkKey]);

  const handleOpenKeyDialog = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleSense = useCallback(async () => {
    setStatus(AppStatus.SENSING);
    setActiveTab('sensing');
    try {
      const result = await geminiRef.current.senseTrends();
      setTopics(result);
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        await handleOpenKeyDialog();
      }
    } finally {
      setStatus(AppStatus.IDLE);
    }
  }, []);

  const handleGenerate = async (topic: TopicCluster) => {
    if (!hasKey) await handleOpenKeyDialog();
    
    setSelectedTopic(topic);
    setStatus(AppStatus.GENERATING);
    setActiveTab('editor');
    setStreamedContent('');
    setImages([]);
    setCoverImage(null);

    try {
      const stream = geminiRef.current.generateArticleStream(topic);
      let fullText = '';
      
      for await (const chunk of stream) {
        if (chunk) {
          fullText += chunk;
          setStreamedContent(prev => prev + chunk);
        }
      }

      const coverMatch = fullText.match(/\[封面锚点[：:]\s*(.*?)\]/i);
      if (coverMatch) {
        const coverDesc = coverMatch[1].trim();
        const coverImg = await geminiRef.current.generateCover(coverDesc);
        if (coverImg) setCoverImage(coverImg);
      }

      const anchorRegex = /\[视觉锚点(\d+)[：:]\s*(.*?)\]/gi;
      let match;
      const anchorMap: { [key: number]: string } = {};
      
      while ((match = anchorRegex.exec(fullText)) !== null) {
        const num = parseInt(match[1]);
        const desc = match[2].trim();
        anchorMap[num] = desc;
      }

      const tempImages: string[] = [];
      for (let i = 1; i <= 3; i++) {
        if (anchorMap[i]) {
          const img = await geminiRef.current.generateVisual(anchorMap[i]);
          if (img) {
            tempImages[i-1] = img;
            setImages([...tempImages]); 
          }
        }
      }
    } catch (e: any) {
      console.error("生成失败", e);
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const copyRichText = async () => {
    if (!articleRef.current) return;
    try {
      const container = document.createElement('div');
      container.innerHTML = articleRef.current.innerHTML;
      
      const allElems = container.querySelectorAll('*');
      allElems.forEach(el => {
        if (el.classList.contains('article-title-blue')) {
          (el as HTMLElement).style.borderLeft = '6px solid #3b82f6';
          (el as HTMLElement).style.paddingLeft = '18px';
          (el as HTMLElement).style.fontSize = '24px';
          (el as HTMLElement).style.fontWeight = 'bold';
          (el as HTMLElement).style.margin = '50px 0 25px 0';
          (el as HTMLElement).style.color = '#1d4ed8';
          (el as HTMLElement).style.lineHeight = '1.4';
        }
        if (el.tagName === 'P') {
          (el as HTMLElement).style.fontSize = '18px';
          (el as HTMLElement).style.lineHeight = '1.8';
          (el as HTMLElement).style.marginBottom = '24px';
          (el as HTMLElement).style.color = '#1f2937';
          (el as HTMLElement).style.textAlign = 'justify';
          (el as HTMLElement).style.letterSpacing = '0.01em';
        }
      });

      const type = "text/html";
      const blob = new Blob([container.innerHTML], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      alert("🚀 商业级排版已准备就绪！\n已复制富文本，请直接在微信公众号后台粘贴。");
    } catch (err) {
      console.error("复制失败", err);
    }
  };

  const cleanText = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/#/g, '');
  };

  const renderFormattedContent = (content: string) => {
    const combinedContent = content.replace(/\[TABLE:([\s\S]*?)\]/g, (match) => {
      return match.replace(/\n/g, ' \\n ');
    });

    const lines = combinedContent.split('\n');
    let listItems: string[] = [];
    const filteredLines = lines.filter(l => !l.match(/^\[(视觉锚点|封面锚点)/));

    return (
      <div className="article-container relative space-y-4">
        {/* 文章顶部封面图 */}
        {(coverImage || status === AppStatus.GENERATING) && (
          <div className="mb-20 -mx-6 lg:-mx-12">
            <div className="rounded-[3.5rem] overflow-hidden border border-white/10 bg-slate-900 relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]" style={{ aspectRatio: '2.35 / 1' }}>
              {coverImage ? (
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md">
                   <div className="relative mb-6">
                     <ImageIcon className="w-20 h-20 text-blue-500/20 animate-pulse" />
                     <Sparkles className="w-8 h-8 text-blue-400 absolute -top-2 -right-2 animate-bounce" />
                   </div>
                   <span className="text-xs font-black uppercase tracking-[0.8em] text-blue-400/60 ml-4 animate-pulse">Cinematic Intelligence Cover</span>
                </div>
              )}
            </div>
          </div>
        )}

        {filteredLines.map((line, idx) => {
          const safeLine = cleanText(line);

          // 章节标题：顶级金融杂志粗体大号样式
          if (safeLine.match(/^\[TITLE[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[TITLE[：:]\s*|\]/gi, '');
            return (
              <section key={idx} className="relative py-12">
                <div className="visual-guide-line" />
                <h3 className="text-5xl font-[900] text-white tracking-tighter leading-none mb-4 uppercase">
                  {text}
                </h3>
                <div className="w-24 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />
              </section>
            );
          }
          
          // 深度金句：蓝紫渐变背景，强调权威感
          if (safeLine.match(/^\[QUOTE[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[QUOTE[：:]\s*|\]/gi, '');
            return (
              <div key={idx} className="my-16 relative">
                <div className="absolute -left-10 top-0 text-7xl font-serif text-blue-500/20 leading-none">“</div>
                <blockquote className="p-12 glass-card rounded-r-[4rem] rounded-l-2xl border-l-[10px] border-indigo-600">
                  <p className="text-3xl font-bold text-indigo-100 italic leading-relaxed tracking-tight">
                    {text}
                  </p>
                </blockquote>
              </div>
            );
          }
          
          // 产业真相/高亮框：编辑推荐感，带微光特效
          if (safeLine.match(/^\[HIGHLIGHT[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[HIGHLIGHT[：:]\s*|\]/gi, '');
            return (
              <div key={idx} className="my-12 group">
                <div className="gradient-border-box shadow-[0_30px_60px_-15px_rgba(59,130,246,0.1)] transition-all group-hover:shadow-blue-500/5">
                  <div className="highlight-badge flex gap-2 items-center">
                    <ShieldCheck className="w-3 h-3" />
                    Editor's Intelligence Signal
                  </div>
                  <p className="text-xl text-blue-100/90 leading-relaxed font-medium">
                    {text}
                  </p>
                </div>
              </div>
            );
          }

          // 金融数据表格：职业报告风格，增强对比
          if (safeLine.includes('[TABLE:')) {
            const tableContent = safeLine.match(/\[TABLE:(.*?)\]/i)?.[1] || "";
            const rows = tableContent.split(/\\n|\n/).filter(r => r.trim());
            if (rows.length === 0) return null;

            return (
              <div key={idx} className="my-20 overflow-hidden glass-card rounded-[3rem] shadow-2xl border border-white/10">
                <div className="pro-table-header px-10 py-8 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <BarChart3 className="w-6 h-6 text-white" />
                    <span className="text-sm font-black text-white uppercase tracking-[0.4em]">Proprietary Asset Scanner</span>
                  </div>
                  <div className="text-[10px] font-black text-white/50 uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full">
                    A-Share Market Real-time Logic
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-white/5">
                        {rows[0].split('|').map((h, i) => (
                          <th key={i} className="px-10 py-7 text-left text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] whitespace-nowrap">
                            {h.trim()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.slice(1).map((row, i) => (
                        <tr key={i} className="hover:bg-blue-600/[0.05] transition-colors group">
                          {row.split('|').map((d, j) => {
                            const content = d.trim();
                            // 识别股票代码并加亮显示
                            const isTicker = content.match(/\d{6}/);
                            return (
                              <td key={j} className={`px-10 py-8 text-base text-slate-300 font-medium leading-relaxed ${isTicker ? 'ticker-font text-white' : ''}`}>
                                {isTicker ? (
                                  <span className="flex items-center gap-2">
                                    <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-xs font-black">{content}</span>
                                    <ArrowUpRight className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </span>
                                ) : (
                                  content
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-10 py-6 bg-slate-900/30 text-[9px] font-black text-slate-600 uppercase tracking-widest border-t border-white/5 flex items-center gap-3">
                  <Info className="w-3 h-3" />
                  Source: Oracle Intelligence Network - Data verified at the edge
                </div>
              </div>
            );
          }

          // 智能插图：极简宽屏感，带发光投影
          const imgMatch = safeLine.match(/^\[IMAGE[：:]\s*(\d+)\]/i);
          if (imgMatch) {
            const index = parseInt(imgMatch[1]) - 1;
            const imgData = images[index];
            return (
              <div key={idx} className="my-20">
                <div className="rounded-[4rem] overflow-hidden border border-white/5 bg-slate-950 aspect-video relative group transition-all duration-700 hover:shadow-[0_40px_100px_-20px_rgba(59,130,246,0.2)]">
                  {imgData ? (
                    <img src={imgData} alt={`Editorial Asset ${index + 1}`} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                      <div className="relative">
                        <ImageIcon className="w-16 h-16 text-blue-500/20 animate-pulse" />
                        <Loader2 className="w-8 h-8 text-blue-400 absolute inset-0 m-auto animate-spin" />
                      </div>
                      <span className="mt-4 text-[10px] font-black uppercase tracking-[0.5em] text-blue-500/30">Alpha Visualization {index + 1}</span>
                    </div>
                  )}
                  <div className="absolute bottom-10 left-10 p-4 px-6 glass-card rounded-2xl opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Fig. {index + 1} // Intelligence Signal</span>
                  </div>
                </div>
              </div>
            );
          }
          
          // 操作指南列表：卡片式设计
          if (safeLine.match(/^\[LIST[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[LIST[：:]\s*|\]/gi, '');
            listItems.push(text);
            const nextLine = filteredLines[idx+1];
            if (!nextLine || !nextLine.match(/^\[LIST[：:]\s*(.*?)\]/i)) {
              const currentList = [...listItems];
              listItems = [];
              return (
                <div key={idx} className="my-16 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {currentList.map((item, i) => (
                    <div key={i} className="p-10 glass-card rounded-[3rem] relative group hover:bg-blue-600/5 transition-all">
                      <div className="absolute -top-4 -left-4 w-12 h-12 bg-white text-slate-950 font-black flex items-center justify-center rounded-2xl shadow-xl transform -rotate-12 group-hover:rotate-0 transition-transform">
                        {i + 1}
                      </div>
                      <p className="text-xl text-slate-300 font-light leading-relaxed">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          }
          
          if (safeLine.trim() === '') return <div key={idx} className="h-12" />;
          return <p key={idx} className="magazine-p antialiased">{safeLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden">
      <aside className="w-80 border-r border-white/5 flex flex-col p-12 bg-black/40 backdrop-blur-3xl">
        <div className="flex items-center gap-5 mb-20">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)]">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-[0.2em] text-white uppercase leading-none">Oracle</h1>
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.3em] mt-2 block opacity-70">Wealth Logic Engine</span>
          </div>
        </div>

        <nav className="flex-1 space-y-8">
          <button onClick={() => setActiveTab('sensing')} className={`w-full flex items-center gap-6 px-8 py-6 rounded-3xl transition-all duration-500 group ${activeTab === 'sensing' ? 'bg-blue-600 shadow-2xl shadow-blue-900/60 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <Globe className="w-6 h-6" />
            <span className="font-black text-lg">全球趋势</span>
          </button>
          <button onClick={() => setActiveTab('editor')} className={`w-full flex items-center gap-6 px-8 py-6 rounded-3xl transition-all duration-500 group ${activeTab === 'editor' ? 'bg-blue-600 shadow-2xl shadow-blue-900/60 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <PieChart className="w-6 h-6" />
            <span className="font-black text-lg">A股深研</span>
          </button>
        </nav>

        {!hasKey && (
          <button onClick={handleOpenKeyDialog} className="mt-8 flex items-center gap-3 px-8 py-5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all">
            <Key className="w-5 h-5" />
            Configure AI Credentials
          </button>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#020617]">
        <header className="sticky top-0 z-40 px-20 py-10 bg-[#020617]/95 backdrop-blur-3xl border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-10">
            <h2 className="text-3xl font-black tracking-tight text-white">{activeTab === 'sensing' ? '全球情报扫描仪' : '商业内容实验室'}</h2>
            {status !== AppStatus.IDLE && (
              <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-blue-500/10 text-blue-400 text-xs font-black uppercase tracking-[0.2em] border border-blue-500/20 shadow-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                {status === AppStatus.SENSING ? 'SCANNING MARKETS' : 'CRAFTING ALPHA'}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            {activeTab === 'sensing' && (
              <button 
                onClick={handleSense} 
                disabled={status !== AppStatus.IDLE}
                className="px-8 py-4 bg-white text-slate-950 hover:bg-blue-50 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-[0_15px_30px_-5px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50"
              >
                <RefreshCcw className={`w-5 h-5 ${status === AppStatus.SENSING ? 'animate-spin' : ''}`} />
                触发手动扫描
              </button>
            )}
            {activeTab === 'editor' && streamedContent && (
              <button onClick={copyRichText} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-[1.5rem] text-xs font-black flex items-center gap-4 shadow-2xl shadow-blue-900/60 active:scale-95 transition-all tracking-[0.2em] uppercase">
                <Copy className="w-5 h-5" />
                复制商业级排版
              </button>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-20 py-16">
          {activeTab === 'sensing' && (
            <div className="space-y-20">
              <div className="max-w-4xl">
                <h3 className="text-7xl font-black text-white tracking-tighter mb-8 leading-[1.1]">全球热点，<br/><span className="text-blue-600">A股布局。</span></h3>
                <p className="text-slate-400 text-2xl leading-relaxed font-light max-w-2xl">
                  点击上方按钮，Oracle 将穿越全球噪音，为您挖掘那些能让 A 股产业链产生剧烈共振的【财富认知差】。
                </p>
              </div>

              {topics.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {topics.map(topic => (
                    <div key={topic.id} className="group p-14 rounded-[4rem] bg-white/[0.02] border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/[0.03] transition-all duration-700 flex flex-col shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-blue-600/10 transition-all" />
                      <div className="mb-10">
                        <span className="px-6 py-2.5 bg-blue-600/20 text-blue-400 text-xs font-black rounded-full tracking-[0.2em] border border-blue-500/30">
                          POTENTIAL: {topic.viralScore}%
                        </span>
                      </div>
                      <h4 className="text-4xl font-black mb-10 group-hover:text-blue-400 transition-colors leading-tight tracking-tight">{topic.mainTopic}</h4>
                      <div className="space-y-5 mb-14 flex-1">
                        {topic.relatedEvents.map((e, i) => (
                          <div key={i} className="flex gap-6 items-start text-base text-slate-500 leading-relaxed font-medium">
                            <Target className="w-5 h-5 mt-1.5 text-blue-500 opacity-60" />
                            {e}
                          </div>
                        ))}
                      </div>
                      {topic.sources && (
                        <div className="mb-12 p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-5">Intelligence Signal Sources</p>
                          <div className="flex flex-col gap-4">
                            {topic.sources.slice(0, 3).map((s, i) => (
                              <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400/80 hover:text-blue-200 flex items-center gap-3 truncate transition-colors group/link">
                                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" /> {s.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      <button 
                        onClick={() => handleGenerate(topic)} 
                        disabled={status !== AppStatus.IDLE} 
                        className="w-full py-7 bg-white text-slate-950 font-black text-sm rounded-[2.5rem] tracking-[0.3em] uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-[0.97]"
                      >
                        激活 A 股研报级创作 <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-40 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[5rem] bg-white/[0.01]">
                  <div className="w-32 h-32 bg-slate-900 rounded-[3rem] flex items-center justify-center mb-10 shadow-2xl">
                    <Zap className="w-14 h-14 text-slate-700" />
                  </div>
                  <h4 className="text-3xl font-black text-slate-500 mb-4">待扫描状态</h4>
                  <p className="text-slate-600 text-xl font-light">点击右上角“触发手动扫描”以开始</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[6rem] p-12 lg:p-24 shadow-[0_100px_200px_-50px_rgba(0,0,0,0.7)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-blue-600/5 blur-[200px] -mr-80 -mt-80 pointer-events-none" />
                
                {!streamedContent && status === AppStatus.IDLE ? (
                  <div className="py-80 text-center flex flex-col items-center">
                    <div className="w-32 h-32 bg-slate-900/50 rounded-[4rem] flex items-center justify-center mb-14 border border-white/5 shadow-inner">
                      <PenTool className="w-16 h-16 text-slate-800" />
                    </div>
                    <h3 className="text-4xl font-black mb-8 text-white">商业深研实验室已就绪</h3>
                    <p className="text-slate-500 max-w-md text-xl leading-relaxed font-light">选择一个高爆发力的选题，Oracle 将为您全自动生成具备顶级商业逻辑与 A 股穿透力的深度长文。</p>
                  </div>
                ) : (
                  <div ref={articleRef} className="article-container select-text space-y-0 text-slate-300 pb-24">
                    {renderFormattedContent(streamedContent)}
                  </div>
                )}

                {status === AppStatus.GENERATING && (
                  <div className="py-48 flex flex-col items-center gap-12 border-t border-white/5 mt-20">
                    <div className="relative">
                      <div className="w-28 h-28 border-[8px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_60px_rgba(37,99,235,0.2)]" />
                      <Sparkles className="w-10 h-10 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="text-center space-y-5">
                      <p className="text-3xl font-black text-white tracking-tighter uppercase">财富逻辑注入中</p>
                      <div className="flex items-center gap-2 justify-center">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-100" />
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-200" />
                      </div>
                      <p className="text-slate-500 text-lg font-medium opacity-60">正在对齐全球热度与国内 A 股产业链核心标的</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
