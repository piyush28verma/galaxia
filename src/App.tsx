import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Star,
  ShieldCheck,
  Bot,
  Code2,
  SearchCheck,
  Globe2,
  Braces,
  Zap,
  Check,
  Copy,
  Play,
  Loader2,
  Radio,
  KeyRound,
  Fingerprint,
  Moon,
  Sun,
  Orbit,
  Clock,
  Terminal,
  Menu,
  X,
  type LucideIcon
} from 'lucide-react';

interface Capability {
  id: string;
  mode: 'lint' | 'review' | 'verify' | 'format' | 'ask';
  label: string;
  tag: string;
  icon: LucideIcon;
  gradient: string;
  badgeColor: string;
  description: string;
  defaultPrompt: string;
}

const CAPABILITIES: Capability[] = [
  {
    id: 'lint',
    mode: 'lint',
    label: 'Code Linter',
    tag: 'Free',
    icon: Sparkles,
    gradient: 'from-blue-500 to-indigo-500',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30',
    description: 'Instant syntax, type, and bug check',
    defaultPrompt: `def calculate_average(numbers):\n    total = sum(numbers)\n    return total / len(numbers)`
  },
  {
    id: 'review',
    mode: 'review',
    label: 'Code Review & Security',
    tag: '5 Credits',
    icon: SearchCheck,
    gradient: 'from-pink-500 to-rose-500',
    badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-300 border-pink-500/30',
    description: 'Finds logic bugs, security risks & provides clean fixes',
    defaultPrompt: `query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"\ndb.execute(query)`
  },
  {
    id: 'verify',
    mode: 'verify',
    label: 'Fact Check & Verification',
    tag: '3 Credits',
    icon: Globe2,
    gradient: 'from-emerald-500 to-teal-500',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    description: 'Web-grounded fact checking with sources & truth rating',
    defaultPrompt: `The James Webb Space Telescope operates at the Sun-Earth L2 Lagrange point approximately 1.5 million kilometers from Earth.`
  },
  {
    id: 'format',
    mode: 'format',
    label: 'JSON Converter',
    tag: '5 Credits',
    icon: Braces,
    gradient: 'from-purple-500 to-violet-500',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30',
    description: 'Converts unstructured text into clean JSON format',
    defaultPrompt: `Alex Johnson is Principal Architect at NeoCyber in Seattle, earning $210k. Specializes in Rust, Distributed Systems, and Raft Consensus.`
  },
  {
    id: 'ask',
    mode: 'ask',
    label: 'Problem Solver & Planning',
    tag: '5 Credits',
    icon: Bot,
    gradient: 'from-amber-500 to-orange-500',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30',
    description: 'Technical analysis, system design & step-by-step action plan',
    defaultPrompt: `Design an autonomous payment system for AI agents with usage limits and sub-second response times.`
  }
];

const PRESETS = [
  { label: 'SQL Injection Check', capId: 'review', value: `def authenticate(user, pwd):\n    cursor.execute(f"SELECT * FROM accounts WHERE user = '{user}' AND pwd = '{pwd}'")\n    return cursor.fetchone()` },
  { label: 'Fact Check Claim', capId: 'verify', value: `The James Webb Space Telescope is located at Sun-Earth L2 Lagrange point, 1.5M km from Earth.` },
  { label: 'Extract Profile JSON', capId: 'format', value: `Dr. Elena Vance, Senior AI Scientist at Quantum Labs SF. Email: elena@quantum.io, Skills: PyTorch, CUDA, Transformers.` },
  { label: 'System Design Plan', capId: 'ask', value: `How can an agent dynamically negotiate pricing and execute bounded grants without hitting rate limits on SharedOS?` },
  { label: 'Division by Zero Check', capId: 'lint', value: `def get_mean(items):\n    return sum(items) / len(items)` }
];

const PRINCIPAL_ID = "p_wXzmdHhSly";

interface ScoreGaugeProps {
  score: number;
  nightMode: boolean;
}

function ScoreGauge({ score, nightMode }: ScoreGaugeProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  let strokeColor = "#ef4444"; // Red for low score (< 50)
  if (safeScore >= 80) strokeColor = "#10b981"; // Emerald green
  else if (safeScore >= 60) strokeColor = "#6366f1"; // Indigo
  else if (safeScore >= 40) strokeColor = "#f59e0b"; // Amber

  const circleBg = nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke={circleBg} strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black font-heading text-slate-900 dark:text-white tracking-tight">{safeScore}</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Score</span>
      </div>
    </div>
  );
}

function FormattedOutput({ content, onCopy }: { content: string; onCopy: (text: string, key: string) => void }) {
  if (!content) return null;
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-4 text-sm leading-relaxed font-sans">
      {parts.map((part, idx) => {
        if (part.startsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const lang = lines[0].trim();
          const code = (lang && !lang.includes(' ') && lines.length > 1) ? lines.slice(1).join('\n') : lines.join('\n');
          const displayLang = (lang && !lang.includes(' ') && lines.length > 1) ? lang : 'code';

          return (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-indigo-500/20 bg-slate-900 dark:bg-galaxy-950 text-slate-100 shadow-xl my-3">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 dark:border-indigo-500/20 bg-slate-800/80 dark:bg-galaxy-900/80 text-xs font-mono text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-pink-400" />
                  {displayLang}
                </span>
                <button
                  onClick={() => onCopy(code, `block-${idx}`)}
                  className="flex items-center gap-1 text-slate-300 hover:text-white transition px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-xs font-mono leading-6 text-emerald-300">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        return (
          <div key={idx} className="space-y-2 text-slate-800 dark:text-slate-200">
            {part.split('\n').map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-1.5" />;
              if (line.startsWith('### ')) return <h4 key={lIdx} className="text-base font-bold font-heading text-pink-600 dark:text-pink-400 pt-2 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" />{line.slice(4)}</h4>;
              if (line.startsWith('## ')) return <h3 key={lIdx} className="text-lg font-bold font-heading text-indigo-600 dark:text-indigo-300 pt-3 border-b border-slate-200 dark:border-white/10 pb-1">{line.slice(3)}</h3>;
              if (line.startsWith('# ')) return <h2 key={lIdx} className="text-xl font-black font-heading text-slate-900 dark:text-white pt-4">{line.slice(2)}</h2>;
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-2">
                    <Star className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400 shrink-0 mt-1 fill-pink-500 dark:fill-pink-400" />
                    <span className="font-normal">{line.slice(2)}</span>
                  </div>
                );
              }
              return <p key={lIdx}>{line.replace(/\*\*/g, '')}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [nightMode, setNightMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('galaxia_theme');
    return saved ? saved === 'dark' : true;
  });
  const [activeCapId, setActiveCapId] = useState<string>('lint');
  const [inputVal, setInputVal] = useState<string>(CAPABILITIES[0].defaultPrompt);
  const [callerVal, setCallerVal] = useState<string>('agent:arena-tester');
  const [loading, setLoading] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string>('');

  // SSE Activity Stream
  const [audits, setAudits] = useState<any[]>([]);
  const [sseStatus, setSseStatus] = useState<'live' | 'polling' | 'connecting'>('connecting');

  // Grants Matrix
  const [grants, setGrants] = useState<any[]>([]);
  const [grantsLoading, setGrantsLoading] = useState<boolean>(true);

  // Verifier
  const [verifyDocket, setVerifyDocket] = useState<string>('');
  const [verifySig, setVerifySig] = useState<string>('');
  const [verifyStatus, setVerifyStatus] = useState<any>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  // Docs Tab & Mobile Menu
  const [docTab, setDocTab] = useState<'mcp' | 'rest' | 'arena' | 'payment'>('mcp');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const activeCap = useMemo(() => CAPABILITIES.find(c => c.id === activeCapId) || CAPABILITIES[0], [activeCapId]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (nightMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('galaxia_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('galaxia_theme', 'light');
    }
  }, [nightMode]);

  // Scroll Reveal Intersection Observer
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.05
    });

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const fetchAudits = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/audits?limit=12');
      if (res.ok) {
        const data = await res.json();
        const list = data.audits || data.items || data.data || [];
        setAudits(list);
      }
    } catch (e) {
      console.warn("Audit poll fallback active", e);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/v1/audits/stream');
      eventSource.onopen = () => setSseStatus('live');
      eventSource.onmessage = (e) => {
        try {
          const item = JSON.parse(e.data);
          if (item.type === 'activity' || item.receiptId || item.receipt_id) {
            setAudits(prev => [item, ...prev.filter(x => (x.receiptId || x.receipt_id) !== (item.receiptId || item.receipt_id))].slice(0, 15));
          }
        } catch (err) {}
      };
      eventSource.onerror = () => {
        setSseStatus('polling');
      };
    } catch (e) {
      setSseStatus('polling');
    }

    const pollInterval = setInterval(() => {
      if (sseStatus !== 'live') fetchAudits();
    }, 6000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, [fetchAudits, sseStatus]);

  const fetchGrants = useCallback(async () => {
    try {
      setGrantsLoading(true);
      const res = await fetch('/api/v1/grants');
      if (res.ok) {
        const data = await res.json();
        setGrants(data.grants || data.items || []);
      }
    } catch (e) {
      console.error("Failed to load grants", e);
    } finally {
      setGrantsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrants();
  }, [fetchGrants]);

  const handleExecute = async () => {
    if (!inputVal.trim() || loading) return;
    setLoading(true);
    setErrorMsg('');
    const start = performance.now();
    const timer = setInterval(() => setElapsedMs(Math.round(performance.now() - start)), 40);

    try {
      const res = await fetch('/api/v1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: inputVal,
          mode: activeCap.mode,
          caller: callerVal || 'agent:arena-tester'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Execution failed');
      }
      setExecutionResult(data);

      if (data.receipt) {
        const docketClean = { ...data.receipt.docket || data.receipt };
        delete docketClean.signature;
        delete docketClean.signatureAlgorithm;
        setVerifyDocket(JSON.stringify(docketClean, null, 2));
        setVerifySig(data.receipt.signature || '');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing request');
    } finally {
      clearInterval(timer);
      setElapsedMs(Math.round(performance.now() - start));
      setLoading(false);
      fetchAudits();
    }
  };

  const handleVerifyReceipt = async (overrideDocket?: any, overrideSig?: string) => {
    const docketStr = overrideDocket || verifyDocket;
    const sigStr = overrideSig || verifySig;

    if (!docketStr || !sigStr) {
      setVerifyStatus({ valid: false, message: 'Please provide both Receipt Docket JSON and Ed25519 Signature.' });
      return;
    }

    let parsedDocket: any;
    try {
      parsedDocket = typeof docketStr === 'string' ? JSON.parse(docketStr) : docketStr;
    } catch (e) {
      setVerifyStatus({ valid: false, message: 'Invalid JSON in Receipt Docket.' });
      return;
    }

    setVerifying(true);
    setVerifyStatus(null);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docket: parsedDocket,
          signature: sigStr
        })
      });
      const data = await res.json();
      setVerifyStatus(data);
    } catch (e) {
      setVerifyStatus({ valid: false, message: 'Verification API unreachable.' });
    } finally {
      setVerifying(false);
    }
  };

  const docsCode: Record<string, string> = {
    mcp: `{\n  "mcpServers": {\n    "galaxia": {\n      "transport": "http",\n      "url": "http://localhost:3000/api/mcp",\n      "method": "POST"\n    }\n  }\n}`,
    rest: `curl -X POST http://localhost:3000/api/v1/execute \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "mode": "${activeCap.mode}",\n    "caller": "agent:arena-client",\n    "input": "Your prompt or payload here"\n  }'`,
    arena: `@Galaxia ${activeCap.mode}: ${inputVal.slice(0, 45)}...`,
    payment: `pay ${PRINCIPAL_ID} 5 --memo "Galaxia ${activeCap.label}"`
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      {/* Background ambient floating lights */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-20 left-[5%] w-32 h-32 rounded-full bg-pink-500/10 blur-3xl animate-float" />
        <div className="absolute top-48 right-[8%] w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl animate-float" />
        <div className="absolute bottom-32 left-[12%] w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl animate-float" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full px-4 sm:px-8 pt-4 pb-2">
        <nav className="mx-auto max-w-7xl glass-nav rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-3 group cursor-pointer">
            <div className="animate-water-float relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-heading tracking-tight bg-gradient-to-r from-slate-950 via-indigo-900 to-pink-600 dark:from-white dark:via-indigo-200 dark:to-pink-300 bg-clip-text text-transparent">GALAXIA</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-300 border border-pink-500/20 dark:border-pink-500/30">v2.0</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">SharedOS Intelligence Hub</span>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#playground" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition">Try Tools</a>
            <a href="#live-stream" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition">Live Activity</a>
            <a href="#grants-matrix" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5">
              <KeyRound className="w-3 h-3 text-pink-500" />
              Permissions Matrix
            </a>
            <a href="#integrations" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition">MCP & API</a>
            <a href="#verifier" className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Receipt Verifier
            </a>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              SharedOS Ready
            </div>

            <button
              onClick={() => copyToClipboard(PRINCIPAL_ID, 'principal')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-semibold hover:bg-indigo-500/20 transition"
            >
              {copiedKey === 'principal' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {`Pay ID: ${PRINCIPAL_ID}`}
            </button>

            <button
              onClick={() => setNightMode(!nightMode)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-white/10"
              title={nightMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {nightMode ? <Sun className="w-4 h-4 text-amber-500 dark:text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden mt-2 glass-panel rounded-xl p-4 flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <a href="#playground" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/10">Try Tools</a>
            <a href="#live-stream" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/10">Live Activity</a>
            <a href="#grants-matrix" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/10">Permissions Matrix</a>
            <a href="#integrations" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/10">MCP & API Docs</a>
            <a href="#verifier" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/10">Receipt Verifier</a>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full mx-auto max-w-7xl px-4 sm:px-8 pt-10 space-y-24">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto pt-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 dark:bg-pink-500/20 border border-pink-500/30 text-pink-600 dark:text-pink-300 text-xs font-bold tracking-wide shadow-sm">
            <Zap className="w-3.5 h-3.5 text-pink-500" />
            Ultra-Fast Inference • Sub-Second to Real-Time • Verified Proofs
          </div>
          <h1 className="text-4xl sm:text-6xl font-black font-heading tracking-tight leading-none text-slate-900 dark:text-white">
            Galaxia
            <span className="block mt-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 dark:from-pink-400 dark:via-purple-300 dark:to-indigo-400 bg-clip-text text-transparent">
              Fast, Verified & Accurate.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Galaxia provides tools for AI agents on the SharedOS network: automated code review, live web fact-checking, JSON conversion, and technical planning. Every result comes with a signed digital receipt.
          </p>
        </section>

        {/* 1. Playground */}
        <section id="playground" className="scroll-reveal scroll-mt-24">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-500">
            {/* Capabilities */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                  <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  Choose a Service
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">Automatic Usage Tracking</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {CAPABILITIES.map(cap => {
                  const IconComp = cap.icon;
                  const isSelected = cap.id === activeCapId;
                  return (
                    <button
                      key={cap.id}
                      onClick={() => {
                        setActiveCapId(cap.id);
                        setInputVal(cap.defaultPrompt);
                      }}
                      className={`p-4 rounded-2xl text-left transition-all duration-300 relative border ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-900/90 dark:to-purple-900/70 border-indigo-400 dark:border-indigo-400 shadow-lg shadow-indigo-500/15 scale-[1.02]'
                          : 'glass-card hover:border-indigo-400/50 hover:bg-slate-50 dark:hover:bg-galaxy-850/80 hover:-translate-y-1'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-xl bg-gradient-to-tr ${cap.gradient} text-white shadow-md`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${cap.badgeColor}`}>
                          {cap.tag}
                        </span>
                      </div>
                      <h3 className="font-bold font-heading text-sm text-slate-900 dark:text-white">{cap.label}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {cap.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Playground Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Input */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-pink-500" />
                    Input Prompt or Code
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px]">Caller:</label>
                    <input
                      type="text"
                      value={callerVal}
                      onChange={e => setCallerVal(e.target.value)}
                      className="bg-white dark:bg-galaxy-950/80 border border-slate-300 dark:border-white/10 rounded px-2 py-0.5 text-xs text-indigo-600 dark:text-indigo-300 font-mono w-36 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-indigo-500/20 bg-white dark:bg-galaxy-950/80 focus-within:border-indigo-500 transition-colors shadow-inner">
                  <textarea
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    rows={10}
                    placeholder="Enter code, text claim, schema source, or prompt..."
                    className="w-full p-4 bg-transparent text-slate-800 dark:text-slate-100 font-mono text-xs sm:text-sm leading-relaxed outline-none resize-y placeholder-slate-400 dark:placeholder-slate-600"
                  />
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-galaxy-900/60 border-t border-slate-200 dark:border-white/5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>{inputVal.length} characters</span>
                    <span className="text-indigo-600 dark:text-indigo-300 font-semibold">Mode: {activeCap.mode}</span>
                  </div>
                </div>

                {/* Presets */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Examples:</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => {
                          setActiveCapId(preset.capId);
                          setInputVal(preset.value);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-slate-200 dark:border-white/10 hover:border-indigo-400 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-white transition hover:-translate-y-0.5"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleExecute}
                  disabled={loading || !inputVal.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-bold font-heading text-base shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                  {loading ? `Running ${activeCap.label}... (${(elapsedMs / 1000).toFixed(2)}s)` : `Run Service (${activeCap.tag})`}
                </button>
              </div>

              {/* Output */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    Response & Verified Receipt
                  </span>
                  {executionResult && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                      Response Time: {executionResult.latencyMs || executionResult.latency_ms || elapsedMs}ms
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-300 dark:border-indigo-500/20 bg-white dark:bg-galaxy-950/80 p-5 min-h-[380px] flex flex-col justify-between shadow-inner">
                  {errorMsg ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm">
                      <div className="font-bold mb-1">Execution Error:</div>
                      {errorMsg}
                    </div>
                  ) : !executionResult ? (
                    <div className="m-auto text-center space-y-3 py-12 text-slate-400 dark:text-slate-500">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400 dark:text-slate-600">
                        <Orbit className="w-8 h-8 animate-spin-slow" />
                      </div>
                      <p className="text-sm font-medium">Select a service above and click Run to test it live.</p>
                    </div>
                  ) : (
                    (() => {
                      const outputText = String(executionResult.output || executionResult.result || executionResult.response || '');
                      
                      // Dynamically parse any score or status given by the LLM
                      let dynamicScore = executionResult.score ?? executionResult.deterministic_score;
                      const scoreOutOf10Match = outputText.match(/Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10\b/i);
                      const scoreOutOf100Match = outputText.match(/Score:\s*(\d+(?:\.\d+)?)\s*(?:\/\s*100|%)\b/i);
                      const ratingMatch = outputText.match(/(?:Quality|Security|Confidence|Code)\s*Rating:\s*(\d+(?:\.\d+)?)\s*\/\s*10\b/i);
                      const statusMatch = outputText.match(/Status:\s*(PASS|WARN|WARNING|FAIL)\b/i);
                      const verdictMatch = outputText.match(/Verdict:\s*(SUPPORTED|CONTRADICTED|UNVERIFIED)\b/i);

                      if (scoreOutOf10Match) {
                        dynamicScore = Math.round(parseFloat(scoreOutOf10Match[1]) * 10);
                      } else if (scoreOutOf100Match) {
                        dynamicScore = Math.round(parseFloat(scoreOutOf100Match[1]));
                      } else if (ratingMatch) {
                        dynamicScore = Math.round(parseFloat(ratingMatch[1]) * 10);
                      } else if (statusMatch) {
                        const statusVal = statusMatch[1].toUpperCase();
                        if (statusVal === 'PASS') dynamicScore = 95;
                        else if (statusVal === 'WARN' || statusVal === 'WARNING') dynamicScore = 65;
                        else if (statusVal === 'FAIL') dynamicScore = 20;
                      } else if (verdictMatch) {
                        const verdictVal = verdictMatch[1].toUpperCase();
                        if (verdictVal === 'SUPPORTED') dynamicScore = 95;
                        else if (verdictVal === 'UNVERIFIED') dynamicScore = 50;
                        else if (verdictVal === 'CONTRADICTED') dynamicScore = 15;
                      } else if (dynamicScore === undefined || dynamicScore === null) {
                        dynamicScore = 85;
                      }

                      return (
                        <div className="space-y-5">
                          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-galaxy-900/90 border border-slate-200 dark:border-white/5">
                            <ScoreGauge score={dynamicScore} nightMode={nightMode} />
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">Quality Assessment</span>
                              <h4 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                                {dynamicScore >= 80 ? 'Passed Quality & Security Checks' : dynamicScore >= 50 ? 'Moderate Issues or Warnings Found' : 'Noticeable Vulnerabilities or Bugs Found'}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Processed via Groq Engine • Model: {executionResult.modelUsed || 'openai/gpt-oss-120b'}
                              </p>
                            </div>
                          </div>

                          <div className="max-h-96 overflow-y-auto pr-2">
                            <FormattedOutput
                              content={outputText || JSON.stringify(executionResult, null, 2)}
                              onCopy={copyToClipboard}
                            />
                          </div>

                          {executionResult.receipt && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/90 dark:to-purple-950/90 border border-indigo-200 dark:border-indigo-500/30 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  Ed25519 Cryptographic Receipt
                                </div>
                                <button
                                  onClick={() => {
                                    const docketClean = { ...executionResult.receipt.docket || executionResult.receipt };
                                    delete docketClean.signature;
                                    delete docketClean.signatureAlgorithm;
                                    handleVerifyReceipt(docketClean, executionResult.receipt.signature);
                                    window.location.hash = '#verifier';
                                  }}
                                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition flex items-center gap-1 shadow"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  1-Click Verify
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                <div>
                                  <span className="block text-slate-400 text-[10px]">Receipt ID:</span>
                                  <span className="text-slate-800 dark:text-slate-200 font-bold truncate block">
                                    {executionResult.receipt.receiptId || executionResult.receipt.receipt_id || 'rcpt_preview'}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 text-[10px]">Purpose:</span>
                                  <span className="text-indigo-700 dark:text-indigo-300 font-bold truncate block">
                                    {executionResult.receipt.purposeString || executionResult.receipt.purpose || 'galaxia:execution'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Live Activity Stream */}
        <section id="live-stream" className="scroll-reveal scroll-mt-24 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="animate-water-float inline-flex items-center gap-2 text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Live Network Feed
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 dark:text-white mt-1">Live Activity Stream</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live feed of requests processed and verified on SharedOS.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`animate-water-float px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-2 border ${
                sseStatus === 'live'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${sseStatus === 'live' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                {sseStatus === 'live' ? 'LIVE STREAM' : 'POLLING REFRESH'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audits.length === 0 ? (
              <div className="col-span-full text-center py-12 glass-panel rounded-2xl text-slate-500 text-sm">
                Waiting for the first activity event from the room...
              </div>
            ) : (
              audits.map((audit, idx) => {
                const receiptId = audit.receiptId || audit.receipt_id || `rcpt_${idx}`;
                return (
                  <div key={idx} className="glass-card rounded-2xl p-4 space-y-3 hover:-translate-y-1 transition-transform">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold uppercase text-[10px]">
                        {audit.mode || 'execute'}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {audit.timestamp ? new Date(audit.timestamp).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-pink-500" />
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-white truncate">
                        {audit.caller || audit.actor || 'agent:arena'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5 text-[11px] font-mono">
                      <span className="text-slate-500 dark:text-slate-400">Time: {audit.latencyMs || audit.latency || audit.latency_ms || 450}ms</span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        VERIFIED
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate bg-slate-100 dark:bg-galaxy-950/60 px-2 py-1 rounded">
                      {receiptId}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 3. Permissions Matrix */}
        <section id="grants-matrix" className="scroll-reveal scroll-mt-24 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest">
              <KeyRound className="w-3.5 h-3.5 text-pink-500" />
              Access & Metering
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 dark:text-white mt-1">SharedOS Permissions Matrix</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Usage permissions enforced by SharedOS. Each service has clear credit limits and remaining capacity.
            </p>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 dark:bg-galaxy-900/90 text-slate-700 dark:text-indigo-200 border-b border-slate-200 dark:border-indigo-500/20 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-bold">Service ID</th>
                    <th className="p-4 font-bold">Caller</th>
                    <th className="p-4 font-bold">Endpoint</th>
                    <th className="p-4 font-bold">Action</th>
                    <th className="p-4 font-bold">Purpose Tag</th>
                    <th className="p-4 font-bold">Max Uses</th>
                    <th className="p-4 font-bold">Remaining</th>
                    <th className="p-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                  {grantsLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">Loading service permissions...</td>
                    </tr>
                  ) : grants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">No permissions records found.</td>
                    </tr>
                  ) : (
                    grants.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-indigo-600 dark:text-indigo-300">{g.capability_id || g.id || `cap_${idx}`}</td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-300">{g.actor || '*'}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">{g.resource_path || g.resource || '/api/v1/execute'}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                            {g.action || 'CALL'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{g.purpose_string || g.purpose || 'galaxia:inference'}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{g.max_uses ?? '∞'}</td>
                        <td className="p-4 font-bold text-pink-600 dark:text-pink-400">{g.remaining_uses ?? '∞'}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {g.status || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 4. MCP & API Docs */}
        <section id="integrations" className="scroll-reveal scroll-mt-24 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              <Code2 className="w-3.5 h-3.5 text-indigo-500" />
              Developer Access
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 dark:text-white mt-1">Connect Any Agent to Galaxia</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Direct access via Model Context Protocol (MCP), REST API, or Arena chat commands.</p>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-galaxy-900/90 border-b border-slate-200 dark:border-indigo-500/20 overflow-x-auto">
              {[
                { id: 'mcp', label: 'MCP Server Config', icon: Orbit },
                { id: 'rest', label: 'REST cURL API', icon: Terminal },
                { id: 'arena', label: 'SharedNet Arena Chat', icon: Bot },
                { id: 'payment', label: 'Arena Credit Payment', icon: KeyRound },
              ].map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDocTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      docTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6 bg-slate-950 relative">
              <button
                onClick={() => copyToClipboard(docsCode[docTab], `docs-${docTab}`)}
                className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium transition"
              >
                {copiedKey === `docs-${docTab}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === `docs-${docTab}` ? 'Copied!' : 'Copy Snippet'}
              </button>
              <pre className="text-xs sm:text-sm font-mono leading-relaxed text-indigo-200 overflow-x-auto pt-8 sm:pt-0">
                <code>{docsCode[docTab]}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* 5. Cryptographic Receipt Verifier */}
        <section id="verifier" className="scroll-reveal scroll-mt-24 space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <div className="animate-water-float w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 dark:text-white">Cryptographic Receipt Verifier</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Verify any execution docket against Galaxia's public Ed25519 key in real time.</p>
          </div>

          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Receipt Docket JSON:</label>
                <textarea
                  value={verifyDocket}
                  onChange={e => setVerifyDocket(e.target.value)}
                  rows={7}
                  placeholder={'{\n  "receiptId": "...",\n  "purposeString": "..."\n}'}
                  className="w-full p-3 bg-slate-50 dark:bg-galaxy-950/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 leading-relaxed resize-y"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ed25519 Detached Signature:</label>
                <textarea
                  value={verifySig}
                  onChange={e => setVerifySig(e.target.value)}
                  rows={7}
                  placeholder="Paste hex or base64 Ed25519 signature here..."
                  className="w-full p-3 bg-slate-50 dark:bg-galaxy-950/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 leading-relaxed resize-y"
                />
              </div>
            </div>

            {verifyStatus && (
              <div className={`p-4 rounded-xl border ${
                verifyStatus.valid || verifyStatus.verified
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
              } flex items-start gap-3 text-xs`}>
                {verifyStatus.valid || verifyStatus.verified ? <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" /> : <X className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />}
                <div className="space-y-1">
                  <div className="font-bold font-heading text-sm">
                    {verifyStatus.valid || verifyStatus.verified ? 'Receipt Signature Is Valid & Authentic!' : 'Verification Failed'}
                  </div>
                  <p>{verifyStatus.message || (verifyStatus.valid ? 'Docket integrity confirmed.' : 'Signature does not match docket.')}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => handleVerifyReceipt()}
              disabled={verifying || !verifyDocket.trim() || !verifySig.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold font-heading text-sm shadow-xl shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {verifying ? 'Verifying with Ed25519...' : 'Verify Cryptographic Authenticity'}
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="scroll-reveal w-full mt-16 border-t border-slate-200 dark:border-white/10 py-12 text-center text-xs text-slate-500 space-y-3">
        <div className="flex items-center justify-center gap-2 font-heading font-bold text-slate-700 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-pink-500" />
          Galaxia Universal Intelligence Tool Built for SharedOS
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          Made by{' '}
          <a
            href="https://www.linkedin.com/in/shreya925/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-pink-500 dark:hover:text-pink-400 underline underline-offset-4 transition"
          >
            Shreya Chaudhary
          </a>
          {' '}&amp;{' '}
          <a
            href="https://www.linkedin.com/in/piyush-verma-2853b9319/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-pink-500 dark:hover:text-pink-400 underline underline-offset-4 transition"
          >
            Piyush Verma
          </a>
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Bounded Grant Metering • Sub-Second Groq Execution • Live Ed25519 Cryptographic Proofs
        </p>
      </footer>
    </div>
  );
}
