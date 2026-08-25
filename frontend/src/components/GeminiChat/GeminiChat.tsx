/**
 * GeminiChat.tsx
 * ──────────────
 * Gemini-Clone-style floating chat widget.
 *
 * Design directly mirrors the Gemini-Clone-main structure:
 *   • Sidebar  (New Chat + recent prompts + Help/Activity/Settings icons)
 *   • Main     (Greeting + suggestion cards  OR  result panel)
 *   • Bottom   (Textarea search bar with send, mic, gallery buttons)
 *
 * The component wraps itself in <GeminiContextProvider> so it is
 * fully self-contained — no changes needed in App context providers.
 *
 * AI calls go to the Django backend via nyayaAPI.chat() (not directly
 * to the Gemini SDK), so the API key stays server-side.
 */

import React, { useRef, useState, useEffect } from 'react';
import './GeminiChat.css';
import { GeminiContextProvider, useGemini } from '../../context/GeminiContext';

// ─── Asset imports ────────────────────────────────────────────────────────────
// Icons copied from Gemini-Clone-main/src/assets/ into frontend/src/assets/gemini/
import geminiIcon   from '../../assets/gemini/gemini_icon.png';
import userIcon     from '../../assets/gemini/user_icon.png';
import sendIcon     from '../../assets/gemini/send_icon.png';
import micIcon      from '../../assets/gemini/mic_icon.png';
import galleryIcon  from '../../assets/gemini/gallery_icon.png';
import compassIcon  from '../../assets/gemini/compass_icon.png';
import bulbIcon     from '../../assets/gemini/bulb_icon.png';
import messageIcon  from '../../assets/gemini/message_icon.png';
import codeIcon     from '../../assets/gemini/code_icon.png';
import menuIcon     from '../../assets/gemini/menu_icon.png';
import plusIcon     from '../../assets/gemini/plus_icon.png';
import historyIcon  from '../../assets/gemini/history_icon.png';
import questionIcon from '../../assets/gemini/question_icon.png';
import settingIcon  from '../../assets/gemini/setting_icon.png';

// ─── Suggestion cards ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { text: 'What are my rights as a tenant under Indian law?',  icon: compassIcon },
  { text: 'Explain consumer protection rights under the Consumer Protection Act 2019', icon: bulbIcon },
  { text: 'How do I file a complaint against police inaction?', icon: messageIcon },
  { text: 'What is the difference between FIR and complaint in Indian law?', icon: codeIcon },
];

// ─── Inner component (uses context) ──────────────────────────────────────────

function GeminiChatInner({ onClose }: { onClose: () => void }) {
  const {
    input, setInput,
    recentPrompt,
    prevPrompts,
    showResult,
    loading,
    resultData,
    onSent,
    newChat,
  } = useGemini();

  const resultRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-scroll result area as words appear
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [resultData]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) onSent();
    }
  };

  const loadPrompt = async (prompt: string) => {
    await onSent(prompt);
  };

  return (
    <div className="gemini-panel">

      {/* ── Sidebar ── */}
      <aside className={`gemini-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
        <div className="gemini-sidebar-top">
          {/* Hamburger toggle */}
          <button
            className="gemini-menu-btn"
            onClick={() => setSidebarOpen(p => !p)}
            title="Toggle sidebar"
          >
            <img src={menuIcon} alt="Menu" />
          </button>

          {/* New Chat */}
          <div className="gemini-new-chat" onClick={newChat} title="New Chat">
            <img src={plusIcon} alt="New Chat" />
            {sidebarOpen && <span className="gemini-new-chat-label">New Chat</span>}
          </div>

          {/* Recent prompts */}
          {sidebarOpen && prevPrompts.length > 0 && (
            <>
              <p className="gemini-recent-title">Recent</p>
              {[...prevPrompts].reverse().slice(0, 10).map((item, i) => (
                <div
                  key={i}
                  className="gemini-recent-entry"
                  onClick={() => loadPrompt(item)}
                  title={item}
                >
                  <img src={messageIcon} alt="" />
                  <p>{item.slice(0, 22)}{item.length > 22 ? '…' : ''}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Bottom icons */}
        <div className="gemini-sidebar-bottom">
          <div className="gemini-bottom-item" title="Help">
            <img src={questionIcon} alt="Help" />
            {sidebarOpen && <p>Help</p>}
          </div>
          <div className="gemini-bottom-item" title="Activity">
            <img src={historyIcon} alt="Activity" />
            {sidebarOpen && <p>Activity</p>}
          </div>
          <div className="gemini-bottom-item" title="Settings">
            <img src={settingIcon} alt="Settings" />
            {sidebarOpen && <p>Settings</p>}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="gemini-main">

        {/* Nav header */}
        <nav className="gemini-nav">
          <span className="gemini-nav-title">
            <img src={geminiIcon} alt="Gemini" />
            Gemini — Legal Assistant
          </span>
          <button
            className="gemini-nav-close"
            onClick={onClose}
            title="Close"
          >✕</button>
        </nav>

        {/* Scrollable content area */}
        <div className="gemini-content" ref={resultRef}>
          {!showResult ? (
            /* ─ Greeting / suggestion cards ─ */
            <>
              <div className="gemini-greet">
                <p><span>Hello, there.</span></p>
                <p>How can I help with your legal question today?</p>
              </div>
              <div className="gemini-cards">
                {SUGGESTIONS.map((s, i) => (
                  <div
                    key={i}
                    className="gemini-card"
                    onClick={() => setInput(s.text)}
                  >
                    <p>{s.text}</p>
                    <img src={s.icon} alt="" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* ─ Result view ─ */
            <div className="gemini-result">
              {/* User prompt */}
              <div className="gemini-result-title">
                <img src={userIcon} alt="You" />
                <p>{recentPrompt}</p>
              </div>

              {/* AI response */}
              <div className="gemini-result-data">
                <img src={geminiIcon} alt="Gemini" />
                {loading ? (
                  <div className="gemini-loader">
                    <hr /><hr /><hr />
                  </div>
                ) : (
                  <p dangerouslySetInnerHTML={{ __html: resultData }} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─ Search bar ─ */}
        <div className="gemini-bottom">
          <div className="gemini-search-box">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask a legal question…"
            />
            <div className="gemini-icon-group">
              <button className="gemini-icon-btn" title="Attach image" tabIndex={-1}>
                <img src={galleryIcon} alt="Gallery" />
              </button>
              <button className="gemini-icon-btn" title="Voice input" tabIndex={-1}>
                <img src={micIcon} alt="Mic" />
              </button>
              <button
                id="gemini-send-btn"
                className="gemini-send-btn"
                onClick={() => { if (input.trim()) onSent(); }}
                disabled={!input.trim() || loading}
                title="Send"
              >
                <img src={sendIcon} alt="Send" />
              </button>
            </div>
          </div>
          <p className="gemini-disclaimer">
            Gemini may display inaccurate info. Always consult a qualified advocate for legal decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Public export — self-contained with context provider ────────────────────

export const GeminiChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        id="gemini-chat-fab"
        className="gemini-fab"
        onClick={() => setIsOpen(true)}
        title="Open Gemini Legal Chat"
        aria-label="Open Gemini Legal Chat"
      >
        ✨
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="gemini-backdrop"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Chat panel — wrapped in its own context provider */}
      <GeminiContextProvider>
        <GeminiChatInner onClose={() => setIsOpen(false)} />
      </GeminiContextProvider>
    </>
  );
};

export default GeminiChat;
