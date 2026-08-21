import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { nyayaAPI } from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

type Urgency = 'Low' | 'Normal' | 'High' | 'Urgent';

interface DraftData {
  subject: string;
  body: string;
  suggested_actions: string[];
  lawyer_name: string;
  to_email: string;
  urgency: Urgency;
}

// Steps 1-8 of the Nyaya workflow
type Step =
  | 'intake'       // 1
  | 'recipient'    // 2
  | 'drafting'     // 3
  | 'attachments'  // 4
  | 'review'       // 5
  | 'suggestions'  // 6
  | 'sending'      // 7
  | 'done';        // 8

const STEP_LABELS = ['Intake', 'Recipient', 'Draft', 'Attachments', 'Review', 'Suggestions', 'Send', 'Done'];
const STEP_ORDER: Step[] = ['intake', 'recipient', 'drafting', 'attachments', 'review', 'suggestions', 'sending', 'done'];

// ─── Component ───────────────────────────────────────────────────────────────

export const NyayaAssistant: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen]         = useState(false);
  const [step, setStep]             = useState<Step>('intake');
  const [loading, setLoading]       = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');

  // Voice & Speech Synthesis States
  const [isMuted, setIsMuted]         = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Step 1 — Intake
  const [situation, setSituation]   = useState('');
  const [urgency, setUrgency]       = useState<Urgency>('Normal');
  const [specificAsk, setSpecificAsk] = useState('');

  // Step 2 — Recipient
  const [toEmail, setToEmail]       = useState('');
  const [lawyerName, setLawyerName] = useState('');
  const [emailError, setEmailError] = useState('');

  // Step 3 — Draft
  const [draft, setDraft]           = useState<DraftData | null>(null);
  const [editedBody, setEditedBody] = useState('');
  const [editedSubject, setEditedSubject] = useState('');

  // Step 4 — Attachments
  const [files, setFiles]           = useState<File[]>([]);
  const fileRef                     = useRef<HTMLInputElement>(null);

  // Step 6 — Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Step 8 — Done
  const [sentTo, setSentTo]         = useState('');
  const [logId, setLogId]           = useState<number | null>(null);

  const currentStepIndex = STEP_ORDER.indexOf(step);

  // ── Text-to-Speech Output (Voice Answers) ──
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window) || isMuted) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const IndianVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India'));
    if (IndianVoice) utterance.voice = IndianVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isMuted, stopSpeaking]);

  const reset = () => {
    stopSpeaking();
    setStep('intake'); setSituation(''); setUrgency('Normal'); setSpecificAsk('');
    setToEmail(''); setLawyerName(''); setEmailError('');
    setDraft(null); setEditedBody(''); setEditedSubject('');
    setFiles([]); setSuggestions([]); setSentTo(''); setLogId(null); setErrorMsg('');
    setIsListening(false);
  };

  // ── Email format validation ──
  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // ── Voice input (Web Speech API) ──
  const startVoice = useCallback((setter: (v: string) => void) => {
    stopSpeaking();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser. Please use Chrome, Edge, or Brave.'); return; }
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    setIsListening(true);
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setter(transcript);
      setIsListening(false);
    };
    recognition.start();
  }, [stopSpeaking]);

  // ── STEP 3: Call Gemini draft API ──
  const handleDraft = async () => {
    setLoading(true); setErrorMsg('');
    try {
      const res = await nyayaAPI.draft({
        to_email:       toEmail,
        lawyer_name:    lawyerName,
        case_situation: situation,
        urgency,
        specific_ask:   specificAsk,
        user_name:      user?.full_name,
        user_email:     user?.email,
      });
      const data = res.data?.data;
      setDraft(data);
      setEditedBody(data.body);
      setEditedSubject(data.subject);
      setSuggestions(data.suggested_actions || []);
      setStep('drafting');

      // Speak draft response out loud
      if (data?.body) {
        speakText(`Draft generated for ${lawyerName || 'the advocate'}. Here is your preview.`);
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Failed to generate draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 7: Send email ──
  const handleSend = async () => {
    setStep('sending'); setLoading(true); setErrorMsg('');
    try {
      const res = await nyayaAPI.send({
        to_email:        toEmail,
        lawyer_name:     lawyerName,
        subject:         editedSubject,
        body:            editedBody,
        case_situation:  situation,
        urgency,
        specific_ask:    specificAsk,
        attachments_json: files.map(f => f.name),
        confirmed:       true,
        files,
      });
      const data = res.data?.data;
      setSentTo(data?.to_email || toEmail);
      setLogId(data?.log_id || null);
      setStep('done');

      // Speak confirmation out loud
      speakText(`Your email has been successfully sent to ${data?.to_email || toEmail}. A copy has been saved in your case history.`);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Failed to send email. Please try again.');
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  if (!isOpen) {
    return (
      <button
        id="nyaya-fab"
        onClick={() => setIsOpen(true)}
        title="Nyaya Voice Assistant"
        style={{
          position: 'fixed', bottom: 96, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #f5a623, #e85d04)',
          boxShadow: '0 8px 30px rgba(245,166,35,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, transition: 'transform 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        🎙️
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => { if (!loading) { setIsOpen(false); reset(); } }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(6,11,24,0.75)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        id="nyaya-modal"
        style={{
          position: 'fixed', top: '50%', left: '50%', zIndex: 9999,
          transform: 'translate(-50%, -50%)',
          width: 'min(720px, 96vw)', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(160deg, #090f1f 0%, #0d1730 100%)',
          border: '1px solid rgba(79,110,247,0.25)',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,110,247,0.1)',
          animation: 'nyaya-slide-up 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(79,110,247,0.10))',
          borderBottom: '1px solid rgba(79,110,247,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', fontSize: 20,
              background: 'linear-gradient(135deg, #f5a623, #e85d04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(245,166,35,0.35)',
            }}>🎙️</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
                Nyaya Voice Assistant
                {isListening && (
                  <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} /> Listening...
                  </span>
                )}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>
                Dharma Vault AI Legal Assistant
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                } else {
                  setIsMuted(prev => !prev);
                  if (isMuted) speakText("Voice answers enabled.");
                }
              }}
              title={isMuted ? "Enable Voice Answers" : "Mute Voice Answers"}
              style={{
                background: isSpeaking
                  ? 'rgba(245,166,35,0.2)'
                  : isMuted
                  ? 'rgba(239,68,68,0.15)'
                  : 'rgba(79,110,247,0.15)',
                border: `1px solid ${
                  isSpeaking
                    ? 'rgba(245,166,35,0.4)'
                    : isMuted
                    ? 'rgba(239,68,68,0.3)'
                    : 'rgba(79,110,247,0.3)'
                }`,
                color: isSpeaking ? '#f5a623' : isMuted ? '#fca5a5' : '#818cf8',
                padding: '5px 12px',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              {isSpeaking ? '🔊 Speaking...' : isMuted ? '🔇 Voice Off' : '🔊 Voice On'}
            </button>
            <button
              onClick={() => { setIsOpen(false); reset(); }}
              disabled={loading}
              style={{
                background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                fontSize: 18, padding: '4px 8px', borderRadius: 8, transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >✕</button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {STEP_LABELS.map((label, i) => (
              <React.Fragment key={label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i < currentStepIndex
                      ? 'linear-gradient(135deg, #f5a623, #e85d04)'
                      : i === currentStepIndex
                      ? 'linear-gradient(135deg, #4f6ef7, #7c3aed)'
                      : 'rgba(79,110,247,0.10)',
                    color: i <= currentStepIndex ? '#fff' : '#475569',
                    border: i === currentStepIndex ? '2px solid #4f6ef7' : '2px solid transparent',
                    transition: 'all 0.3s',
                  }}>
                    {i < currentStepIndex ? '✓' : i + 1}
                  </div>
                  <div style={{
                    fontSize: 9, color: i === currentStepIndex ? '#a78bfa' : '#475569',
                    marginTop: 3, fontWeight: i === currentStepIndex ? 700 : 400,
                    whiteSpace: 'nowrap',
                  }}>{label}</div>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, borderRadius: 2, marginBottom: 14,
                    background: i < currentStepIndex
                      ? 'linear-gradient(90deg, #f5a623, #4f6ef7)'
                      : 'rgba(79,110,247,0.12)',
                    transition: 'background 0.4s',
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Error Banner */}
          {errorMsg && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 18,
              color: '#fca5a5', fontSize: 13,
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ── STEP 1: INTAKE ── */}
          {step === 'intake' && (
            <StepCard title="Step 1 — Tell Me Your Situation" emoji="💬">
              <p style={subText}>
                Describe your legal issue in simple words. I'll help you draft a professional email and explain your options.
              </p>
              <Label>What is your legal issue? *</Label>
              <div style={{ position: 'relative' }}>
                <textarea
                  id="nyaya-situation"
                  value={situation}
                  onChange={e => setSituation(e.target.value)}
                  placeholder="E.g. My landlord is refusing to return my security deposit of ₹50,000 after I vacated the flat 3 months ago..."
                  rows={5}
                  style={textareaStyle}
                />
                <button
                  onClick={() => startVoice(setSituation)}
                  title="Click to speak"
                  style={voiceBtn}
                >🎙️</button>
              </div>

              <Label style={{ marginTop: 16 }}>Urgency Level</Label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['Low', 'Normal', 'High', 'Urgent'] as Urgency[]).map(u => (
                  <button
                    key={u}
                    onClick={() => setUrgency(u)}
                    style={{
                      ...chipBtn,
                      background: urgency === u ? urgencyColor(u) : 'rgba(79,110,247,0.08)',
                      color: urgency === u ? '#fff' : '#94a3b8',
                      border: urgency === u ? '1px solid transparent' : '1px solid rgba(79,110,247,0.15)',
                    }}
                  >{u}</button>
                ))}
              </div>

              <Label style={{ marginTop: 16 }}>What specifically do you need from the lawyer? (optional)</Label>
              <div style={{ position: 'relative' }}>
                <input
                  value={specificAsk}
                  onChange={e => setSpecificAsk(e.target.value)}
                  placeholder="E.g. Please advise on filing a consumer complaint and send a legal notice."
                  style={inputStyle}
                />
                <button onClick={() => startVoice(setSpecificAsk)} title="Click to speak" style={voiceBtn}>🎙️</button>
              </div>

              <PrimaryBtn
                style={{ marginTop: 24 }}
                disabled={situation.trim().length < 10}
                onClick={() => setStep('recipient')}
              >
                Continue → Add Recipient
              </PrimaryBtn>
            </StepCard>
          )}

          {/* ── STEP 2: RECIPIENT ── */}
          {step === 'recipient' && (
            <StepCard title="Step 2 — Who Should I Email?" emoji="📧">
              {/* Sender Info Card (auto-filled) */}
              <div style={infoGrid}>
                <InfoCard
                  icon="👤"
                  title="Your Information (Sender)"
                  badge="You"
                  badgeColor="#16a34a"
                  fields={[
                    { label: 'Name', value: user?.full_name || '—' },
                    { label: 'Email', value: user?.email || '—' },
                  ]}
                />
                <InfoCard
                  icon="⚖️"
                  title="Lawyer / Recipient"
                  badge="Advocate"
                  badgeColor="#b45309"
                  fields={[
                    { label: 'Name', value: lawyerName || '—' },
                    { label: 'Email', value: toEmail || '—' },
                  ]}
                  note="Lawyer directory integration coming soon"
                />
              </div>

              <Label style={{ marginTop: 20 }}>Lawyer / Recipient Email Address *</Label>
              <input
                id="nyaya-to-email"
                type="email"
                value={toEmail}
                onChange={e => { setToEmail(e.target.value); setEmailError(''); }}
                onBlur={() => {
                  if (toEmail && !validateEmail(toEmail))
                    setEmailError('Please enter a valid email address (e.g. lawyer@example.com)');
                }}
                placeholder="advocate@example.com"
                style={{ ...inputStyle, borderColor: emailError ? '#ef4444' : undefined }}
              />
              {emailError && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{emailError}</div>}

              <Label style={{ marginTop: 16 }}>Lawyer / Recipient Name (optional)</Label>
              <input
                value={lawyerName}
                onChange={e => setLawyerName(e.target.value)}
                placeholder="E.g. Adv. Priya Verma (leave blank if unknown)"
                style={inputStyle}
              />
              <p style={{ ...subText, marginTop: 8 }}>
                💡 In a future update, you'll be able to search from our registered lawyer directory.
              </p>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <SecondaryBtn onClick={() => setStep('intake')}>← Back</SecondaryBtn>
                <PrimaryBtn
                  style={{ flex: 1 }}
                  disabled={!validateEmail(toEmail) || loading}
                  onClick={handleDraft}
                >
                  {loading ? <Spinner /> : '✨ Generate AI Draft →'}
                </PrimaryBtn>
              </div>
            </StepCard>
          )}

          {/* ── STEP 3: DRAFTING ── */}
          {step === 'drafting' && draft && (
            <StepCard title="Step 3 — Review & Edit Your Draft" emoji="✍️">
              <p style={subText}>
                Nyaya has drafted this email for you. You can edit the subject and body before attaching files.
              </p>

              <Label>Subject Line</Label>
              <input
                value={editedSubject}
                onChange={e => setEditedSubject(e.target.value)}
                style={inputStyle}
              />

              <Label style={{ marginTop: 16 }}>Email Body</Label>
              <textarea
                value={editedBody}
                onChange={e => setEditedBody(e.target.value)}
                rows={10}
                style={textareaStyle}
              />

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <SecondaryBtn onClick={() => setStep('recipient')}>← Back</SecondaryBtn>
                <PrimaryBtn style={{ flex: 1 }} onClick={() => setStep('attachments')}>
                  Continue → Attachments
                </PrimaryBtn>
              </div>
            </StepCard>
          )}

          {/* ── STEP 4: ATTACHMENTS ── */}
          {step === 'attachments' && (
            <StepCard title="Step 4 — Add Documents & Evidence" emoji="📎">
              <p style={subText}>
                Attach any supporting files (invoices, notices, ID, photographs, contracts). All files are attached in-transit only.
              </p>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={e => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files);
                  setFiles(prev => [...prev, ...dropped]);
                }}
                style={{
                  border: '2px dashed rgba(79,110,247,0.35)', borderRadius: 14,
                  padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                  background: 'rgba(79,110,247,0.04)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <div style={{ color: '#94a3b8', fontSize: 14 }}>
                  Click or drag & drop files here
                </div>
                <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>
                  PDF, JPG, PNG, DOCX supported
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  const picked = Array.from(e.target.files || []);
                  setFiles(prev => [...prev, ...picked]);
                }}
              />

              {/* File chips */}
              {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{
                      background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)',
                      borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 12, color: '#a5b4fc',
                    }}>
                      📄 {f.name}
                      <button
                        onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: 0 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <SecondaryBtn onClick={() => setStep('drafting')}>← Back</SecondaryBtn>
                <PrimaryBtn style={{ flex: 1 }} onClick={() => setStep('review')}>
                  Continue → Review & Confirm
                </PrimaryBtn>
              </div>
            </StepCard>
          )}

          {/* ── STEP 5: REVIEW ── */}
          {step === 'review' && (
            <StepCard title="Step 5 — Review Before Sending" emoji="🔍">
              {/* Dual Info Cards */}
              <div style={infoGrid}>
                <InfoCard
                  icon="👤" title="From (You)" badge="Sender" badgeColor="#16a34a"
                  fields={[
                    { label: 'Name', value: user?.full_name || '—' },
                    { label: 'Email', value: user?.email || '—' },
                  ]}
                />
                <InfoCard
                  icon="⚖️" title="To (Lawyer)" badge="Advocate" badgeColor="#b45309"
                  fields={[
                    { label: 'Name', value: lawyerName || 'Respected Advocate' },
                    { label: 'Email', value: toEmail },
                    { label: 'Urgency', value: urgency },
                  ]}
                />
              </div>

              {/* Subject */}
              <div style={{
                marginTop: 16, padding: '10px 14px',
                background: 'rgba(79,110,247,0.08)', borderLeft: '3px solid #4f6ef7',
                borderRadius: 8, fontSize: 13, color: '#c7d2fe',
              }}>
                <strong style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject</strong>
                <div style={{ marginTop: 4, color: '#e0e7ff', fontWeight: 600 }}>{editedSubject}</div>
              </div>

              {/* Body preview */}
              <div style={{
                marginTop: 12, padding: '14px 16px',
                background: 'rgba(15,29,58,0.6)', border: '1px solid rgba(79,110,247,0.15)',
                borderRadius: 10, fontSize: 13, color: '#cbd5e1', lineHeight: 1.7,
                whiteSpace: 'pre-line', maxHeight: 200, overflowY: 'auto',
              }}>
                {editedBody}
              </div>

              {/* Attachments */}
              {files.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>📎 {files.length} attachment{files.length > 1 ? 's' : ''}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {files.map((f, i) => (
                      <span key={i} style={{
                        background: 'rgba(79,110,247,0.10)', border: '1px solid rgba(79,110,247,0.2)',
                        borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#818cf8',
                      }}>📄 {f.name}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                marginTop: 16, padding: '10px 14px',
                background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)',
                borderRadius: 8, fontSize: 12, color: '#fbbf24',
              }}>
                ⚠️ Once confirmed, this email will be sent immediately to <strong>{toEmail}</strong>. Please review carefully.
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <SecondaryBtn onClick={() => setStep('attachments')}>← Edit</SecondaryBtn>
                <PrimaryBtn
                  id="nyaya-confirm-send"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                  onClick={() => { setStep('suggestions'); setSuggestions(suggestions.length ? suggestions : []); }}
                >
                  ✅ Confirm & Proceed
                </PrimaryBtn>
              </div>
            </StepCard>
          )}

          {/* ── STEP 6: SUGGESTIONS ── */}
          {step === 'suggestions' && (
            <StepCard title="Step 6 — Suggested Next Actions" emoji="🧭">
              <p style={subText}>
                Based on your situation, here are some additional steps you may want to consider.
                These are general suggestions only — please confirm with a licensed advocate.
              </p>

              {suggestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px',
                      background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.18)',
                      borderRadius: 10,
                    }}>
                      <div style={{
                        minWidth: 28, height: 28, borderRadius: '50%', fontSize: 13, fontWeight: 700,
                        background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                      }}>{i + 1}</div>
                      <div style={{ color: '#c7d2fe', fontSize: 14, lineHeight: 1.5 }}>{s}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#475569', textAlign: 'center', padding: '24px 0' }}>
                  No suggestions available.
                </div>
              )}

              <div style={{
                padding: '10px 14px', background: 'rgba(15,29,58,0.5)',
                border: '1px solid rgba(79,110,247,0.12)', borderRadius: 8,
                fontSize: 11, color: '#475569', marginBottom: 20,
              }}>
                📌 These suggestions do not constitute legal advice. Always consult a qualified advocate before taking legal action.
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <SecondaryBtn onClick={() => setStep('review')}>← Back to Review</SecondaryBtn>
                <PrimaryBtn style={{ flex: 1 }} disabled={loading} onClick={handleSend}>
                  {loading ? <Spinner /> : '📤 Send Email Now'}
                </PrimaryBtn>
              </div>
            </StepCard>
          )}

          {/* ── STEP 7: SENDING ── */}
          {step === 'sending' && (
            <StepCard title="Step 7 — Sending Your Email…" emoji="📤">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16, animation: 'nyaya-spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
                <div style={{ color: '#94a3b8', fontSize: 15 }}>
                  Sending your email to <strong style={{ color: '#c7d2fe' }}>{toEmail}</strong>…
                </div>
                <div style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Please wait, do not close this window.</div>
              </div>
            </StepCard>
          )}

          {/* ── STEP 8: DONE ── */}
          {step === 'done' && (
            <StepCard title="Step 8 — Email Sent Successfully!" emoji="✅">
              <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                <div style={{ color: '#4ade80', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  Email Delivered!
                </div>
                <div style={{ color: '#94a3b8', fontSize: 14 }}>
                  Your email has been sent to{' '}
                  <strong style={{ color: '#c7d2fe' }}>{sentTo}</strong>.
                </div>
                {logId && (
                  <div style={{
                    marginTop: 16, padding: '8px 16px',
                    background: 'rgba(79,110,247,0.08)', borderRadius: 8,
                    fontSize: 12, color: '#64748b',
                  }}>
                    📋 Saved to your case history (Log #{logId})
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <SecondaryBtn style={{ flex: 1 }} onClick={() => { reset(); }}>
                  Send Another Email
                </SecondaryBtn>
                <PrimaryBtn style={{ flex: 1 }} onClick={() => { setIsOpen(false); reset(); }}>
                  Done ✓
                </PrimaryBtn>
              </div>
            </StepCard>
          )}

        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes nyaya-slide-up {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes nyaya-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StepCard: React.FC<{ title: string; emoji: string; children: React.ReactNode }> = ({ title, emoji, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 17, fontWeight: 700 }}>{title}</h3>
    </div>
    {children}
  </div>
);

const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, ...style }}>
    {children}
  </div>
);

const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, style, ...props }) => (
  <button
    {...props}
    style={{
      padding: '11px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontWeight: 700, fontSize: 14, color: '#fff',
      background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
      boxShadow: '0 4px 16px rgba(79,110,247,0.35)',
      transition: 'all 0.2s', opacity: props.disabled ? 0.5 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      ...style,
    }}
  >{children}</button>
);

const SecondaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, style, ...props }) => (
  <button
    {...props}
    style={{
      padding: '11px 20px', borderRadius: 10, cursor: 'pointer',
      fontWeight: 600, fontSize: 14, color: '#94a3b8',
      background: 'rgba(79,110,247,0.08)',
      border: '1px solid rgba(79,110,247,0.18)',
      transition: 'all 0.2s',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}
  >{children}</button>
);

const Spinner = () => (
  <div style={{
    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'nyaya-spin 0.7s linear infinite',
  }} />
);

interface InfoCardProps {
  icon: string;
  title: string;
  badge: string;
  badgeColor: string;
  fields: { label: string; value: string }[];
  note?: string;
}
const InfoCard: React.FC<InfoCardProps> = ({ icon, title, badge, badgeColor, fields, note }) => (
  <div style={{
    flex: 1, padding: '14px 16px',
    background: 'rgba(15,29,58,0.7)', border: '1px solid rgba(79,110,247,0.15)',
    borderRadius: 12,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#c7d2fe' }}>{icon} {title}</div>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
        background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}44`,
      }}>{badge}</span>
    </div>
    {fields.map(f => (
      <div key={f.label} style={{ fontSize: 12, marginBottom: 5, color: '#94a3b8' }}>
        <span style={{ color: '#64748b' }}>{f.label}:</span>{' '}
        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{f.value}</span>
      </div>
    ))}
    {note && (
      <div style={{ marginTop: 8, fontSize: 10, color: '#475569', fontStyle: 'italic' }}>
        🔮 {note}
      </div>
    )}
  </div>
);

// ─── Style constants ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
  background: 'rgba(15,29,58,0.7)', border: '1px solid rgba(79,110,247,0.2)',
  borderRadius: 10, color: '#e2e8f0', fontSize: 14, outline: 'none',
  transition: 'border-color 0.2s', fontFamily: 'inherit',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', lineHeight: 1.6,
  width: '100%', display: 'block',
};

const voiceBtn: React.CSSProperties = {
  position: 'absolute', right: 10, top: 10,
  background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)',
  borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 16,
};

const chipBtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
  fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
};

const infoGrid: React.CSSProperties = {
  display: 'flex', gap: 12, flexWrap: 'wrap',
};

const subText: React.CSSProperties = {
  color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px',
};

function urgencyColor(u: Urgency) {
  return { Low: '#16a34a', Normal: '#2563eb', High: '#d97706', Urgent: '#dc2626' }[u];
}

export default NyayaAssistant;
