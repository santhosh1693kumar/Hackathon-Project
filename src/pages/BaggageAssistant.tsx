import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';
import { queryIATAPolicy, } from '../lib/aiService';
import { detectCategory } from '../lib/iataKnowledge';
import { logAudit } from '../lib/auditService';
import {
  Send, Bot, User, BookOpen, ThumbsUp, ThumbsDown,
  Search, Tag, ChevronDown, Loader2, Info
} from 'lucide-react';
import type { QueryLog } from '../types';

const SUGGESTED_QUESTIONS = [
  'What is the Most Significant Carrier (MSC) rule?',
  'How is free baggage allowance determined in interline journeys?',
  'What are the steps to determine baggage provisions per Resolution 302?',
  'How should excess baggage charges be collected and documented?',
  'What happens when baggage is mishandled on an interline flight?',
  'What are the cabin baggage restrictions for interline passengers?',
  'How does interline baggage proration work?',
  'What is required for checked-in baggage acceptance?',
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  logId?: string;
  sources?: string[];
  confidence?: number;
  category?: string;
}

export default function BaggageAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your IATA Baggage Policy Assistant. I can answer questions about interline baggage standards, policies, and procedures based on the official IATA Guidance Document.\n\nAll my answers are grounded exclusively in the IATA document to ensure compliance and accuracy. Every query is logged for audit purposes.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QueryLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  async function loadHistory() {
    const { data } = await supabase
      .from('query_logs')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory(data || []);
  }

  async function handleSend(question?: string) {
    const q = question || input.trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { answer, confidence, sections } = await queryIATAPolicy(q);
      const category = detectCategory(q) as QueryLog['category'];

      const { data: logData } = await supabase.from('query_logs').insert({
        user_id: user!.id,
        user_name: user!.full_name,
        user_role: user!.role,
        question: q,
        ai_answer: answer,
        source_sections: sections,
        confidence_score: confidence,
        category,
        status: 'answered',
      }).select().maybeSingle();

      await logAudit(user, 'QUERY_SUBMITTED', 'query_log', logData?.id, { question: q, category });

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
        logId: logData?.id,
        sources: sections,
        confidence,
        category,
      };
      setMessages(prev => [...prev, aiMsg]);
      loadHistory();
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I encountered an error processing your query. Please try again.',
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  }

  async function handleFeedback(logId: string, feedback: 'helpful' | 'not_helpful') {
    await supabase.from('query_logs').update({ feedback }).eq('id', logId);
    setMessages(prev => prev.map(m => m.logId === logId ? { ...m } : m));
  }

  const filteredHistory = history.filter(h =>
    h.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryColors: Record<string, string> = {
    allowance: 'bg-sky-500/20 text-sky-400 border-sky-500/20',
    excess: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
    mishandled: 'bg-red-500/20 text-red-400 border-red-500/20',
    interline: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    operational: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    settlement: 'bg-orange-500/20 text-orange-400 border-orange-500/20',
    general: 'bg-slate-500/20 text-slate-400 border-slate-500/20',
  };

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-500/20 border border-sky-500/30 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-sm">IATA Baggage Policy AI</h2>
                <p className="text-slate-500 text-xs">Answers grounded in official IATA documentation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs font-medium">IATA Compliant</span>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-all"
              >
                History <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-sky-500/20 border border-sky-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-sky-400" />
                </div>
              )}
              <div className={`max-w-2xl ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white rounded-br-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm'
                }`}>
                  {msg.content.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={i} className="font-semibold text-white mb-1">{line.replace(/\*\*/g, '')}</p>;
                    }
                    if (line.startsWith('- ')) {
                      return <p key={i} className="ml-3 text-slate-300 leading-relaxed">• {line.slice(2)}</p>;
                    }
                    if (line.startsWith('*Source:')) {
                      return <p key={i} className="text-xs text-slate-500 mt-2 italic">{line.replace(/\*/g, '')}</p>;
                    }
                    if (line.startsWith('## ')) {
                      return <p key={i} className="font-bold text-white mb-2">{line.slice(3)}</p>;
                    }
                    if (line === '') return <br key={i} />;
                    return <p key={i} className="leading-relaxed">{line}</p>;
                  })}
                </div>

                {msg.role === 'assistant' && msg.sources && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.sources.map((s, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-slate-400">
                        <BookOpen className="w-2.5 h-2.5" /> {s}
                      </span>
                    ))}
                    {msg.category && (
                      <span className={`flex items-center gap-1 text-xs border rounded-full px-2 py-0.5 ${categoryColors[msg.category] || 'bg-slate-500/20 text-slate-400'}`}>
                        <Tag className="w-2.5 h-2.5" /> {msg.category}
                      </span>
                    )}
                    {msg.confidence && (
                      <span className="flex items-center gap-1 text-xs bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-slate-400">
                        <Info className="w-2.5 h-2.5" /> {Math.round(msg.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                )}

                {msg.role === 'assistant' && msg.logId && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-slate-600 text-xs">Helpful?</span>
                    <button onClick={() => handleFeedback(msg.logId!, 'helpful')} className="text-slate-500 hover:text-emerald-400 transition-colors">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleFeedback(msg.logId!, 'not_helpful')} className="text-slate-500 hover:text-red-400 transition-colors">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-right text-sky-300/60' : 'text-slate-600'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-sky-500/20 border border-sky-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-sky-400" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching IATA policy document...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-slate-500 text-xs mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 4).map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg px-3 py-1.5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-end gap-3">
            <div className="flex-1 bg-slate-800 border border-slate-700 focus-within:border-sky-500/50 rounded-xl transition-colors">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask about IATA baggage policies, allowances, interline rules..."
                rows={1}
                className="w-full bg-transparent text-white placeholder-slate-500 px-4 py-3 text-sm resize-none focus:outline-none min-h-[44px] max-h-[120px]"
                style={{ height: 'auto' }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2 px-1">All responses are grounded in the IATA Guidance Document. Every query is logged for compliance review.</p>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-white font-semibold text-sm mb-3">Query History</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search queries..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredHistory.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No queries yet</p>
            ) : (
              filteredHistory.map(q => (
                <button
                  key={q.id}
                  onClick={() => handleSend(q.question)}
                  className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-700 rounded-lg p-3 transition-all"
                >
                  <p className="text-white text-xs font-medium truncate mb-1">{q.question}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${categoryColors[q.category] || 'bg-slate-500/20 text-slate-400'}`}>{q.category}</span>
                    <span className="text-slate-600 text-xs">{new Date(q.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
