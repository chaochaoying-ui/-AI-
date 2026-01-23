
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
  Flame
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
      // 创建一个克隆节点，以便在不影响当前 UI 的情况下应用内联样式
      const container = document.createElement('div');
      container.style.backgroundColor = '#ffffff'; // 公众号通常是白底
      container.style.padding = '20px';
      container.innerHTML = articleRef.current.innerHTML;
      
      // 处理所有 p 标签
      container.querySelectorAll('p.magazine-p').forEach(el => {
        const p = el as HTMLElement;
        p.style.fontSize = '17px';
        p.style.lineHeight = '1.8';
        p.style.color = '#333333';
        p.style.marginBottom = '24px';
        p.style.textAlign = 'justify';
        p.style.letterSpacing = '0.5px';
      });

      // 处理封面图
      container.querySelectorAll('.magazine-cover-wrap').forEach(el => {
        const wrap = el as HTMLElement;
        wrap.style.margin = '20px 0 40px 0';
        wrap.style.borderRadius = '20px';
        wrap.style.overflow = 'hidden';
        const img = wrap.querySelector('img');
        if (img) {
          img.style.width = '100%';
          img.style.display = 'block';
        }
      });

      // 处理标题
      container.querySelectorAll('.magazine-title-wrap').forEach(el => {
        const section = el as HTMLElement;
        section.style.marginTop = '40px';
        section.style.marginBottom = '20px';
        section.style.paddingLeft = '15px';
        section.style.borderLeft = '6px solid #2563eb';
        const h3 = section.querySelector('h3');
        if (h3) {
          h3.style.fontSize = '22px';
          h3.style.fontWeight = 'bold';
          h3.style.color = '#1e293b';
          h3.style.margin = '0';
        }
      });

      // 处理引用块
      container.querySelectorAll('.magazine-quote-wrap').forEach(el => {
        const wrap = el as HTMLElement;
        wrap.style.margin = '30px 0';
        wrap.style.padding = '25px';
        wrap.style.backgroundColor = '#f8fafc';
        wrap.style.borderLeft = '6px solid #4f46e5';
        wrap.style.borderRadius = '0 20px 20px 0';
        const p = wrap.querySelector('p');
        if (p) {
          p.style.fontSize = '18px';
          p.style.color = '#4338ca';
          p.style.fontWeight = '500';
          p.style.fontStyle = 'italic';
          p.style.margin = '0';
        }
      });

      // 处理高亮框
      container.querySelectorAll('.magazine-highlight-wrap').forEach(el => {
        const wrap = el as HTMLElement;
        wrap.style.margin = '25px 0';
        wrap.style.padding = '25px';
        wrap.style.backgroundColor = '#eff6ff';
        wrap.style.border = '1px solid #bfdbfe';
        wrap.style.borderRadius = '20px';
        const p = wrap.querySelector('p');
        if (p) {
          p.style.fontSize = '17px';
          p.style.color = '#1e40af';
          p.style.fontWeight = '600';
          p.style.margin = '0';
        }
      });

      // 处理表格
      container.querySelectorAll('.magazine-table-container').forEach(el => {
        const container = el as HTMLElement;
        container.style.margin = '30px 0';
        container.style.borderRadius = '15px';
        container.style.overflow = 'hidden';
        container.style.border = '1px solid #e2e8f0';
        
        const table = container.querySelector('table');
        if (table) {
          table.style.width = '100%';
          table.style.borderCollapse = 'collapse';
        }
        
        container.querySelectorAll('th').forEach(th => {
          (th as HTMLElement).style.backgroundColor = '#2563eb';
          (th as HTMLElement).style.color = '#ffffff';
          (th as HTMLElement).style.padding = '12px 15px';
          (th as HTMLElement).style.fontSize = '13px';
          (th as HTMLElement).style.textAlign = 'left';
        });

        container.querySelectorAll('td').forEach(td => {
          (td as HTMLElement).style.padding = '12px 15px';
          (td as HTMLElement).style.borderBottom = '1px solid #f1f5f9';
          (td as HTMLElement).style.fontSize = '15px';
          (td as HTMLElement).style.color = '#475569';
        });
      });

      // 处理插图
      container.querySelectorAll('.magazine-image-wrap').forEach(el => {
        const wrap = el as HTMLElement;
        wrap.style.margin = '30px 0';
        wrap.style.borderRadius = '20px';
        wrap.style.overflow = 'hidden';
        const img = wrap.querySelector('img');
        if (img) {
          img.style.width = '100%';
          img.style.display = 'block';
        }
      });

      // 处理列表
      container.querySelectorAll('.magazine-list-wrap').forEach(el => {
        const wrap = el as HTMLElement;
        wrap.style.margin = '25px 0';
        container.querySelectorAll('.magazine-list-item').forEach(item => {
           const it = item as HTMLElement;
           it.style.padding = '20px';
           it.style.backgroundColor = '#f1f5f9';
           it.style.borderRadius = '15px';
           it.style.marginBottom = '15px';
           it.style.fontSize = '16px';
           it.style.color = '#334155';
        });
      });

      // 执行复制
      const type = "text/html";
      const blob = new Blob([container.innerHTML], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      alert("🚀 微信公众号适配排版已复制！\n\n已为您自动将复杂样式转换为公众号兼容的内联样式。请在微信后台编辑器直接粘贴。");
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
      <div className="article-container relative space-y-4">
        {/* 文章顶部封面图：带识别类名 */}
        {(coverImage || status === AppStatus.GENERATING) && (
          <div className="magazine-cover-wrap mb-24 -mx-6 lg:-mx-12">
            <div className="rounded-[4rem] overflow-hidden border border-white/10 bg-slate-900 relative shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9)]" style={{ aspectRatio: '2.35 / 1' }}>
              {coverImage ? (
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xl">
                   <div className="relative mb-8">
                     <ImageIcon className="w-24 h-24 text-blue-500/20 animate-pulse" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[1em] text-blue-400/70 ml-4">Oracle Cinematic Vision</span>
                </div>
              )}
            </div>
          </div>
        )}

        {filteredLines.map((line, idx) => {
          const safeLine = cleanText(line);

          // 章节标题：带识别类名
          if (safeLine.match(/^\[TITLE[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[TITLE[：:]\s*|\]/gi, '');
            return (
              <section key={idx} className="magazine-title-wrap relative pt-20 pb-12">
                <div className="visual-guide-line" />
                <h3 className="text-6xl font-[900] text-white tracking-tighter leading-none mb-6 uppercase flex items-center gap-6">
                  {text}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-transparent rounded-full" />
                </div>
              </section>
            );
          }
          
          // 深度金句：带识别类名
          if (safeLine.match(/^\[QUOTE[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[QUOTE[：:]\s*|\]/gi, '');
            return (
              <div key={idx} className="magazine-quote-wrap my-20 relative px-6 lg:px-12">
                <blockquote className="p-16 glass-card rounded-[4rem] border-l-[12px] border-indigo-600 relative z-10 shadow-[0_40px_80px_-20px_rgba(79,70,229,0.15)] overflow-hidden">
                  <p className="text-4xl font-black text-indigo-50 italic leading-[1.4] tracking-tight">
                    {text}
                  </p>
                </blockquote>
              </div>
            );
          }
          
          // 产业真相：带识别类名
          if (safeLine.match(/^\[HIGHLIGHT[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[HIGHLIGHT[：:]\s*|\]/gi, '');
            return (
              <div key={idx} className="magazine-highlight-wrap my-16 group">
                <div className="gradient-border-box shadow-[0_40px_100px_-20px_rgba(37,99,235,0.2)]">
                  <div className="flex justify-between items-start mb-6">
                    <div className="highlight-badge flex gap-2 items-center bg-blue-600/20 text-blue-400 border border-blue-500/30">
                      <Flame className="w-3.5 h-3.5" />
                      Oracle Insight Deep Dive
                    </div>
                  </div>
                  <p className="text-2xl text-blue-50/90 leading-relaxed font-semibold tracking-wide">
                    {text}
                  </p>
                </div>
              </div>
            );
          }

          // 金融数据表格：带识别类名
          if (safeLine.includes('[TABLE:')) {
            const tableContent = safeLine.match(/\[TABLE:(.*?)\]/i)?.[1] || "";
            const rows = tableContent.split(/\\n|\n/).filter(r => r.trim());
            if (rows.length === 0) return null;

            return (
              <div key={idx} className="magazine-table-container my-24 overflow-hidden glass-card rounded-[4rem] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.8)] border border-white/5">
                <div className="pro-table-header px-14 py-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-5">
                    <BarChart3 className="w-6 h-6 text-white" />
                    <span className="text-lg font-black text-white uppercase tracking-[0.4em] block">Asset Scan Logic</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 border-b border-white/10">
                        {rows[0].split('|').map((h, i) => (
                          <th key={i} className="px-14 py-8 text-left text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] whitespace-nowrap">
                            {h.trim()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.slice(1).map((row, i) => (
                        <tr key={i} className="hover:bg-blue-600/[0.07]">
                          {row.split('|').map((d, j) => {
                            const content = d.trim();
                            const isTicker = content.match(/\d{6}/);
                            return (
                              <td key={j} className={`px-14 py-10 text-lg text-slate-300 font-medium leading-relaxed ${isTicker ? 'ticker-font' : ''}`}>
                                {isTicker ? (
                                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-xl text-sm font-black">
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
              </div>
            );
          }

          // 智能插图：带识别类名
          const imgMatch = safeLine.match(/^\[IMAGE[：:]\s*(\d+)\]/i);
          if (imgMatch) {
            const index = parseInt(imgMatch[1]) - 1;
            const imgData = images[index];
            return (
              <div key={idx} className="magazine-image-wrap my-24 group">
                <div className="rounded-[4.5rem] overflow-hidden border border-white/10 bg-slate-950 aspect-video relative shadow-[0_60px_120px_-30px_rgba(0,0,0,0.8)]">
                  {imgData ? (
                    <img src={imgData} alt={`Editorial Asset ${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-2xl">
                        <ImageIcon className="w-20 h-20 text-blue-500/10 animate-pulse" />
                        <span className="mt-4 text-[10px] font-black uppercase tracking-[0.6em] text-blue-500/40">Synthesizing Asset Visualization {index + 1}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          
          // 列表渲染：带识别类名
          if (safeLine.match(/^\[LIST[：:]\s*(.*?)\]/i)) {
            const text = safeLine.replace(/^\[LIST[：:]\s*|\]/gi, '');
            listItems.push(text);
            const nextLine = filteredLines[idx+1];
            if (!nextLine || !nextLine.match(/^\[LIST[：:]\s*(.*?)\]/i)) {
              const currentList = [...listItems];
              listItems = [];
              return (
                <div key={idx} className="magazine-list-wrap my-24 grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {currentList.map((item, i) => (
                    <div key={i} className="magazine-list-item p-14 glass-card rounded-[4rem] relative">
                      <p className="text-2xl text-slate-100 font-medium leading-relaxed tracking-tight">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          }
          
          if (safeLine.trim() === '') return <div key={idx} className="h-16" />;
          return <p key={idx} className="magazine-p antialiased font-medium">{safeLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden selection:bg-blue-600/30">
      <aside className="w-80 border-r border-white/5 flex flex-col p-12 bg-black/40 backdrop-blur-3xl z-50">
        <div className="flex items-center gap-5 mb-24">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)] relative">
             <div className="absolute inset-0 bg-white/10 rounded-[2rem] animate-pulse" />
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
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase">{activeTab === 'sensing' ? 'Global Pulse Scanner' : 'Editorial Lab'}</h2>
            {status !== AppStatus.IDLE && (
              <div className="flex items-center gap-5 px-8 py-4 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] border border-blue-500/20 shadow-2xl">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
                {status === AppStatus.SENSING ? 'Processing Signals' : 'Extracting Alpha'}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-8">
            {activeTab === 'sensing' && (
              <button 
                onClick={handleSense} 
                disabled={status !== AppStatus.IDLE}
                className="px-10 py-5 bg-white text-slate-950 hover:bg-blue-50 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center gap-4 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50 group"
              >
                <RefreshCcw className={`w-6 h-6 ${status === AppStatus.SENSING ? 'animate-spin' : ''}`} />
                Trigger Scan
              </button>
            )}
            {activeTab === 'editor' && streamedContent && (
              <button onClick={copyRichText} className="bg-blue-600 hover:bg-blue-700 text-white px-14 py-5 rounded-[2rem] text-xs font-black flex items-center gap-5 shadow-2xl shadow-blue-900/60 active:scale-95 transition-all tracking-[0.3em] uppercase">
                <Copy className="w-6 h-6" />
                复制商业级排版
              </button>
            )}
          </div>
        </header>

        <div className="max-w-8xl mx-auto px-24 py-24">
          {activeTab === 'sensing' && (
            <div className="space-y-24">
              <div className="max-w-5xl">
                <h3 className="text-9xl font-black text-white tracking-tighter mb-12 leading-[0.9]">挖掘。<br/><span className="text-blue-600">共振。</span><br/>布局。</h3>
                <p className="text-slate-400 text-3xl leading-relaxed font-light max-w-3xl border-l-4 border-blue-600 pl-10">
                  Oracle 穿越噪音，为您挖掘 those 能让 <span className="text-white font-black italic">A 股产业链</span> 产生剧烈共振的财富认知差。
                </p>
              </div>

              {topics.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  {topics.map(topic => (
                    <div key={topic.id} className="group p-16 rounded-[5rem] bg-white/[0.02] border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/[0.04] transition-all duration-1000 flex flex-col shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[120px] -mr-40 -mt-40 pointer-events-none group-hover:bg-blue-600/15 transition-all" />
                      
                      <div className="mb-14 flex justify-between items-center">
                        <span className="px-8 py-3 bg-blue-600/20 text-blue-400 text-xs font-black rounded-full tracking-[0.3em] border border-blue-500/30 uppercase">
                          Wealth Potential: {topic.viralScore}%
                        </span>
                      </div>
                      
                      <h4 className="text-5xl font-black mb-12 group-hover:text-blue-400 transition-colors leading-[1.1] tracking-tighter">{topic.mainTopic}</h4>
                      
                      <div className="space-y-7 mb-16 flex-1">
                        {topic.relatedEvents.map((e, i) => (
                          <div key={i} className="flex gap-8 items-start text-xl text-slate-500 leading-relaxed font-semibold">
                            <Target className="w-6 h-6 mt-2 text-blue-500 opacity-60 flex-shrink-0" />
                            {e}
                          </div>
                        ))}
                      </div>
                      
                      {topic.sources && (
                        <div className="mb-14 p-10 bg-black/40 rounded-[3rem] border border-white/5 group-hover:border-blue-500/20 transition-all">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                            <Layers className="w-4 h-4" /> 
                            Signal Origin Sources
                          </p>
                          <div className="flex flex-col gap-5">
                            {topic.sources.slice(0, 3).map((s, i) => (
                              <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400/80 hover:text-blue-200 flex items-center gap-4 truncate transition-colors group/link">
                                <ArrowUpRight className="w-4 h-4 flex-shrink-0" /> 
                                {s.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => handleGenerate(topic)} 
                        disabled={status !== AppStatus.IDLE} 
                        className="w-full py-9 bg-white text-slate-950 font-black text-lg rounded-[3.5rem] tracking-[0.4em] uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-6 shadow-[0_30px_60px_-15px_rgba(255,255,255,0.1)] active:scale-[0.96] disabled:opacity-50"
                      >
                        Launch Production <ChevronRight className="w-8 h-8" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-60 flex flex-col items-center justify-center border-4 border-dashed border-white/5 rounded-[6rem] bg-white/[0.01] group hover:bg-white/[0.02] transition-all">
                  <div className="w-40 h-40 bg-slate-900 rounded-[4rem] flex items-center justify-center mb-12 shadow-inner border border-white/5 relative">
                    <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                    <ZapOff className="w-20 h-20 text-slate-700 relative z-10" />
                  </div>
                  <h4 className="text-4xl font-black text-slate-500 mb-6 uppercase tracking-widest">Scanner Offline</h4>
                  <p className="text-slate-600 text-2xl font-light">Initiate manually to probe the alpha space</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="max-w-7xl mx-auto">
              <div className="bg-[#0f172a]/40 backdrop-blur-3xl border border-white/5 rounded-[8rem] p-16 lg:p-32 shadow-[0_120px_240px_-60px_rgba(0,0,0,0.9)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[60rem] h-[60rem] bg-blue-600/5 blur-[250px] -mr-80 -mt-80 pointer-events-none" />
                
                {!streamedContent && status === AppStatus.IDLE ? (
                  <div className="py-80 text-center flex flex-col items-center">
                    <div className="w-40 h-40 bg-slate-900/80 rounded-[4.5rem] flex items-center justify-center mb-16 border border-white/10 shadow-2xl relative">
                       <div className="absolute inset-0 bg-blue-600/10 blur-2xl rounded-full animate-pulse" />
                       <PenTool className="w-20 h-20 text-slate-700 relative z-10" />
                    </div>
                    <h3 className="text-6xl font-black mb-10 text-white tracking-tighter uppercase">Production Space Ready</h3>
                    <p className="text-slate-500 max-w-2xl text-2xl leading-relaxed font-light">Select an intelligence cluster. Oracle will deploy institutional-grade commercial logic to generate a high-impact depth analysis.</p>
                  </div>
                ) : (
                  <div ref={articleRef} className="article-container select-text pb-40">
                    {renderFormattedContent(streamedContent)}
                  </div>
                )}

                {status === AppStatus.GENERATING && (
                  <div className="py-60 flex flex-col items-center gap-16 border-t border-white/5 mt-24">
                    <div className="relative">
                      <div className="w-36 h-36 border-[12px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_80px_rgba(37,99,235,0.3)]" />
                      <div className="absolute inset-0 m-auto w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center backdrop-blur-md">
                        <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center space-y-8">
                      <p className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Injecting Wealth Logic</p>
                      <p className="text-slate-500 text-2xl font-semibold opacity-60 tracking-wide">Converging Global Trends with A-Share Industrial Chains</p>
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
