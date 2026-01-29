
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
  ShieldCheck,
  ZapOff,
  Flame,
  BarChart,
  LineChart,
  Shield,
  Zap as ZapIcon
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
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '20px';
      container.innerHTML = articleRef.current.innerHTML;
      
      container.querySelectorAll('p.magazine-p').forEach(el => {
        const p = el as HTMLElement;
        p.style.fontSize = '17px';
        p.style.lineHeight = '1.8';
        p.style.color = '#333333';
        p.style.marginBottom = '24px';
        p.style.textAlign = 'justify';
      });

      container.querySelectorAll('.magazine-cover-wrap').forEach(el => {
        const wrap = el as HTMLElement;
        wrap.style.margin = '20px 0 40px 0';
        wrap.style.borderRadius = '12px';
        wrap.style.overflow = 'hidden';
      });

      container.querySelectorAll('.pro-table-header').forEach(el => {
        const header = el as HTMLElement;
        header.style.background = 'linear-gradient(90deg, #1e40af 0%, #7c3aed 100%)';
        header.style.padding = '15px 20px';
        header.style.color = '#ffffff';
      });

      const type = "text/html";
      const blob = new Blob([container.innerHTML], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      alert("🚀 机构级专业排版已复制！已优化蓝紫渐变数据表与视觉高亮。");
    } catch (err) {
      console.error("复制失败", err);
      alert("复制失败，请重试。");
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
      <div className="article-container relative space-y-6">
        {(coverImage || status === AppStatus.GENERATING) && (
          <div className="magazine-cover-wrap mb-12 -mx-4 lg:-mx-8">
            <div className="rounded-[2.5rem] overflow-hidden border border-white/10 bg-slate-900 relative shadow-2xl shadow-blue-900/20" style={{ aspectRatio: '2.35 / 1' }}>
              {coverImage ? (
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xl">
                   <ImageIcon className="w-16 h-16 text-blue-500/20 animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-[1em] text-blue-400/50 mt-4">Generating 2.35:1 Masterpiece</span>
                </div>
              )}
            </div>
          </div>
        )}

        {filteredLines.map((line, idx) => {
          const safeLine = cleanText(line);

          if (safeLine.match(/^\[TITLE[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[TITLE[：:]\s*|\]/gi, '');
            return (
              <section key={idx} className="magazine-title-wrap relative pt-12 pb-6">
                <div className="visual-guide-line" />
                <h3 className="text-5xl font-[900] text-white tracking-tighter leading-none mb-4 uppercase flex items-center gap-4">
                  {text}
                </h3>
                <div className="w-24 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />
              </section>
            );
          }
          
          if (safeLine.match(/^\[QUOTE[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[QUOTE[：:]\s*|\]/gi, '');
            return (
              <div key={idx} className="magazine-quote-wrap my-12 px-6 lg:px-10">
                <blockquote className="p-10 glass-card rounded-[3rem] border-l-[10px] border-indigo-600 relative z-10 shadow-xl overflow-hidden bg-gradient-to-br from-indigo-950/30 to-slate-900/30">
                  <p className="text-3xl font-black text-indigo-50 italic leading-relaxed tracking-tight">
                    {text}
                  </p>
                </blockquote>
              </div>
            );
          }
          
          if (safeLine.match(/^\[HIGHLIGHT[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[HIGHLIGHT[：:]\s*|\]/gi, '');
            return (
              <div key={idx} className="magazine-highlight-wrap my-10 group">
                <div className="gradient-border-box border border-indigo-500/40 shadow-2xl bg-gradient-to-br from-slate-900/80 to-indigo-950/80 p-10 rounded-[2.5rem]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/30 flex items-center justify-center border border-indigo-500/50">
                      <ZapIcon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em]">Oracle Deep Insight</span>
                  </div>
                  <p className="text-xl text-slate-100 leading-relaxed font-bold tracking-tight border-l-4 border-indigo-500 pl-8">
                    {text}
                  </p>
                </div>
              </div>
            );
          }

          if (safeLine.includes('[TABLE:')) {
            const tableContent = safeLine.match(/\[TABLE:(.*?)\]/i)?.[1] || "";
            const rows = tableContent.split(/\\n|\n/).filter(r => r.trim());
            if (rows.length === 0) return null;
            return (
              <div key={idx} className="magazine-table-container my-16 overflow-hidden glass-card rounded-[2.5rem] shadow-2xl border border-white/5 bg-slate-900/60">
                <div className="pro-table-header px-10 py-10 bg-gradient-to-r from-[#1e40af] to-[#7c3aed] border-b border-white/10 relative">
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-4">
                      <BarChart className="w-6 h-6 text-white" />
                      <div>
                        <span className="text-lg font-black text-white uppercase tracking-[0.4em] block leading-none">Institutional Asset Radar</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-white/10">
                        {rows[0].split('|').map((h, i) => (
                          <th key={i} className="px-10 py-8 text-left text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] whitespace-nowrap bg-white/5">
                            {h.trim()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.slice(1).map((row, i) => (
                        <tr key={i} className="hover:bg-indigo-600/[0.1] transition-all duration-300">
                          {row.split('|').map((d, j) => {
                            const content = d.trim();
                            const isTicker = content.match(/\d{6}/);
                            const isPositive = content.match(/(买入|推荐|超配|A|上涨|强)/);
                            return (
                              <td key={j} className={`px-10 py-10 text-lg text-slate-300 font-bold leading-relaxed ${isTicker ? 'ticker-font' : ''}`}>
                                {isTicker ? (
                                  <span className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 px-4 py-1.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-900/20 inline-block">
                                    {content}
                                  </span>
                                ) : isPositive ? (
                                  <span className="flex items-center gap-3 text-emerald-400 font-black">
                                    <TrendingUp className="w-5 h-5" />
                                    {content}
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
                <div className="px-10 py-8 bg-black/40 flex items-center justify-between border-t border-white/5">
                   <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.4em]">© 2026 Oracle Logic Terminal</p>
                   <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500/40 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-blue-500/40 animate-pulse delay-150" />
                   </div>
                </div>
              </div>
            );
          }

          const imgMatch = safeLine.match(/^\[IMAGE[：:]\s*(\d+)\]/i);
          if (imgMatch) {
            const index = parseInt(imgMatch[1]) - 1;
            const imgData = images[index];
            return (
              <div key={idx} className="magazine-image-wrap my-16 group">
                <div className="rounded-[3rem] overflow-hidden border border-white/10 bg-slate-950 aspect-video relative shadow-2xl">
                  {imgData ? (
                    <img src={imgData} alt={`Editorial Asset ${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-2xl">
                        <ImageIcon className="w-16 h-16 text-blue-500/10 animate-pulse" />
                        <span className="mt-4 text-[10px] font-black uppercase tracking-[0.6em] text-blue-500/30">Synthesizing Visual Asset {index + 1}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          
          if (safeLine.match(/^\[LIST[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[LIST[：:]\s*|\]/gi, '');
            listItems.push(text);
            const nextLine = filteredLines[idx+1];
            if (!nextLine || !nextLine.match(/^\[LIST[：:]\s*(.*?)\]/i)) {
              const currentList = [...listItems];
              listItems = [];
              return (
                <div key={idx} className="magazine-list-wrap my-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {currentList.map((item, i) => (
                    <div key={i} className="magazine-list-item p-10 glass-card rounded-[2.5rem] relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-20" />
                      <p className="text-xl text-slate-100 font-medium leading-relaxed tracking-tight relative z-10">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          }
          
          if (safeLine.trim() === '') return <div key={idx} className="h-10" />;
          return <p key={idx} className="magazine-p antialiased font-medium">{safeLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden selection:bg-blue-600/30">
      <aside className="w-80 border-r border-white/5 flex flex-col p-12 bg-black/40 backdrop-blur-3xl z-50">
        <div className="flex items-center gap-5 mb-24">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl relative">
             <Rocket className="w-8 h-8 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase leading-none">Oracle</h1>
            <span className="text-[10px] text-blue-500 font-black uppercase tracking-[0.4em] mt-3 block opacity-80">Intelligence Engine</span>
          </div>
        </div>
        <nav className="flex-1 space-y-10">
          <button onClick={() => setActiveTab('sensing')} className={`w-full flex items-center gap-8 px-10 py-8 rounded-[2.5rem] transition-all duration-700 group relative ${activeTab === 'sensing' ? 'bg-blue-600 shadow-2xl shadow-blue-900/60 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <Globe className="w-7 h-7" />
            <span className="font-black text-xl">全球趋势</span>
          </button>
          <button onClick={() => setActiveTab('editor')} className={`w-full flex items-center gap-8 px-10 py-8 rounded-[2.5rem] transition-all duration-700 group relative ${activeTab === 'editor' ? 'bg-blue-600 shadow-2xl shadow-blue-900/60 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <PieChart className="w-7 h-7" />
            <span className="font-black text-xl">A股深研</span>
          </button>
        </nav>
        {!hasKey && (
          <button onClick={handleOpenKeyDialog} className="mt-8 flex items-center gap-4 px-10 py-7 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-amber-500/20 transition-all">
            <Key className="w-6 h-6" />
            Credentials Required
          </button>
        )}
      </aside>
      <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#020617]">
        <header className="sticky top-0 z-40 px-24 py-12 bg-[#020617]/90 backdrop-blur-3xl border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-14">
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase">{activeTab === 'sensing' ? 'Global Pulse' : 'Editorial Lab'}</h2>
            {status !== AppStatus.IDLE && (
              <div className="flex items-center gap-5 px-8 py-4 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] border border-blue-500/20 shadow-2xl">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                {status === AppStatus.SENSING ? 'Sensing Signals' : 'Generating Content'}
              </div>
            )}
          </div>
          <div className="flex items-center gap-8">
            {activeTab === 'sensing' && (
              <button 
                onClick={handleSense} 
                disabled={status !== AppStatus.IDLE}
                className="px-10 py-5 bg-white text-slate-950 hover:bg-blue-50 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center gap-4 shadow-xl active:scale-95 disabled:opacity-50 group"
              >
                <RefreshCcw className={`w-5 h-5 ${status === AppStatus.SENSING ? 'animate-spin' : ''}`} />
                Scan Trends
              </button>
            )}
            {activeTab === 'editor' && streamedContent && (
              <button onClick={copyRichText} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-[2rem] text-xs font-black flex items-center gap-5 shadow-2xl active:scale-95 transition-all tracking-[0.3em] uppercase">
                <Copy className="w-5 h-5" />
                复制机构级排版
              </button>
            )}
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-16 py-16 lg:px-24 lg:py-24">
          {activeTab === 'sensing' && (
            <div className="space-y-24">
              <div className="max-w-4xl">
                <h3 className="text-8xl font-black text-white tracking-tighter mb-10 leading-[0.9]">挖掘。<span className="text-blue-600">布局。</span>复利。</h3>
                <p className="text-slate-400 text-2xl leading-relaxed font-light border-l-4 border-blue-600 pl-10">
                  Oracle 穿越噪音，为您挖掘能让 <span className="text-white font-black italic">A 股产业链</span> 产生共振的财富认知差。
                </p>
              </div>
              {topics.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {topics.map(topic => (
                    <div key={topic.id} className="group p-12 rounded-[4rem] bg-white/[0.02] border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/[0.04] transition-all duration-700 flex flex-col shadow-2xl relative overflow-hidden">
                      <div className="mb-10 flex justify-between items-center">
                        <span className="px-6 py-2 bg-blue-600/20 text-blue-400 text-[10px] font-black rounded-full tracking-[0.3em] border border-blue-500/30 uppercase">
                          Wealth Potential: {topic.viralScore}%
                        </span>
                      </div>
                      <h4 className="text-4xl font-black mb-10 group-hover:text-blue-400 transition-colors leading-[1.1] tracking-tighter">{topic.mainTopic}</h4>
                      <div className="space-y-6 mb-12 flex-1">
                        {topic.relatedEvents.map((e, i) => (
                          <div key={i} className="flex gap-6 items-start text-lg text-slate-500 leading-relaxed font-semibold">
                            <Target className="w-5 h-5 mt-1.5 text-blue-500 opacity-60 flex-shrink-0" />
                            {e}
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => handleGenerate(topic)} 
                        disabled={status !== AppStatus.IDLE} 
                        className="w-full py-8 bg-white text-slate-950 font-black text-lg rounded-[3rem] tracking-[0.3em] uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-5 active:scale-[0.98] disabled:opacity-50"
                      >
                        Launch Generation <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-40 flex flex-col items-center justify-center border-4 border-dashed border-white/5 rounded-[5rem] bg-white/[0.01]">
                  <ZapOff className="w-16 h-16 text-slate-700 mb-8" />
                  <h4 className="text-3xl font-black text-slate-500 mb-4 uppercase tracking-widest">Scanner Offline</h4>
                  <p className="text-slate-600 text-xl font-light">Probing the wealth space requires a scan trigger</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'editor' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-[#0f172a]/40 backdrop-blur-3xl border border-white/5 rounded-[6rem] p-12 lg:p-24 shadow-2xl relative overflow-hidden">
                {!streamedContent && status === AppStatus.IDLE ? (
                  <div className="py-60 text-center flex flex-col items-center">
                    <PenTool className="w-16 h-16 text-slate-700 mb-12" />
                    <h3 className="text-5xl font-black mb-8 text-white tracking-tighter uppercase">Laboratory Ready</h3>
                    <p className="text-slate-500 max-w-xl text-xl leading-relaxed font-light">Extracting alpha from trending signals. Select a topic to begin institutional content synthesis.</p>
                  </div>
                ) : (
                  <div ref={articleRef} className="article-container select-text pb-40">
                    {renderFormattedContent(streamedContent)}
                  </div>
                )}
                {status === AppStatus.GENERATING && (
                  <div className="py-40 flex flex-col items-center gap-12 border-t border-white/5 mt-16">
                    <div className="w-24 h-24 border-[8px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin shadow-2xl" />
                    <div className="text-center space-y-6">
                      <p className="text-4xl font-black text-white tracking-tighter uppercase">Synthesizing Alpha Layer</p>
                      <p className="text-slate-500 text-xl font-semibold opacity-60 tracking-wide">Applying 2026 Commercial Logic Chains</p>
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
