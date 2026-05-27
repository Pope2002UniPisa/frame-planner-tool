/**
 * ChatBot — Silvia AI
 *
 * Footer overlap: IntersectionObserver su #app-footer.
 *   Funziona con qualsiasi scroll container (non dipende da window.scroll).
 *
 * Audio:
 *   - Chrome/Edge: Web Speech API in tempo reale (più accurata, no round-trip)
 *   - Safari/Firefox: MediaRecorder → Groq Whisper large-v3 (edge function)
 *   Dopo la trascrizione il testo appare nell'input; l'utente può correggere prima di inviare.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Mic, Square, Zap } from 'lucide-react';
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

  // ── Stato audio ─────────────────────────────────────────────────────────
  const [audioState, setAudioState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const recogRef      = useRef<any>(null);

  // Priorità: Web Speech API (Chrome/Edge, real-time) > MediaRecorder + Whisper (altri browser)
  const hasWebSpeech = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasMediaRec  = typeof window !== 'undefined' &&
    !!(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
  const canRecord    = hasWebSpeech || hasMediaRec;

  // ── Footer overlap: IntersectionObserver ────────────────────────────────
  // Funziona con qualsiasi scroll container (main con overflow-y-auto incluso)
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
      // Threshold fine-grained: aggiorna la posizione mentre il footer scorre
      { threshold: Array.from({ length: 21 }, (_, i) => i * 0.05) }
    );
    ioRef.current.observe(footer);
  }, []);

  useEffect(() => {
    // Tenta subito
    attachFooterObserver();
    // Riprova ogni 300ms finché il footer non compare nel DOM
    // (succede quando si naviga alla Dashboard dopo il primo render)
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

  // ── Scroll automatico ────────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // ── Web Speech API (Chrome/Edge — real-time, accurata) ───────────────────
  const startWebSpeech = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'it-IT';
    r.continuous = false;
    r.interimResults = false;
    r.onstart  = () => setAudioState('recording');
    r.onend    = () => setAudioState('idle');
    r.onerror  = (e: any) => {
      setAudioState('idle');
      if (e.error === 'not-allowed') {
        toast.error('Permesso microfono negato — clicca il lucchetto 🔒 nella barra degli indirizzi e consenti il microfono, poi ricarica la pagina');
      } else if (e.error === 'no-speech') {
        toast.info('Nessun audio rilevato — riprova');
      } else {
        toast.error(`Microfono non accessibile (${e.error ?? 'sconosciuto'})`);
      }
    };
    r.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev + ' ' + transcript).trim());
      setAudioState('idle');
    };
    recogRef.current = r;
    r.start();
  }, []);

  // ── MediaRecorder + Groq Whisper (Safari, Firefox) ───────────────────────
  const startMediaRec = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';

      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 500) { setAudioState('idle'); return; }

        setAudioState('transcribing');
        const ab = await blob.arrayBuffer();
        const bytes = new Uint8Array(ab);
        let bin = '';
        bytes.forEach(b => bin += String.fromCharCode(b));
        const base64 = btoa(bin);

        try {
          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: { audio: base64, mimeType: mime },
          });
          if (error || !data?.text) throw new Error(data?.error ?? 'Errore trascrizione');
          setInput(prev => (prev + ' ' + data.text).trim());
          toast.info(`Trascritto: "${data.text}"`, { duration: 3000 });
        } catch (e: any) {
          toast.error('Trascrizione fallita: ' + e.message);
        } finally {
          setAudioState('idle');
        }
      };
      mediaRecRef.current = mr;
      mr.start(250);
      setAudioState('recording');
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => {
        if (s >= 59) { stopRecording(); return s; }
        return s + 1;
      }), 1000);
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Permesso microfono negato — clicca il lucchetto 🔒 nella barra e consenti il microfono, poi ricarica'
        : 'Microfono non accessibile: ' + e.message;
      toast.error(msg);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current?.stop();
  }, []);

  const handleMicClick = () => {
    if (audioState === 'recording') {
      if (hasWebSpeech) { recogRef.current?.stop(); setAudioState('idle'); }
      else stopRecording();
    } else if (audioState === 'idle') {
      // Chrome/Edge: Web Speech API (real-time, no lag)
      if (hasWebSpeech) startWebSpeech();
      else if (hasMediaRec) startMediaRec();
      else toast.error('Questo browser non supporta la registrazione audio');
    }
  };

  // ── Esegui azione ────────────────────────────────────────────────────────
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

  // ── Invia messaggio ──────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { messages: next.map(m => ({ role: m.role, content: m.content })), userId: user?.id ?? null },
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
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const panelBottom = btnBottom + 56 + 8; // h-14 bottone + 8px gap

  return (
    <div className="print:hidden">
      {/* Bottone flottante — si alza automaticamente quando il footer è visibile */}
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
              <p className="text-sm font-semibold">Silvia</p>
              <p className="text-[10px] opacity-60">Assistente AI · accede ai tuoi dati reali</p>
            </div>
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
                    m.role === 'user' ? 'bg-accent text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                  )}>
                    {m.content}
                  </div>
                </div>

                {/* Pulsante azione */}
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
                  <p className="mt-1.5 ml-8 text-xs text-emerald-500 font-medium">✅ Eseguito con successo</p>
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
          <div className="border-t border-border shrink-0">
            {/* Barra di stato durante la registrazione */}
            {audioState !== 'idle' && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs font-medium',
                audioState === 'recording' ? 'bg-red-500/10 text-red-600' : 'bg-amber-400/10 text-amber-600'
              )}>
                {audioState === 'recording' ? (
                  <><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  In ascolto… {recSeconds}s — clicca di nuovo per fermare</>
                ) : (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Trascrizione in corso…</>
                )}
              </div>
            )}

            <div className="flex gap-2 p-3">
              {canRecord && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={audioState === 'transcribing'}
                  title={audioState === 'recording' ? 'Ferma' : 'Parla con Silvia'}
                  className={cn(
                    'shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-150',
                    audioState === 'recording'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : audioState === 'transcribing'
                      ? 'bg-amber-400 text-white cursor-not-allowed'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-white'
                  )}
                >
                  {audioState === 'recording'
                    ? <Square className="h-3.5 w-3.5 fill-current" />
                    : audioState === 'transcribing'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Mic className="h-4 w-4" />}
                </button>
              )}
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder={
                  audioState === 'recording' ? '🎤 In ascolto…'
                  : audioState === 'transcribing' ? '⏳ Trascrizione…'
                  : 'Scrivi o parla con Silvia…'
                }
                className="text-sm"
                disabled={loading || audioState !== 'idle'}
              />
              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() || loading || audioState !== 'idle'}
                className="shrink-0 bg-accent hover:bg-accent/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
