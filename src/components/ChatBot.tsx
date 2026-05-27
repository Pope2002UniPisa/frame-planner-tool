/**
 * ChatBot — Silvia AI
 *
 * Voce: Web Speech API (nativa browser, zero API key, trascrizione in tempo reale).
 *       Fallback: MediaRecorder → Groq Whisper per browser senza SpeechRecognition.
 * Footer overlap: IntersectionObserver su #app-footer.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Mic, MicOff, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/hooks/useDashboardQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: { type: string; data: Record<string, any> };
  actionDone?: boolean;
  actionLoading?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const ACTION_LABELS: Record<string, string> = {
  create_appointment: '📅 Crea appuntamento',
  update_status:      '🔄 Aggiorna stato',
  send_notification:  '🔔 Invia notifica',
};

export function ChatBot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Ciao! Sono Silvia 👋 Posso creare appuntamenti, aggiornare stati e rispondere alle tue domande. Clicca sul microfono per parlarmi!',
  }]);

  // ── Stato voce ───────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'transcribing'>('idle');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  // Ref sempre aggiornato ai messaggi — evita stale closure nei callback async
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // ── Supporto browser ─────────────────────────────────────────
  const hasSpeechRecognition = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const hasMediaRecorder = typeof window !== 'undefined' &&
    !!(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

  const canRecord = hasSpeechRecognition || hasMediaRecorder;

  // ── Footer overlap: IntersectionObserver ────────────────────
  const [btnBottom, setBtnBottom] = useState(24);
  const ioRef = useRef<IntersectionObserver | null>(null);

  const attachFooterObserver = useCallback(() => {
    const footer = document.getElementById('app-footer');
    if (!footer || ioRef.current) return;
    ioRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const vh  = window.innerHeight;
          const top = entry.boundingClientRect.top;
          setBtnBottom(Math.max(24, Math.ceil(vh - top) + 16));
        } else {
          setBtnBottom(24);
        }
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i * 0.05) }
    );
    ioRef.current.observe(footer);
  }, []);

  useEffect(() => {
    attachFooterObserver();
    const poller = setInterval(() => {
      if (document.getElementById('app-footer')) {
        attachFooterObserver();
        clearInterval(poller);
      }
    }, 300);
    return () => {
      clearInterval(poller);
      ioRef.current?.disconnect();
      ioRef.current = null;
    };
  }, [attachFooterObserver]);

  // ── Scroll automatico ────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Cleanup recognition al chiudere
  useEffect(() => {
    if (!open) {
      recognitionRef.current?.abort();
      setVoiceState('idle');
      setInterimText('');
    }
  }, [open]);

  // ── Invio al chat-assistant ──────────────────────────────────
  const sendToAssistant = useCallback(async (history: Message[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { messages: history.map(m => ({ role: m.role, content: m.content })), userId: user?.id ?? null },
      });
      if (error) throw error;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || 'Nessuna risposta.',
        action: data.action ?? undefined,
        actionDone: false, actionLoading: false,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Errore. Riprova tra poco.' }]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Web Speech API (primario) ────────────────────────────────
  const startSpeechRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;

    const recognition = new SR();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = true;  // testo in tempo reale visibile nell'input
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => {
      setVoiceState('listening');
      setInterimText('');
      finalTranscript = '';
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) { final += t; }
        else                          { interim += t; }
      }
      if (final)  { finalTranscript += final; setInterimText(''); }
      else        { setInterimText(interim); }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') return; // abortito manualmente
      const MSGS: Record<string, string> = {
        'no-speech':    'Nessun audio — riprova parlando più vicino al microfono',
        'not-allowed':  'Microfono non autorizzato — controlla i permessi del browser 🔒',
        'network':      'Errore di rete — controlla la connessione',
        'audio-capture':'Nessun microfono trovato',
      };
      toast.error(MSGS[event.error] ?? `Errore voce: ${event.error}`);
      setVoiceState('idle');
      setInterimText('');
    };

    recognition.onend = () => {
      setVoiceState('idle');
      setInterimText('');
      const transcript = finalTranscript.trim();
      if (!transcript) return;

      // Invia direttamente
      const next: Message[] = [...messagesRef.current, { role: 'user', content: transcript }];
      setMessages(next);
      sendToAssistant(next);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch {
      return false;
    }
  }, [sendToAssistant]);

  // ── Fallback MediaRecorder + Groq Whisper ────────────────────
  // Usato solo se Web Speech API non è disponibile (es. Firefox desktop)
  const chunksRef     = useRef<Blob[]>([]);
  const mediaRecRef   = useRef<MediaRecorder | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);

  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimes  = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mime   = mimes.find(m => MediaRecorder.isTypeSupported(m));
      const mr     = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        if (blob.size < 200) {
          toast.error('Registrazione troppo breve — riprova');
          setVoiceState('idle');
          return;
        }

        setVoiceState('transcribing');
        try {
          const base64: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: { audio: base64, mimeType: mr.mimeType },
          });
          if (error || !data?.text) throw new Error(data?.error ?? 'Nessun testo ricevuto');
          const transcript = data.text.trim();
          if (!transcript) throw new Error('Trascrizione vuota — riprova');

          const next: Message[] = [...messagesRef.current, { role: 'user', content: transcript }];
          setMessages(next);
          setVoiceState('idle');
          sendToAssistant(next);
        } catch (e: any) {
          toast.error('Trascrizione fallita: ' + e.message);
          setVoiceState('idle');
        }
      };

      mediaRecRef.current = mr;
      mr.start(100);
      setVoiceState('listening');
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => {
        if (s >= 119) { mr.stop(); return s; }
        return s + 1;
      }), 1000);
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Permesso microfono negato — consenti il microfono e ricarica la pagina'
        : 'Microfono non accessibile: ' + e.message;
      toast.error(msg);
    }
  }, [sendToAssistant]);

  // ── Gestione click microfono ─────────────────────────────────
  const handleMicClick = () => {
    if (voiceState === 'listening') {
      // Annulla
      recognitionRef.current?.abort();
      mediaRecRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setVoiceState('idle');
      setInterimText('');
      return;
    }
    if (voiceState !== 'idle') return;

    if (hasSpeechRecognition) {
      startSpeechRecognition();
    } else if (hasMediaRecorder) {
      startMediaRecorder();
    } else {
      toast.error('Questo browser non supporta la registrazione audio');
    }
  };

  // ── Invio messaggio testuale ─────────────────────────────────
  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    sendToAssistant(next);
  };

  // ── Esegui azione ────────────────────────────────────────────
  const executeAction = async (action: { type: string; data: Record<string, any> }, i: number) => {
    if (!user) return;
    setMessages(prev => prev.map((m, j) => j === i ? { ...m, actionLoading: true } : m));
    try {
      const { data, error } = await supabase.functions.invoke('agent-action', {
        body: { action, userId: user.id },
      });
      if (error) throw error;
      setMessages(prev => prev.map((m, j) => j === i ? { ...m, actionDone: true, actionLoading: false } : m));
      toast.success(data?.message ?? 'Azione eseguita ✅');
      if (action.type === 'create_appointment')
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointments(user.id) });
      if (action.type === 'update_status')
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.measurements(user.id) });
    } catch (e: any) {
      setMessages(prev => prev.map((m, j) => j === i ? { ...m, actionLoading: false } : m));
      toast.error('Errore: ' + (e?.message ?? String(e)));
    }
  };

  // ── Render ───────────────────────────────────────────────────
  const panelBottom = btnBottom + 56 + 8;

  return (
    <div className="print:hidden">
      {/* Bottone flottante */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ bottom: `${btnBottom}px` }}
        className={cn(
          'fixed right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300',
          open ? 'bg-foreground text-background scale-95' : 'bg-accent text-white hover:scale-105'
        )}
        aria-label={open ? 'Chiudi assistente' : 'Apri assistente'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{ bottom: `${panelBottom}px`, maxHeight: '70vh' }}
          className="fixed right-6 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-foreground text-background shrink-0">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold font-heading">Silvia</p>
              <p className="text-[10px] opacity-60">Assistente AI · accede ai tuoi dati reali</p>
            </div>
            {/* Indicatore ascolto nell'header */}
            {voiceState === 'listening' && (
              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-accent font-semibold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-accent" />
                In ascolto
              </div>
            )}
          </div>

          {/* Messaggi */}
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
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-accent text-white rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}>
                    {m.content}
                  </div>
                </div>
                {m.role === 'assistant' && m.action && !m.actionDone && (
                  <button
                    onClick={() => !m.actionLoading && executeAction(m.action!, i)}
                    disabled={!!m.actionLoading}
                    className={cn(
                      'mt-2 ml-8 flex items-center gap-1.5 text-xs font-semibold',
                      'bg-accent text-white rounded-xl px-3 py-1.5 shadow-sm transition-all duration-150',
                      m.actionLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent/90 active:scale-95'
                    )}
                  >
                    {m.actionLoading
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Esecuzione…</>
                      : <><Zap className="h-3 w-3" /> {ACTION_LABELS[m.action.type] ?? 'Esegui'}</>}
                  </button>
                )}
                {m.role === 'assistant' && m.actionDone && (
                  <p className="mt-1.5 ml-8 text-xs text-emerald-500 font-medium">✅ Eseguito</p>
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

          {/* Input */}
          <div className="border-t border-border shrink-0 p-3 space-y-1.5">
            {/* Testo intermedio Web Speech API */}
            {voiceState === 'listening' && interimText && (
              <p className="text-xs text-muted-foreground italic px-1 truncate">
                🎙 "{interimText}"
              </p>
            )}

            <div className="flex items-center gap-2">
              {/* Pulsante microfono */}
              {canRecord && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  title={voiceState === 'listening' ? 'Annulla' : 'Parla con Silvia'}
                  className={cn(
                    'shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90',
                    voiceState === 'listening'
                      ? 'bg-accent text-white animate-pulse'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-white'
                  )}
                >
                  {voiceState === 'listening'
                    ? <MicOff className="h-4 w-4" />
                    : <Mic className="h-4 w-4" />}
                </button>
              )}

              {voiceState === 'transcribing' ? (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-amber-400/10 text-amber-600 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Trascrizione…</span>
                </div>
              ) : (
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={voiceState === 'listening' ? '🎙 In ascolto…' : 'Scrivi o parla con Silvia…'}
                  className="text-sm"
                  disabled={loading || voiceState === 'listening'}
                />
              )}

              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() || loading || voiceState !== 'idle'}
                className="shrink-0 bg-accent hover:bg-accent/90 active:scale-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Hint per registrazione media (fallback Groq) */}
            {voiceState === 'listening' && !hasSpeechRecognition && (
              <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span>
                  {Math.floor(recSeconds / 60).toString().padStart(2, '0')}:{(recSeconds % 60).toString().padStart(2, '0')}
                  {' '}· Clicca mic per annullare
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
