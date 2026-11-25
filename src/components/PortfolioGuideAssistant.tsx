import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Compass,
  ExternalLink,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useAppState } from '../state/AppStateContext';

interface NavSuggestion {
  label: string;
  route: string;
  landmarkId?: string;
}

interface ChatEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  suggestions?: NavSuggestion[];
}

const SUGGESTED_QUESTIONS: string[] = [
  'Who is Sanjaya?',
  'What projects has he developed?',
  'What technologies does he use?',
  'Tell me about the SmartMove project.',
  'How can I contact him?',
  'Where can I find the projects building?',
];

export const PortfolioGuideAssistant: React.FC = () => {
  const {
    assistantOpen,
    setAssistantOpen,
    worldPhase,
    touchHudActive,
    currentWorldZone,
    driveToWorldLandmark,
  } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isWorldRoute = location.pathname === '/';
  const hideTrigger = isWorldRoute && (worldPhase === 'loading' || worldPhase === 'photomode');

  useEffect(() => {
    if (!assistantOpen) return;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, assistantOpen, errorMsg]);

  useEffect(() => {
    if (!assistantOpen) return;
    let cancelled = false;
    void fetch('/api/assistant/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { available?: boolean } | null) => {
        if (!cancelled && data && typeof data.available === 'boolean') {
          setServiceAvailable(data.available);
        }
      })
      .catch(() => {
        if (!cancelled) setServiceAvailable(false);
      });
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [assistantOpen]);

  const sendPrompt = async (promptText: string, appendUserBubble = true) => {
    const trimmed = promptText.replace(/\s+/g, ' ').trim();
    if (!trimmed || loading) return;

    setErrorMsg(null);
    setLastFailedPrompt(null);

    const historySnapshot = messages.slice(-8).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    if (appendUserBubble) {
      setMessages((prev) => [
        ...prev,
        { id: `u_${Date.now()}`, role: 'user', text: trimmed },
      ]);
      setInput('');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historySnapshot,
          currentRoute: location.pathname,
          currentZone: currentWorldZone,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        suggestions?: NavSuggestion[];
        error?: string;
        code?: string;
      };

      if (!res.ok || !data.reply) {
        if (res.status === 503) setServiceAvailable(false);
        setLastFailedPrompt(trimmed);
        setErrorMsg(
          data.error ||
            'The AI Portfolio Guide could not answer right now. All portfolio pages remain accessible.',
        );
        return;
      }

      setServiceAvailable(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          role: 'model',
          text: data.reply!,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        },
      ]);
    } catch {
      setLastFailedPrompt(trimmed);
      setErrorMsg(
        'Network error reaching the AI Portfolio Guide. You can continue exploring all portfolio sections.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(input, true);
  };

  const handleNavAction = (item: NavSuggestion) => {
    if (isWorldRoute && item.landmarkId && driveToWorldLandmark(item.landmarkId)) {
      setAssistantOpen(false);
      return;
    }
    setAssistantOpen(false);
    navigate(item.route);
  };

  const handleReset = () => {
    setMessages([]);
    setErrorMsg(null);
    setLastFailedPrompt(null);
  };

  if (hideTrigger && !assistantOpen) return null;

  // Position cleanly so it never overlaps 3D GameHUD top controls, Minimap, or mobile TouchControls
  const buttonPositionClass = isWorldRoute
    ? worldPhase === 'playing' || worldPhase === 'paused'
      ? touchHudActive
        ? 'top-[68px] right-3 sm:top-[74px] sm:right-5'
        : 'top-[68px] right-3 md:top-auto md:bottom-[220px] md:right-5'
      : 'bottom-16 right-4 sm:bottom-6 sm:right-6'
    : 'bottom-4 right-4 sm:bottom-6 sm:right-6';

  return (
    <>
      {!assistantOpen && (
        <button
          type="button"
          data-testid="ai-guide-fab"
          tabIndex={isWorldRoute ? -1 : 0}
          aria-label="Open AI Portfolio Guide"
          onClick={(e) => {
            e.currentTarget.blur();
            setAssistantOpen(true);
          }}
          className={`fixed ${buttonPositionClass} z-30 ui-btn ui-btn-dark px-3.5 py-2.5 shadow-[0_4px_0_#EC6D2C]`}
        >
          <Sparkles className="w-4 h-4 text-[#EC6D2C] shrink-0" />
          <span className="text-xs sm:text-sm font-extrabold tracking-wide">AI Guide</span>
        </button>
      )}

      {assistantOpen && (
        <>
          <div
            className="sm:hidden fixed inset-0 z-30 bg-[#26211E]/35"
            onClick={() => setAssistantOpen(false)}
            aria-hidden="true"
          />
          <div
            data-testid="ai-guide-panel"
            role="dialog"
            aria-label="Sanjaya's World AI Portfolio Guide"
            className="animate-modal-pop ui-modal-panel fixed z-40 inset-x-3 bottom-4 sm:inset-x-auto sm:right-5 sm:bottom-6 sm:w-[400px] h-[min(560px,calc(100dvh-5.5rem))] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-[#F5E9D4] border-b border-[#D9C3A3] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#EC6D2C] border-[1.5px] border-[#26211E] flex items-center justify-center text-[#FFF9F0] shrink-0 shadow-[0_2px_0_#26211E]">
                  <MessageSquareText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#26211E] leading-none truncate">
                    SANJAYA&apos;S AI GUIDE
                  </h2>
                  <p className="text-[11px] font-bold text-[#61564E] truncate">
                    {serviceAvailable === false
                      ? 'AI temporarily offline · Portfolio pages active'
                      : 'Verified portfolio & 3D world guide'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    aria-label="Clear conversation"
                    title="New conversation"
                    className="ui-btn ui-btn-outline w-8 h-8 p-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  aria-label="Close AI Portfolio Guide"
                  className="ui-btn ui-btn-outline w-8 h-8 p-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Messages & Suggested Prompts */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#FFF9F0]">
              <div className="p-3.5 ui-card-sand text-xs sm:text-sm font-semibold text-[#26211E] leading-relaxed">
                Hi! Ask me anything about <strong>Sanjaya Lakshan</strong>—his NIBM studies, freelance experience since 2023, 11 projects, tech stack, services, contact info, or where to drive next in the 3D world.
              </div>

              {messages.length === 0 && (
                <div>
                  <div className="text-[10px] font-extrabold tracking-wider text-[#61564E] mb-1.5">
                    SUGGESTED QUESTIONS
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={loading}
                        onClick={() => void sendPrompt(q, true)}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-[#F5E9D4] border border-[#D9C3A3] hover:border-[#26211E] text-xs font-bold text-[#26211E] hover:bg-[#FFE08A] transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      m.role === 'user'
                        ? 'bg-[#EC6D2C] text-[#FFF9F0] border-[1.5px] border-[#26211E] font-bold rounded-br-sm'
                        : 'bg-[#F5E9D4] text-[#26211E] border border-[#D9C3A3] font-semibold rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.role === 'model' && m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[92%]">
                      {m.suggestions.map((nav) => (
                        <button
                          key={nav.route}
                          type="button"
                          onClick={() => handleNavAction(nav)}
                          className="ui-btn ui-btn-accent px-2.5 py-1 text-[11px]"
                        >
                          {isWorldRoute && nav.landmarkId ? (
                            <Compass className="w-3 h-3 shrink-0" />
                          ) : (
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          )}
                          <span>
                            {isWorldRoute && nav.landmarkId
                              ? `Drive to ${nav.label.split(' (')[0].replace('View ', '')}`
                              : nav.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div
                  data-testid="ai-typing-indicator"
                  aria-live="polite"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#F5E9D4] border border-[#D9C3A3] text-xs font-extrabold text-[#61564E]"
                >
                  <span>Thinking</span>
                  <span className="inline-flex items-center gap-1" aria-hidden="true">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EC6D2C] animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EC6D2C] animate-bounce [animation-delay:-0.1s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EC6D2C] animate-bounce" />
                  </span>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  data-testid="ai-error-banner"
                  className="p-3 rounded-xl bg-[#FFF9F0] border-2 border-[#E65448] text-xs font-bold text-[#26211E] space-y-2"
                >
                  <div className="flex items-start gap-2 text-[#E65448]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                  {lastFailedPrompt && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void sendPrompt(lastFailedPrompt, false)}
                      className="ui-btn ui-btn-secondary px-2.5 py-1 text-[11px]"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Question</span>
                    </button>
                  )}
                </div>
              )}

              <div ref={listEndRef} />
            </div>

            {/* Input Composer */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-[#F5E9D4] border-t border-[#D9C3A3] flex items-center gap-2 shrink-0"
            >
              <label htmlFor="ai-guide-input" className="sr-only">
                Ask Sanjaya&apos;s Portfolio Guide a question
              </label>
              <input
                ref={inputRef}
                id="ai-guide-input"
                type="text"
                maxLength={500}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Sanjaya, projects, skills..."
                className="ui-input py-2 px-3 text-xs sm:text-sm"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="ui-btn ui-btn-primary w-10 h-10 p-0 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
};
