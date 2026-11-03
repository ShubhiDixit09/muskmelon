'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Settings, Zap, Clock, GitCompare, Mic, MicOff, Send,
  Plus, X, CheckCircle2, Volume2, VolumeX, Database, Shield,
  Sparkles, Cpu, FileText, ExternalLink, Check, Copy,
  Menu, RefreshCw, ChevronRight
} from 'lucide-react';
import { AnswerReceiptModal } from '@/components/answer-receipt';
import { createSpeechRecognizer } from '@/lib/voice';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */
type Mode = 'now' | 'time' | 'diff';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  receipt?: any;
  confidence?: number;
  timestamp?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  // ── Onboarding State ──────────────────────────────────────────────────
  const [onboardingPhase, setOnboardingPhase] = useState<1 | 2 | 'done'>(1);
  const [reporterName, setReporterName] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [onboardingFading, setOnboardingFading] = useState(false);

  // ── App State ─────────────────────────────────────────────────────────
  const [appVisible, setAppVisible] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<{
    modelKeyConfigured: boolean;
    weaviateConfigured: boolean;
  } | null>(null);
  const [mode, setMode] = useState<Mode>('now');
  const [asOfDate, setAsOfDate] = useState('2023-01-01');
  const [compareDates, setCompareDates] = useState<[string, string]>(['2021-02-01', '2021-06-01']);
  const [input, setInput] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // ── Conversation ──────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── CRT Screen Typewriter ─────────────────────────────────────────────
  const [screenText, setScreenText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  // ── Panels ────────────────────────────────────────────────────────────
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // ── Voice Input ───────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // ── Receipt ───────────────────────────────────────────────────────────
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // ── Date ───────────────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState('');

  // ── Refs ───────────────────────────────────────────────────────────────
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const crtContentRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════

  // Server-side configuration status (keys are never sent to the browser).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/health', { cache: 'no-store' })
      .then(res => { if (!res.ok) throw new Error('Health endpoint unavailable'); return res.json(); })
      .then(status => { if (!cancelled) setServiceStatus(status); })
      .catch(() => { if (!cancelled) setServiceStatus(null); });
    return () => { cancelled = true; };
  }, []);

  // Set date on mount
  useEffect(() => {
    try {
      setCurrentDate(new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }));
    } catch { /* fallback */ }
  }, []);

  // Auto-scroll CRT content
  useEffect(() => {
    if (crtContentRef.current) {
      crtContentRef.current.scrollTop = crtContentRef.current.scrollHeight;
    }
  }, [screenText]);

  // ═══════════════════════════════════════════════════════════════════════
  // TYPEWRITER ENGINE
  // ═══════════════════════════════════════════════════════════════════════

  const typeText = useCallback((text: string, onDone?: () => void) => {
    if (typingRef.current) clearInterval(typingRef.current);
    setIsTyping(true);
    setScreenText('');
    let i = 0;
    typingRef.current = setInterval(() => {
      if (i < text.length) {
        const char = text.charAt(i);
        setScreenText(prev => prev + char);
        i++;
      } else {
        if (typingRef.current) clearInterval(typingRef.current);
        typingRef.current = null;
        setIsTyping(false);
        onDone?.();
      }
    }, 25);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // AMBIENT PARTICLES
  // ═══════════════════════════════════════════════════════════════════════

  const initParticles = useCallback(() => {
    if (!particlesRef.current) return;
    const container = particlesRef.current;
    container.innerHTML = '';

    const createParticle = () => {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 3 + 1;
      const x = Math.random() * 100;
      const dur = Math.random() * 10 + 10;
      const delay = Math.random() * 10;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${x}vw`;
      p.style.animationDuration = `${dur}s`;
      p.style.animationDelay = `${delay}s`;
      container.appendChild(p);
      setTimeout(() => { p.remove(); createParticle(); }, (dur + delay) * 1000);
    };

    for (let i = 0; i < 25; i++) createParticle();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // ONBOARDING
  // ═══════════════════════════════════════════════════════════════════════

  const handleNextPhase = () => {
    if (!reporterName.trim()) {
      setReporterName('Reporter');
    }
    setOnboardingPhase(2);

    // Simulate loading progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setLoadingProgress(progress);
    }, 300);
  };

  const handleEnterRoom = () => {
    setOnboardingFading(true);
    setTimeout(() => {
      setOnboardingPhase('done');
      setAppVisible(true);
      initParticles();
      const name = reporterName.trim() || 'Reporter';
      setTimeout(() => {
        typeText(`System initialized. Welcome, ${name}. Ask me anything about engineering, physics, Mars, or the future of humanity. I have opinions on all of them.`);
        textareaRef.current?.focus();
      }, 500);
    }, 1200);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SEND MESSAGE
  // ═══════════════════════════════════════════════════════════════════════

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isTyping) return;

    const userMsg = input.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setInput('');
    setIsLoading(true);
    setShowThinking(true);
    setScreenText('');

    const newMsgList: Message[] = [...messages, { role: 'user', content: userMsg, timestamp: timeStr }];
    setMessages(newMsgList);

    try {
      if (mode === 'diff') {
        const res = await fetch('/api/diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: userMsg,
            date1: compareDates[0],
            date2: compareDates[1]
          })
        });
        const data = await res.json();
        const replyText = `Belief shift for "${userMsg}" between ${compareDates[0]} and ${compareDates[1]}:\n\n${data.diff.whatChanged}\n\n${data.diff.whyChanged}`;
        setShowThinking(false);
        const responseTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        typeText(replyText, () => {
          setScreenText('');
          setMessages([...newMsgList, { role: 'assistant', content: replyText, timestamp: responseTimeStr }]);
        });
      } else {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMsg,
            mode,
            asOfDate: mode === 'time' ? asOfDate : undefined,
            history: messages
          })
        });
        const data = await res.json();
        const responseText = data.message || data.error || "Connection established. What engineering or physics problem are we tackling?";
        if (data.receipt) setActiveReceipt(data.receipt);
        setShowThinking(false);
        const responseTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        typeText(responseText, () => {
          setScreenText('');
          setMessages([...newMsgList, {
            role: 'assistant',
            content: responseText,
            receipt: data.receipt,
            confidence: data.confidence ?? 0,
            timestamp: responseTimeStr
          }]);
        });
      }
    } catch (error) {
      console.error(error);
      setShowThinking(false);
      typeText("Connection error. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // VOICE INPUT
  // ═══════════════════════════════════════════════════════════════════════

  const handleMicToggle = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setVoiceError(null);
    const recognition = createSpeechRecognizer(
      (transcript) => {
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      },
      () => { setIsListening(false); },
      (err) => { setVoiceError(err); setIsListening(false); }
    );
    if (recognition) {
      try { setIsListening(true); recognition.start(); }
      catch { setIsListening(false); }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleNewSession = () => {
    setMessages([]);
    setScreenText('');
    setIsTyping(false);
    setActiveReceipt(null);
    if (typingRef.current) clearInterval(typingRef.current);
    typeText("New session initialized. What would you like to explore?");
  };

  const handleClearMessages = () => {
    setMessages([]);
    setScreenText('');
    if (typingRef.current) clearInterval(typingRef.current);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
           ONBOARDING SCREEN
           ══════════════════════════════════════════════════════════════════ */}
      {onboardingPhase !== 'done' && (
        <div
          className={`onboarding-screen ${onboardingFading ? 'fade-out' : ''}`}
          style={{
            backgroundImage: "url('/bg-elon-clean.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Phase 1 — Name */}
          {onboardingPhase === 1 && (
            <div className="onboarding-phase">
              <h1 style={{
                fontFamily: "'Special Elite', var(--font-special-elite), serif",
                fontWeight: 400,
                fontSize: '2.2rem',
                color: '#fb923c',
                marginBottom: '0.5rem',
                textShadow: '0 2px 12px rgba(249, 115, 22, 0.3)'
              }}>
                Muskmelon
              </h1>
              <p style={{
                fontSize: '0.92rem',
                lineHeight: 1.5,
                color: '#94a3b8',
                marginBottom: '2rem'
              }}>
                Version-Controlled Knowledge Twin<br />
                of Elon Musk<br />
                <span style={{ display: 'block', marginTop: '1.2rem', color: '#64748b', fontStyle: 'italic' }}>
                  Visitor Sign-in:
                </span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="Enter your name"
                  value={reporterName}
                  onChange={e => setReporterName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNextPhase(); }}
                  autoFocus
                />
                <button className="btn-primary" onClick={handleNextPhase} style={{ marginTop: '0.5rem' }}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Phase 2 — Loading */}
          {onboardingPhase === 2 && (
            <div className="onboarding-phase" style={{ animation: 'fadeIn 0.5s ease' }}>
              <h2 style={{
                fontFamily: "'Special Elite', var(--font-special-elite), serif",
                fontWeight: 400,
                color: '#fb923c',
                fontSize: '1.8rem',
                marginBottom: '1rem'
              }}>
                Starbase Control Room
              </h2>
              <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                Initializing knowledge vectors and loading Elon&apos;s digital twin...
              </p>
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="loading-bar-container">
                  <div className="loading-bar" style={{ width: `${loadingProgress}%` }} />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', fontFamily: 'var(--font-screen)' }}>
                  {loadingProgress < 100 ? `Loading knowledge base... ${Math.round(loadingProgress)}%` : '✓ Knowledge base ready'}
                </p>
              </div>
              {loadingProgress >= 100 && (
                <button className="btn-primary" onClick={handleEnterRoom} style={{ animation: 'fadeIn 0.5s ease' }}>
                  Enter the Room
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           MAIN APP
           ══════════════════════════════════════════════════════════════════ */}
      {appVisible && (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

          {/* ── Scene Background ──────────────────────────────────────── */}
          <div className="scene-container">
            <div className="scene-background">
              <img src="/bg-elon-clean.png" alt="Elon's Command Center" />
            </div>
          </div>

          {/* ── Dark Vignette ─────────────────────────────────────────── */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 70% 40%, transparent 30%, rgba(4, 7, 17, 0.5) 100%), linear-gradient(180deg, rgba(4, 7, 17, 0.3) 0%, transparent 15%, transparent 75%, rgba(4, 7, 17, 0.7) 100%)',
            pointerEvents: 'none',
            zIndex: 2
          }} />

          {/* ── Ambient Particles ─────────────────────────────────────── */}
          <div className="ambient-particles" ref={particlesRef} />

          {/* ── Top Nav Bar ───────────────────────────────────────────── */}
          <nav className="top-nav">
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #ef4444 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(249, 115, 22, 0.3)',
                flexShrink: 0
              }}>
                <span style={{ fontWeight: 900, fontSize: '17px', color: '#fff', lineHeight: 1 }}>M</span>
                <span style={{
                  position: 'absolute', bottom: '-1px', right: '-1px',
                  width: '9px', height: '9px', borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  border: '2px solid rgba(8, 12, 24, 0.9)',
                  boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)'
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.04em', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Muskmelon</span>
                  <span style={{
                    fontSize: '9px', padding: '2px 7px', borderRadius: '6px',
                    background: 'rgba(249, 115, 22, 0.2)',
                    color: '#fb923c', fontWeight: 600
                  }}>v4.2 Pro</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>
                  Version-Controlled Knowledge Twin
                </div>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="mode-switcher">
              <button
                className={`mode-btn ${mode === 'now' ? 'active-now' : ''}`}
                onClick={() => setMode('now')}
              >
                <Zap size={14} style={{ opacity: mode === 'now' ? 1 : 0.6 }} />
                <span>Now Mode</span>
              </button>
              <button
                className={`mode-btn ${mode === 'time' ? 'active-time' : ''}`}
                onClick={() => setMode('time')}
              >
                <Clock size={14} style={{ opacity: mode === 'time' ? 1 : 0.6 }} />
                <span>Time Lens</span>
              </button>
              <button
                className={`mode-btn ${mode === 'diff' ? 'active-diff' : ''}`}
                onClick={() => setMode('diff')}
              >
                <GitCompare size={14} style={{ opacity: mode === 'diff' ? 1 : 0.6 }} />
                <span>Belief Diff</span>
              </button>
            </div>

            {/* Right Status Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                borderRadius: '9999px', fontSize: '10px', fontWeight: 600, color: '#7dd3fc'
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 4px rgba(56, 189, 248, 0.5)' }} />
                <span>{serviceStatus === null ? 'Checking archive' : serviceStatus.weaviateConfigured ? 'Weaviate configured' : 'Bundled archive'}</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                borderRadius: '9999px', fontSize: '10px', fontWeight: 600, color: '#6ee7b7'
              }}>
                <Shield size={11} style={{ opacity: 0.85 }} />
                <span>{serviceStatus === null ? 'Checking model' : serviceStatus.modelKeyConfigured ? 'LLM key configured' : 'LLM key missing'}</span>
              </div>
              <Link
                href="/admin"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '9999px', fontSize: '10px', fontWeight: 600,
                  color: '#e2e8f0', textDecoration: 'none', transition: 'all 0.2s ease'
                }}
              >
                <Database size={12} color="#fb923c" />
                <span>Audit Admin</span>
              </Link>
            </div>
          </nav>

          {/* ── Left: Sessions Toggle ─────────────────────────────────── */}
          <button
            className="btn-icon btn-sessions-toggle"
            onClick={() => setSessionsOpen(!sessionsOpen)}
            title="Chat Sessions"
            style={{ top: '76px' }}
          >
            <Menu size={20} />
          </button>

          {/* ── Right: Settings Toggle ────────────────────────────────── */}
          <button
            className="btn-icon btn-settings-toggle"
            onClick={() => setSettingsOpen(!settingsOpen)}
            title="Settings & Memory"
            style={{ top: '76px' }}
          >
            <Settings size={18} />
          </button>

          {/* ── Mode Parameters (Time/Diff date inputs) ──────────────── */}
          {mode === 'time' && (
            <div style={{
              position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 60, padding: '8px 20px',
              background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(245, 158, 11, 0.5)', borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: '12px',
              fontSize: '12px', boxShadow: '0 0 20px rgba(245, 158, 11, 0.12)'
            }}>
              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-screen)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Knowledge As Of:
              </span>
              <input
                type="date" className="date-input"
                value={asOfDate}
                min="2010-01-01" max="2025-12-31"
                onChange={e => setAsOfDate(e.target.value)}
              />
            </div>
          )}

          {mode === 'diff' && (
            <div style={{
              position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 60, padding: '8px 20px',
              background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(168, 85, 247, 0.5)', borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '11px', boxShadow: '0 0 20px rgba(168, 85, 247, 0.12)'
            }}>
              <span style={{ color: '#c084fc', fontFamily: 'var(--font-screen)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GitCompare size={14} /> Compare Eras:
              </span>
              <input type="date" className="date-input" value={compareDates[0]} min="2010-01-01" max="2025-12-31" onChange={e => setCompareDates([e.target.value, compareDates[1]])} />
              <span style={{ color: '#64748b' }}>vs</span>
              <input type="date" className="date-input" value={compareDates[1]} min="2010-01-01" max="2025-12-31" onChange={e => setCompareDates([compareDates[0], e.target.value])} />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
               SPEECH SCREEN (Physical monitor in front of Elon — Hawking style)
               ══════════════════════════════════════════════════════════════ */}
          <div className="speech-screen">
            {/* Bezel frame */}
            <div className="speech-bezel">
              {/* Screen content area */}
              <div className="speech-content" ref={crtContentRef}>

                {/* Thinking indicator */}
                {showThinking && (
                  <div className="thinking-indicator" style={{ justifyContent: 'center', padding: '30px 0' }}>
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                  </div>
                )}

                {/* Live typewriter text (current response) */}
                {screenText && !showThinking && (
                  <div>
                    <span>{screenText}</span>
                    {isTyping && <span className="cursor-blink" />}
                  </div>
                )}

                {/* Last completed response (when typewriter done) */}
                {!screenText && !showThinking && messages.length > 0 && (() => {
                  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                  return lastAssistant ? (
                    <div>
                      <span>{lastAssistant.content}</span>
                      <span className="cursor-blink" />
                    </div>
                  ) : null;
                })()}

                {/* Empty state */}
                {!screenText && !showThinking && messages.length === 0 && (
                  <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px 0' }}>
                    System ready. Ask me anything...
                    <span className="cursor-blink" />
                  </div>
                )}
              </div>
            </div>

            {/* Thinking indicator dots below screen */}
            {showThinking && (
              <div style={{
                position: 'absolute', bottom: '8px', right: '12px',
                display: 'flex', gap: '4px'
              }}>
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
            )}

            {/* View Chat button — bottom of the screen */}
            {messages.length > 0 && (
              <button
                onClick={() => setChatOpen(true)}
                style={{
                  position: 'absolute', bottom: '-32px', right: '0',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1', cursor: 'pointer',
                  padding: '4px 14px', borderRadius: '0 0 8px 8px',
                  fontSize: '10px', fontFamily: 'var(--font-screen)',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.2s'
                }}
              >
                <FileText size={11} />
                <span>View Chat ({messages.length})</span>
              </button>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════
               FULL CHAT HISTORY PANEL
               ══════════════════════════════════════════════════════════════ */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: '420px', maxWidth: '90vw', height: '100%',
            backgroundColor: 'rgba(8, 12, 22, 0.95)',
            backdropFilter: 'blur(16px)',
            borderLeft: '1px solid rgba(56, 189, 248, 0.15)',
            zIndex: 200,
            display: 'flex', flexDirection: 'column',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
            transform: chatOpen ? 'translateX(0)' : 'translateX(100%)'
          }}>
            {/* Chat Panel Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={16} color="#38bdf8" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                    Chat History
                  </h3>
                  <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'var(--font-screen)' }}>
                    {messages.length} messages
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleNewSession}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px',
                    fontSize: '11px', fontFamily: 'var(--font-screen)', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Plus size={12} /> New
                </button>
                <button
                  className="btn-icon"
                  onClick={() => setChatOpen(false)}
                  style={{ width: '28px', height: '28px' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(56, 189, 248, 0.2) transparent' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '13px' }}>
                  No messages yet. Ask a question to start.
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                      color: m.role === 'user' ? '#34d399' : '#38bdf8',
                      marginBottom: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {m.role === 'user' ? 'YOU' : (
                          <><Zap size={10} /> ELON MUSK</>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {m.timestamp && <span style={{ color: '#475569', fontSize: '9px' }}>{m.timestamp}</span>}
                        {m.role === 'assistant' && (
                          <button
                            onClick={() => handleCopy(m.content, idx)}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '1px' }}
                          >
                            {copiedIdx === idx ? <Check size={10} color="#34d399" /> : <Copy size={10} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{
                      color: m.role === 'user' ? '#94a3b8' : '#e2e8f0',
                      fontSize: '12.5px', lineHeight: 1.6,
                      paddingLeft: '8px',
                      borderLeft: m.role === 'user' ? '2px solid rgba(52, 211, 153, 0.3)' : '2px solid rgba(56, 189, 248, 0.3)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {m.content}
                    </div>

                    {/* Receipt badge */}
                    {m.role === 'assistant' && m.receipt && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontSize: '10px', fontFamily: 'var(--font-screen)', paddingLeft: '8px', marginTop: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                          <CheckCircle2 size={10} />
                          <span>{(m.confidence ?? 0) > 0 ? `${Math.round((m.confidence ?? 0) * 100)}% Grounded (estimate)` : 'Archive source — not verified'}</span>
                        </div>
                        <button
                          onClick={() => { setSelectedReceipt(m.receipt); setShowReceiptModal(true); }}
                          style={{
                            background: 'none', border: 'none', color: '#38bdf8',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                            fontWeight: 700, fontSize: '10px'
                          }}
                        >
                          <span>Receipt</span>
                          <ExternalLink size={9} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
               PRESS NOTEBOOK (Input Area)
               ══════════════════════════════════════════════════════════════ */}
          <div className="notebook-container">
            <div className="notebook">
              <div className="notebook-spine" />
              <div className="notebook-page">
                <div className="notebook-header">
                  <span className="notebook-label">PRESS NOTEBOOK</span>
                  <span className="notebook-date">{currentDate}</span>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      className="notebook-input"
                      placeholder="Type your question to Elon Musk..."
                      rows={2}
                      maxLength={2000}
                      disabled={isLoading}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
                      }}
                      style={{ flex: 1 }}
                    />

                    {voiceError && (
                      <div style={{ fontSize: '11px', color: '#dc2626', marginBottom: '4px' }}>
                        {voiceError}
                      </div>
                    )}

                    <div className="notebook-footer">
                      <span className="char-count">{input.length} / 2000</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Mic button */}
                        <button
                          type="button"
                          onClick={handleMicToggle}
                          title={isListening ? "Listening... click to stop" : "Voice Input"}
                          className={`nb-action-btn ${isListening ? 'recording' : ''}`}
                        >
                          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>

                        {/* Voice toggle */}
                        <button
                          type="button"
                          onClick={() => setVoiceEnabled(!voiceEnabled)}
                          title={voiceEnabled ? "Voice enabled" : "Voice muted"}
                          className="nb-action-btn"
                          style={{ color: voiceEnabled ? '#b45309' : '#a8a29e' }}
                        >
                          {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>

                        {/* Send button */}
                        <button
                          type="submit"
                          disabled={!input.trim() || isLoading || isTyping}
                          className="send-btn"
                        >
                          <span>Ask</span>
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
               SESSIONS PANEL (Left Slide-out)
               ══════════════════════════════════════════════════════════════ */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '300px', height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            borderRight: '1px solid rgba(56, 189, 248, 0.2)',
            zIndex: 150,
            display: 'flex', flexDirection: 'column',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '10px 0 30px rgba(0, 0, 0, 0.5)',
            transform: sessionsOpen ? 'translateX(0)' : 'translateX(-100%)'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Chat Sessions</h3>
              <button className="btn-icon" onClick={() => setSessionsOpen(false)} style={{ width: '28px', height: '28px' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '15px 20px' }}>
              <button
                onClick={() => { handleNewSession(); setSessionsOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  background: 'transparent', border: '1px solid rgba(56, 189, 248, 0.2)',
                  color: '#f1f5f9', padding: '10px', borderRadius: '8px',
                  fontFamily: 'inherit', fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s'
                }}
              >
                <Plus size={15} /> New Session
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '10px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
              {messages.length > 0 ? (
                <div style={{
                  padding: '12px 15px', borderRadius: '8px', marginBottom: '8px',
                  background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #38bdf8', textAlign: 'left'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1' }}>
                    {messages[0]?.content.slice(0, 40)}...
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                    {messages.length} messages • Active
                  </div>
                </div>
              ) : (
                <p style={{ padding: '20px' }}>No previous sessions</p>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
               SETTINGS & MEMORY PANEL (Right Slide-out)
               ══════════════════════════════════════════════════════════════ */}
          <div style={{
            position: 'absolute', top: '70px', right: '20px',
            width: '380px', maxHeight: 'calc(100vh - 100px)',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            display: 'flex', flexDirection: 'column',
            zIndex: 100, overflow: 'hidden',
            transform: settingsOpen ? 'translateX(0)' : 'translateX(120%)',
            opacity: settingsOpen ? 1 : 0,
            pointerEvents: settingsOpen ? 'auto' : 'none',
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>⚙️ Settings & Memory</h3>
              <button className="btn-icon" onClick={() => setSettingsOpen(false)} style={{ width: '28px', height: '28px' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* Voice toggle */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '12px' }}>
                  Settings
                </h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <input type="checkbox" checked={voiceEnabled} onChange={() => setVoiceEnabled(!voiceEnabled)} />
                  Enable Voice Synthesizer
                </label>
              </div>

              {/* Session stats */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '12px' }}>
                  Session Info
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Messages', value: messages.length, color: '#38bdf8' },
                    { label: 'Topics', value: new Set(messages.filter(m => m.role === 'user').map(m => m.content.split(' ')[0])).size, color: '#f59e0b' },
                    { label: 'APIs', value: 10, color: '#34d399' }
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px', padding: '14px 10px', textAlign: 'center'
                    }}>
                      <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 700, color: stat.color, fontFamily: 'var(--font-screen)' }}>
                        {stat.value}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clear buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => { handleClearMessages(); setSettingsOpen(false); }}
                  style={{
                    width: '100%', background: 'transparent', border: '1px solid #b45309',
                    color: '#fcd34d', padding: '8px 12px', borderRadius: '8px',
                    fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  🗑️ Clear Current Conversation
                </button>
                <button
                  onClick={() => { handleClearMessages(); setSettingsOpen(false); }}
                  style={{
                    width: '100%', background: 'transparent', border: '1px solid #7f1d1d',
                    color: '#fca5a5', padding: '8px 12px', borderRadius: '8px',
                    fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  ⚠️ Clear All Conversations
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Receipt Modal ──────────────────────────────────────────────── */}
      {showReceiptModal && selectedReceipt && (
        <AnswerReceiptModal
          receipt={selectedReceipt}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </>
  );
}
