
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
  PieChart
} from 'lucide-react';
import { GeminiService } from './services/geminiService';
import { AppStatus, TopicCluster } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [topics, setTopics] = useState<TopicCluster[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicCluster | null>(null);
  const [streamedContent, setStreamedContent] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
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

  // Initial scan is still performed to avoid empty state, but UI emphasizes the manual button.
  useEffect(() => {
    handleSense();
  }, [handleSense]);

  const handleGenerate = async (topic: TopicCluster) => {
    if (!hasKey) await handleOpenKeyDialog();
    
    setSelectedTopic(topic);
    setStatus(AppStatus.GENERATING);
    setActiveTab('editor');
    setStreamedContent('');
    setImages([]);

    try {
      const stream = geminiRef.current.generateArticleStream(topic);
      let fullText = '';
      
      for await (const chunk of stream) {
        if (chunk) {
          fullText += chunk;
          setStreamedContent(prev => prev + chunk);
        }
      }

      const anchorsMatch = fullText.match(/\[视觉锚点\d+[：:]\s*(.*?)\]/gi);
      if (anchorsMatch) {
        const anchors = anchorsMatch.slice(0, 3).map(a => a.replace(/\[视觉锚点\d+[：:]\s*|\]/gi, '').trim());
        const tempImages: string[] = [];
        for (const anchor of anchors) {
          const img = await geminiRef.current.generateVisual(anchor);
          if (img) tempImages.push(img);
        }
        setImages(tempImages);
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
          (el as HTMLElement).style.paddingLeft = '15px';
          (el as HTMLElement).style.fontSize = '22px';
          (el as HTMLElement).style.fontWeight = 'bold';
          (el as HTMLElement).style.margin = '35px 0 20px 0';
          (el as HTMLElement).style.color = '#3b82f6';
        }
        if (el.classList.contains('article-quote-purple')) {
          (el as HTMLElement).style.padding = '20px';
          (el as HTMLElement).style.borderLeft = '5px solid #a855f7';
          (el as HTMLElement).style.background = '#f9fafb';
          (el as HTMLElement).style.color = '#6b21a8';
          (el as HTMLElement).style.margin = '25px 0';
          (el as HTMLElement).style.fontSize = '18px';
          (el as HTMLElement).style.lineHeight = '1.6';
        }
        if (el.tagName === 'P') {
          (el as HTMLElement).style.fontSize = '17px';
          (el as HTMLElement).style.lineHeight = '1.8';
          (el as HTMLElement).style.marginBottom = '20px';
          (el as HTMLElement).style.color = '#374151';
          (el as HTMLElement).style.textAlign = 'justify';
        }
      });

      const type = "text/html";
      const blob = new Blob([container.innerHTML], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      alert("✨ 商业级内容已复制！请直接在微信公众号后台粘贴。");
    } catch (err) {
      console.error("复制失败", err);
    }
  };

  const cleanText = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/#/g, '');
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    let listItems: string[] = [];

    const filteredLines = lines.filter(l => !l.match(/^\[视觉锚点/));

    return filteredLines.map((line, idx) => {
      const safeLine = cleanText(line);

      // 蓝色章节标题
      if (safeLine.match(/^\[TITLE[：:]\s*(.*?)\]/i)) {
        const text = safeLine.replace(/^\[TITLE[：:]\s*|\]/gi, '');
        return <section key={idx} className="article-title-blue mt-10 mb-6 font-bold text-2xl text-blue-400 py-1 border-l-[6px] border-blue-500 pl-4">{text}</section>;
      }
      // 紫色金句
      if (safeLine.match(/^\[QUOTE[：:]\s*(.*?)\]/i)) {
        const text = safeLine.replace(/^\[QUOTE[：:]\s*|\]/gi, '');
        return <blockquote key={idx} className="article-quote-purple my-8 p-6 rounded-r-2xl border-l-[5px] border-purple-500 bg-purple-500/10 italic text-xl text-indigo-100 font-serif">{text}</blockquote>;
      }
      // 绿色高亮框
      if (safeLine.match(/^\[HIGHLIGHT[：:]\s*(.*?)\]/i)) {
        const text = safeLine.replace(/^\[HIGHLIGHT[：:]\s*|\]/gi, '');
        return <div key={idx} className="my-8 p-6 rounded-2xl border border-green-500/30 bg-green-500/5 text-green-300 text-base leading-relaxed">{text}</div>;
      }
      // 智能配图
      const imgMatch = safeLine.match(/^\[IMAGE[：:]\s*(\d+)\]/i);
      if (imgMatch) {
        const index = parseInt(imgMatch[1]) - 1;
        const imgData = images[index];
        return (
          <div key={idx} className="my-10">
            <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 aspect-video relative group">
              {imgData ? (
                <img src={imgData} alt={`AI Asset ${index + 1}`} className="w-full h-auto block" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                  <ImageIcon className="w-10 h-10 mb-3 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Assets Rendering</span>
                </div>
              )}
            </div>
          </div>
        );
      }
      // 商业数据对比表
      if (safeLine.startsWith('[TABLE:')) {
        const rows = safeLine.replace(/^\[TABLE:\s*|\]/gi, '').split('\\n');
        return (
          <div key={idx} className="my-8 overflow-x-auto">
            <table className="w-full border-collapse rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
              <thead className="bg-slate-800">
                <tr>
                  {rows[0].split('|').map((h, i) => <th key={i} className="px-5 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">{h.trim()}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.slice(1).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    {row.split('|').map((d, j) => <td key={j} className="px-5 py-4 text-sm text-slate-300">{d.trim()}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      // 列表
      if (safeLine.match(/^\[LIST[：:]\s*(.*?)\]/i)) {
        const text = safeLine.replace(/^\[LIST[：:]\s*|\]/gi, '');
        listItems.push(text);
        const nextLine = filteredLines[idx+1];
        if (!nextLine || !nextLine.match(/^\[LIST[：:]\s*(.*?)\]/i)) {
          const currentList = [...listItems];
          listItems = [];
          return (
            <div key={idx} className="my-8 space-y-4">
              {currentList.map((item, i) => (
                <div key={i} className="flex gap-5 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-black text-white mt-1 shadow-lg shadow-blue-900/40">{i + 1}</div>
                  <div className="text-slate-300 text-lg leading-relaxed flex-1">{item}</div>
                </div>
              ))}
            </div>
          );
        }
        return null;
      }
      
      if (safeLine.trim() === '') return <div key={idx} className="h-4" />; // 段落间距控制
      
      return <p key={idx} className="text-slate-300 mb-6 leading-relaxed text-lg font-light tracking-wide text-justify">{safeLine}</p>;
    });
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden">
      <aside className="w-72 border-r border-white/5 flex flex-col p-10 bg-black/40 backdrop-blur-3xl">
        <div className="flex items-center gap-4 mb-16">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-[0.2em] text-white uppercase leading-none">Oracle</h1>
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1.5 block">AI × A-Share</span>
          </div>
        </div>

        <nav className="flex-1 space-y-6">
          <button onClick={() => setActiveTab('sensing')} className={`w-full flex items-center gap-5 px-6 py-5 rounded-2xl transition-all duration-500 group ${activeTab === 'sensing' ? 'bg-blue-600 shadow-2xl shadow-blue-900/40 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <Search className="w-5 h-5" />
            <span className="font-bold text-base">全球趋势</span>
          </button>
          <button onClick={() => setActiveTab('editor')} className={`w-full flex items-center gap-5 px-6 py-5 rounded-2xl transition-all duration-500 group ${activeTab === 'editor' ? 'bg-blue-600 shadow-2xl shadow-blue-900/40 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <PieChart className="w-5 h-5" />
            <span className="font-bold text-base">A股深研</span>
          </button>
        </nav>

        {!hasKey && (
          <button onClick={handleOpenKeyDialog} className="mt-8 flex items-center gap-3 px-6 py-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all">
            <Key className="w-4 h-4" />
            Configure AI Key
          </button>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        <header className="sticky top-0 z-40 px-16 py-8 bg-[#020617]/90 backdrop-blur-2xl border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h2 className="text-2xl font-black tracking-tight">{activeTab === 'sensing' ? '全球动态深度扫描' : '商业级排版实验室'}</h2>
            {status !== AppStatus.IDLE && (
              <div className="flex items-center gap-4 px-5 py-2.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.1em] border border-blue-500/20 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                {status === AppStatus.SENSING ? 'Mapping Global Trends' : 'Generating Market Logic'}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-5">
            <button 
              onClick={handleSense} 
              disabled={status !== AppStatus.IDLE}
              title="手动触发全球动态扫描"
              className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-300 transition-all border border-white/10 flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw className={`w-5 h-5 ${status === AppStatus.SENSING ? 'animate-spin text-blue-500' : ''}`} />
              <span className="text-xs font-black uppercase tracking-widest">扫描全球资讯</span>
            </button>
            {activeTab === 'editor' && streamedContent && (
              <button onClick={copyRichText} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3.5 rounded-2xl text-xs font-black flex items-center gap-3 shadow-2xl shadow-blue-900/60 active:scale-95 transition-all">
                <Copy className="w-4 h-4" />
                复制商业排版 (直粘贴后台)
              </button>
            )}
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-16">
          {activeTab === 'sensing' && (
            <div className="space-y-16">
              <div className="max-w-3xl">
                <h3 className="text-6xl font-black text-white tracking-tighter mb-6 leading-none">财富感知协议</h3>
                <p className="text-slate-400 text-xl leading-relaxed font-light">
                  接入 Google Search，不仅实时扫描全球热度，更穿透信息迷雾，挖掘 A 股市场的【产业认知差】。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {topics.length > 0 ? topics.map(topic => (
                  <div key={topic.id} className="group p-12 rounded-[3.5rem] bg-white/[0.03] border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/[0.03] transition-all duration-700 flex flex-col shadow-2xl">
                    <div className="mb-8 flex justify-between items-center">
                      <span className="px-5 py-2 bg-blue-600/20 text-blue-400 text-xs font-black rounded-full tracking-[0.1em] border border-blue-500/30">
                        VIRAL SCORE: {topic.viralScore}
                      </span>
                    </div>
                    <h4 className="text-3xl font-black mb-8 group-hover:text-blue-400 transition-colors leading-tight">{topic.mainTopic}</h4>
                    <div className="space-y-4 mb-12 flex-1">
                      {topic.relatedEvents.map((e, i) => (
                        <div key={i} className="flex gap-5 items-start text-sm text-slate-500 leading-relaxed font-medium">
                          <Target className="w-4 h-4 mt-1 text-blue-500 opacity-60" />
                          {e}
                        </div>
                      ))}
                    </div>
                    
                    {topic.sources && (
                      <div className="mb-10 p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Intelligence Sources</p>
                        <div className="flex flex-col gap-3">
                          {topic.sources.slice(0, 3).map((s, i) => (
                            <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400/80 hover:text-blue-300 flex items-center gap-3 truncate transition-colors">
                              <ExternalLink className="w-3 h-3 flex-shrink-0" /> {s.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => handleGenerate(topic)} 
                      disabled={status !== AppStatus.IDLE} 
                      className="w-full py-6 bg-white text-slate-950 font-black text-xs rounded-[2rem] tracking-[0.25em] uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-[0.98]"
                    >
                      生成 A 股深研长文 <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )) : (
                  <div className="col-span-full py-60 text-center flex flex-col items-center gap-10">
                    <div className="w-20 h-20 border-[6px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_50px_rgba(37,99,235,0.2)]" />
                    <div className="space-y-4">
                      <p className="text-3xl font-black text-white tracking-tighter">正在接入全球信源...</p>
                      <p className="text-slate-500 font-medium text-lg">实时解析全球动态与 A 股市场的深度关联</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[4.5rem] p-16 shadow-[0_80px_160px_-40px_rgba(0,0,0,0.6)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-600/5 blur-[150px] -mr-80 -mt-80 pointer-events-none" />
                
                {!streamedContent && status === AppStatus.IDLE ? (
                  <div className="py-72 text-center flex flex-col items-center">
                    <div className="w-28 h-28 bg-slate-900/50 rounded-[3rem] flex items-center justify-center mb-12 border border-white/5 shadow-2xl">
                      <PenTool className="w-12 h-12 text-slate-700" />
                    </div>
                    <h3 className="text-3xl font-black mb-6">深度排版实验室已就绪</h3>
                    <p className="text-slate-500 max-w-sm text-lg leading-relaxed font-light">选择一个选题，Oracle 将为您生成极具穿透力的商业深度解析，并精准定位 A 股核心标的。</p>
                  </div>
                ) : (
                  <div ref={articleRef} className="article-container select-text space-y-0 text-slate-300 pb-20">
                    {renderFormattedContent(streamedContent)}
                  </div>
                )}

                {status === AppStatus.GENERATING && (
                  <div className="py-40 flex flex-col items-center gap-10 border-t border-white/5 mt-16">
                    <div className="relative">
                      <div className="w-24 h-24 border-[6px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                      <Sparkles className="w-8 h-8 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="text-center space-y-3">
                      <p className="text-2xl font-black text-white tracking-tighter">逻辑架构注入中...</p>
                      <p className="text-slate-500 text-base font-medium">正在梳理 A 股产业链逻辑与核心上市标的</p>
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
