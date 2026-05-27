/**
 * ChatBot — Silvia AI
 *
 * Footer overlap: IntersectionObserver su #app-footer.
 * Audio: MediaRecorder → Groq Whisper large-v3 (funziona su tutti i browser/dispositivi).
 * UX: mic a sinistra per iniziare/annullare, invio a destra per mandare il messaggio vocale.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Mic, Zap } from 'lucide-react';
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
  const mediaRecRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendAfterStop  = useRef(false); // true = stop+trascrivi+invia, false = annulla

  const canRecord = typeof window !== 'undefined' &&
    !!(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

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

  // ── MediaRecorder + Groq Whisper ─────────────────────────────────────────
  // Unico sistema audio: funziona su Chrome, Safari, Firefox, mobile.
  // sendAfterStop=true → trascrivi e invia; false → annulla.
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Scegli il MIME type migliore supportato dal browser
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
        .find(m => MediaRecorder.isTypeSupported(m)) ?? 'audio/webm';

      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());

        // Annullato dall'utente → scarta tutto
        if (!sendAfterStop.current) {
          setAudioState('idle');
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 500) {
          toast.error('Registrazione troppo breve — riprova');
          setAudioState('idle');
          return;
        }

        setAudioState('transcribing');
        try {
          // base64 encode
          const ab    = await blob.arrayBuffer();
          const bytes = new Uint8Array(ab);
          let bin = '';
          bytes.forEach(b => (bin += String.fromCharCode(b)));
          const base64 = btoa(bin);

          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: { audio: base64, mimeType: mime },
          });
          if (error || !data?.text) throw new Error(data?.error ?? 'Nessun testo ricevuto');

          const transcript = data.text.trim();
          // Invia direttamente il messaggio vocale a Silvia
          setAudioState('idle');
          setMessages(prev => {
            const next: Message[] = [...prev, { role: 'user', content: transcript }];
            // Avvia la chiamata AI in parallelo
            sendToAssistant(next);
            return next;
          });
        } catch (e: any) {
          toast.error('Trascrizione fallita: ' + e.message);
          setAudioState('idle');
        }
      };

      mediaRecRef.current = mr;
      sendAfterStop.current = false;
      mr.start(200);
      setAudioState('recording');
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => {
        if (s >= 119) {
          // Limite 2 minuti: invia automaticamente
          sendAfterStop.current = true;
          stopRecording();
          return s;
        }
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

  // Clicca mic → inizia / annulla
  const handleMicClick = () => {
    if (audioState === 'recording') {
      sendAfterStop.current = false; // annulla
      stopRecording();
    } else if (audioState === 'idle') {
      if (canRecord) startRecording();
      else toast.error('Questo browser non supporta la registrazione audio');
    }
  };

  // Clicca invio durante registrazione → ferma + trascrivi + invia
  const handleSendVoice = () => {
    if (audioState !== 'recording') return;
    sendAfterStop.current = true;
    stopRecording();
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

  // ── Chiamata al chat-assistant (riutilizzata da testo e voce) ──────────────
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

  // ── Invio messaggio testuale ─────────────────────────────────────────────
  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    sendToAssistant(next);
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
          <div className="border-t border-border shrink-0 p-3">
            {audioState === 'idle' ? (
              /* ── Modalità testo ── */
              <div className="flex items-center gap-2">
                {canRecord && (
                  <button
                    type="button"
                    onClick={handleMicClick}
                    title="Registra messaggio vocale"
                    className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-accent hover:text-white transition-all duration-150 active:scale-90"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                )}
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Scrivi o parla con Silvia…"
                  className="text-sm"
                  disabled={loading}
                />
                <Button
                  size="icon"
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="shrink-0 bg-accent hover:bg-accent/90 active:scale-90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : audioState === 'recording' ? (
              /* ── Modalità registrazione (stile WhatsApp) ── */
              <div className="flex items-center gap-2">
                {/* Annulla (X) — a sinistra */}
                <button
                  type="button"
                  onClick={handleMicClick}
                  title="Annulla registrazione"
                  className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-red-500 hover:text-white transition-all duration-150 active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
                {/* Indicatore registrazione */}
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-red-500/10 text-red-600 text-sm font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span>
                    {Math.floor(recSeconds / 60).toString().padStart(2, '0')}:{(recSeconds % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs text-red-400 truncate">In registrazione…</span>
                </div>
                {/* Invia — a destra */}
                <button
                  type="button"
                  onClick={handleSendVoice}
                  title="Invia messaggio vocale"
                  className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center bg-accent text-white hover:bg-accent/90 transition-all duration-150 active:scale-90 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* ── Trascrizione in corso ── */
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-400/10 text-amber-600 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Trascrizione in corso…</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
