/**
 * ChatBot — Silvia AI con:
 *   Fix #7: passa userId per ricevere dati reali
 *   Fix #8: input vocale via Web Speech API
 *   Fix #9: esegue azioni (create_appointment, update_status, send_notification)
 */
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Mic, MicOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: { type: string; data: Record<string, any> };
  actionDone?: boolean;
}

// Dichiarazione tipo per Web Speech API (non inclusa di default in TypeScript)
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function ChatBot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Ciao! Sono Silvia 👋 Posso aiutarti con ordini, appuntamenti e misurazioni. Puoi anche parlarmi!' }
  ]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const speechSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Fix #8 — input vocale
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart  = () => setListening(true);
    recognition.onend    = () => setListening(false);
    recognition.onerror  = () => setListening(false);
    recognition.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // Fix #9 — esegui azione restituita da Silvia
  const executeAction = async (action: { type: string; data: Record<string, any> }, msgIndex: number) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('agent-action', {
        body: { action, userId: user.id },
      });
      if (error) throw error;
      setMessages(prev => prev.map((m, i) =>
        i === msgIndex ? { ...m, actionDone: true } : m
      ));
      toast.success(data?.message ?? 'Azione eseguita');
    } catch (e: any) {
      toast.error('Errore nell\'esecuzione: ' + (e?.message ?? e));
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      // Fix #7: passa userId per dati reali
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          messages: next.map(m => ({ role: m.role, content: m.content })),
          userId: user?.id ?? null,
        },
      });
      if (error) throw error;

      // Fix #9: gestisce risposta con eventuale azione
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply || 'Nessuna risposta.',
        action: data.action ?? undefined,
        actionDone: false,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Si è verificato un errore. Riprova tra poco.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="print:hidden">
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
          open ? 'bg-foreground text-background scale-95' : 'bg-accent text-white hover:scale-105'
        )}
        aria-label="Apri assistente"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-foreground text-background shrink-0">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Silvia</p>
              <p className="text-[10px] opacity-60">Assistente AI · vede i tuoi dati reali</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-accent text-white rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}>
                    {m.content}
                  </div>
                </div>

                {/* Bottone per confermare l'azione proposta da Silvia */}
                {m.role === 'assistant' && m.action && !m.actionDone && (
                  <button
                    onClick={() => executeAction(m.action!, i)}
                    className="mt-1.5 ml-8 flex items-center gap-1.5 text-xs bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-full px-3 py-1 transition-colors"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Conferma ed esegui
                  </button>
                )}
                {m.role === 'assistant' && m.actionDone && (
                  <p className="mt-1 ml-8 text-xs text-emerald-500">✅ Fatto</p>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input + voce */}
          <div className="flex gap-2 p-3 border-t border-border shrink-0">
            {/* Fix #8 — bottone microfono */}
            {speechSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={cn(
                  'shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-colors',
                  listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
                title={listening ? 'Ferma ascolto' : 'Parla con Silvia'}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={listening ? '🎤 In ascolto...' : 'Scrivi o parla...'}
              className="text-sm"
              disabled={loading || listening}
            />
            <Button size="icon" onClick={send} disabled={!input.trim() || loading} className="shrink-0 bg-accent hover:bg-accent/90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
