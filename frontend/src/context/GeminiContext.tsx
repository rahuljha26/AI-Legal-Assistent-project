/**
 * GeminiContext.tsx
 * ─────────────────
 * State management for the Gemini-Clone-style chat widget.
 * Ported from Gemini-Clone-main/src/context/Context.jsx to TypeScript.
 *
 * Key difference from the original clone: instead of calling the Gemini SDK
 * directly (which would expose the API key in the browser), this context
 * calls the Django backend via nyayaAPI.chat() — keeping the key server-side.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { nyayaAPI } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeminiContextValue {
  input: string;
  setInput: (v: string) => void;
  recentPrompt: string;
  prevPrompts: string[];
  showResult: boolean;
  loading: boolean;
  resultData: string;
  onSent: (prompt?: string) => Promise<void>;
  newChat: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GeminiContext = createContext<GeminiContextValue | null>(null);

export function useGemini(): GeminiContextValue {
  const ctx = useContext(GeminiContext);
  if (!ctx) throw new Error('useGemini must be used inside <GeminiContextProvider>');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GeminiContextProvider({ children }: { children: ReactNode }) {
  const [input, setInput]             = useState('');
  const [recentPrompt, setRecentPrompt] = useState('');
  const [prevPrompts, setPrevPrompts] = useState<string[]>([]);
  const [showResult, setShowResult]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [resultData, setResultData]   = useState('');

  /** Append one word at a time with a delay — classic Gemini streaming effect */
  const delayWord = useCallback((index: number, nextWord: string) => {
    setTimeout(() => {
      setResultData(prev => prev + nextWord);
    }, 75 * index);
  }, []);

  const newChat = useCallback(() => {
    setLoading(false);
    setShowResult(false);
    setResultData('');
    setRecentPrompt('');
    setInput('');
  }, []);

  /**
   * Format a markdown-style response:
   * - **bold** → <b>bold</b>
   * - * bullet  → <br/>
   */
  const formatResponse = (raw: string): string => {
    const parts = raw.split('**');
    let formatted = '';
    for (let i = 0; i < parts.length; i++) {
      formatted += i % 2 === 1 ? `<b>${parts[i]}</b>` : parts[i];
    }
    return formatted.split('*').join('<br/>');
  };

  const onSent = useCallback(async (prompt?: string) => {
    setResultData('');
    setLoading(true);
    setShowResult(true);

    const effectivePrompt = prompt !== undefined ? prompt : input;

    if (prompt !== undefined) {
      setRecentPrompt(prompt);
    } else {
      setPrevPrompts(prev => [...prev, input]);
      setRecentPrompt(input);
    }

    try {
      const res = await nyayaAPI.chat(effectivePrompt);
      // The /advice/ask/ endpoint returns { answer: "..." } or { response: "..." }
      const raw: string =
        res.data?.answer ||
        res.data?.response ||
        res.data?.reply ||
        res.data?.result ||
        JSON.stringify(res.data);

      const formatted = formatResponse(raw);
      const words = formatted.split(' ');
      words.forEach((word, i) => delayWord(i, word + ' '));
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
      setResultData(`<span style="color:#fca5a5">⚠️ ${errMsg}</span>`);
    } finally {
      setLoading(false);
      setInput('');
    }
  }, [input, delayWord]);

  const value: GeminiContextValue = {
    input,
    setInput,
    recentPrompt,
    prevPrompts,
    showResult,
    loading,
    resultData,
    onSent,
    newChat,
  };

  return (
    <GeminiContext.Provider value={value}>
      {children}
    </GeminiContext.Provider>
  );
}

export default GeminiContext;
