import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';
import {
  Send, Plus, Trash2, Bot, User,
  MessageSquareHeart, ChevronDown
} from 'lucide-react';
import './Chat.css';

/* ── Simple markdown renderer (no external lib) ── */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let key = 0;
  for (const line of lines) {
    if (/^###\s+/.test(line))
      elements.push(<h5 key={key++} style={{ margin: '8px 0 2px', fontSize: '0.9rem', fontWeight: 700 }}>{line.replace(/^###\s+/, '')}</h5>);
    else if (/^##\s+/.test(line))
      elements.push(<h4 key={key++} style={{ margin: '10px 0 2px', fontSize: '0.95rem', fontWeight: 700 }}>{line.replace(/^##\s+/, '')}</h4>);
    else if (/^#\s+/.test(line))
      elements.push(<h3 key={key++} style={{ margin: '10px 0 2px', fontSize: '1rem', fontWeight: 800 }}>{line.replace(/^#\s+/, '')}</h3>);
    else if (/^\s{0,3}[*-]\s+/.test(line)) {
      const indent = /^\s+/.test(line) ? 16 : 0;
      const content = line.replace(/^\s*[*-]\s+/, '');
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 7, margin: '1px 0', paddingLeft: indent }}>
          <span style={{ opacity: 0.6, flexShrink: 0, marginTop: 2 }}>{indent ? '◦' : '•'}</span>
          <span style={{ lineHeight: 1.6 }}>{inlineBold(content)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 5 }} />);
    } else {
      elements.push(<p key={key++} style={{ margin: '1px 0', lineHeight: 1.65 }}>{inlineBold(line)}</p>);
    }
  }
  return elements;
}

function inlineBold(text) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (/^\*\*.*\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^`.*`$/.test(part)) return <code key={i} style={{ background: 'rgba(232,99,62,0.1)', color: 'var(--brand-600)', padding: '1px 5px', borderRadius: 4, fontSize: '0.85em', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

const CONTEXTS = [
  { value: 'general',       label: '💬 General Health' },
  { value: 'symptom-check', label: '🩺 Symptom Check' },
  { value: 'medication',    label: '💊 Medication' },
  { value: 'nutrition',     label: '🥗 Nutrition' },
  { value: 'mental-health', label: '🧠 Mental Health' },
];

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [context, setContext]             = useState('general');
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  useEffect(() => { fetchConversations(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* Auto-grow textarea */
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
    }
  }, [input]);

  const fetchConversations = async () => {
    try {
      const res = await chatAPI.getConversations();
      setConversations(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const loadConversation = async (id) => {
    try {
      const res = await chatAPI.getConversation(id);
      setActiveConv(res.data.data);
      setMessages(res.data.data.messages || []);
      setContext(res.data.data.context || 'general');
    } catch (err) { console.error(err); }
  };

  const createConversation = async (ctx = context) => {
    try {
      const res = await chatAPI.createConversation({ context: ctx });
      setActiveConv(res.data.data);
      setMessages([]);
      fetchConversations();
      return res.data.data;
    } catch (err) { console.error(err); return null; }
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || sending) return;

    const text = input.trim();
    setInput('');
    setSending(true);

    let convId = activeConv?._id;

    if (!convId) {
      const conv = await createConversation();
      if (!conv) { setSending(false); return; }
      convId = conv._id;
    }

    const userMsg = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await chatAPI.sendMessage(convId, text);
      if (res.data.success) {
        setMessages(prev => [...prev, res.data.data.assistantMessage]);
      }
      fetchConversations();
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteConversation = async (id) => {
    try {
      await chatAPI.deleteConversation(id);
      if (activeConv?._id === id) { setActiveConv(null); setMessages([]); }
      fetchConversations();
    } catch (err) { console.error(err); }
  };

  const startTopicChat = async (ctx) => {
    setContext(ctx);
    await createConversation(ctx);
  };

  const [showContextMenu, setShowContextMenu] = useState(false);
  const currentContextLabel = CONTEXTS.find(c => c.value === context)?.label || '💬 General Health';
  const hasChat = messages.length > 0 || activeConv;

  return (
    <div className="chat-page">

      {/* ── Sidebar ── */}
      <aside className="chat-sidebar">
        <button className="btn btn-primary chat-new-btn" onClick={() => createConversation()}>
          <Plus size={16} /> New Chat
        </button>

        <div className="chat-conv-list">
          {conversations.map(conv => (
            <div
              key={conv._id}
              className={`chat-conv-item ${activeConv?._id === conv._id ? 'chat-conv-active' : ''}`}
              onClick={() => loadConversation(conv._id)}
            >
              <div className="chat-conv-item-info">
                <span className="chat-conv-title">{conv.title}</span>
                <span className="chat-conv-preview">{conv.lastMessage}</span>
              </div>
              <button
                className="chat-conv-delete"
                onClick={(e) => { e.stopPropagation(); deleteConversation(conv._id); }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-muted text-sm" style={{ padding: '20px 12px', textAlign: 'center', lineHeight: 1.6 }}>
              No conversations yet.<br />Start a chat below!
            </p>
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <div className="chat-main">

        {/* Radial glow (always rendered, hidden by messages) */}
        {!hasChat && <div className="chat-bg-glow" />}

        {/* ── Messages or Welcome ── */}
        {hasChat ? (
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}>
                <div className="chat-msg-avatar">
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="chat-msg-bubble">
                  <div className="chat-msg-content">
                    {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="chat-msg chat-msg-ai">
                <div className="chat-msg-avatar"><Bot size={16} /></div>
                <div className="chat-msg-bubble">
                  <div className="chat-typing"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="chat-welcome">
            {/* Announcement badge */}
            <div className="chat-welcome-badge">
              <span className="chat-badge-dot" />
              <MessageSquareHeart size={14} />
              MeriNurse AI Health Assistant
            </div>

            {/* Hero title */}
            <h1 className="chat-welcome-title">
              What health question can I{' '}
              <span className="chat-highlight">answer</span>
              {' '}today?
            </h1>
            <p className="chat-welcome-sub">
              Ask about symptoms, medications, nutrition, mental wellness, or anything health-related. I'm your 24/7 health companion.
            </p>

            {/* Topic chips */}
            <div className="chat-welcome-topics">
              {CONTEXTS.map(c => (
                <button key={c.value} className="chat-topic-chip" onClick={() => startTopicChat(c.value)}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Disclaimer */}
            <div className="chat-disclaimer">
              ⚠️ For general information only. Always consult a healthcare professional for medical advice.
            </div>
          </div>
        )}

        {/* ── Bolt-style Input Bar ── */}
        <div className="chat-input-wrap">
          <div className="chat-input-box">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder="Ask me anything about your health…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              rows={1}
            />
            <div className="chat-input-toolbar">
              <div className="chat-toolbar-left">
                {/* Custom context selector — no native select, no browser blue */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="chat-context-pill"
                    onClick={() => setShowContextMenu(v => !v)}
                  >
                    <span style={{ fontSize: '0.875rem' }}>{currentContextLabel}</span>
                    <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: showContextMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>

                  {showContextMenu && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                        onClick={() => setShowContextMenu(false)}
                      />
                      <div className="chat-context-dropdown">
                        {CONTEXTS.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            className={`chat-context-option ${context === c.value ? 'chat-context-option--active' : ''}`}
                            onClick={() => { setContext(c.value); setShowContextMenu(false); }}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                className="chat-send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || sending}
              >
                {sending ? 'Sending…' : 'Send'}
                <Send size={15} />
              </button>
            </div>
          </div>
          <p className="chat-input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>

      </div>
    </div>
  );
}
