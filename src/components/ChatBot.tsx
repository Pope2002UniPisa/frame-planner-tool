/**
 * ChatBot — Silvia AI
 *
 * Audio:
 *   - Primario: MediaRecorder API → Groq Whisper (funziona su TUTTI i browser)
 *   - Fallback: Web Speech API (solo Chrome/Edge, nessun round-trip)
 *
 * Footer overlap:
 *   - IntersectionObserver su #app-footer → sposta il bottone in alto quando il footer è visibile
 *
 * Azioni:
 *   - Pulsante arancione "📅 Crea appuntamento" ecc. → chiama agent-action
 *   - Dopo l'esecuzione invalida la React Query cache → UI aggiornata automaticamente
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Mic, MicOff, Zap, Square } from 'lucide-react';
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

// Etichette leggibili per ogni tipo di azione
const ACTION_LABELS: Record<string, string> = {
  create_appointment: '📅 Crea appuntamento',
  update_status:      '🔄 Aggiorna stato',
  send_notification:  '🔔 Invia notifica',
};

export function ChatBot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Stato UI ──────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Ciao! Sono Silvia 👋 Posso creare appuntamenti, aggiornare stati e rispondere alle tue domande. Parla col microfono o scrivi direttamente!',
    },
  ]);

  // ── Stato audio ───────────────────────────────────────────────────────────
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // Web Speech API come fallback rapido
  const recognitionRef = useRef<any>(null);
  const speechSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const mediaSupported = typeof window !== 'undefined' &&
    !!(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

  // ── Posizione bottone (evita overlap con footer) ──────────────────────────
  const [btnBottom, setBtnBottom] = useState(24); // px
  const btnPanelBottom = btnBottom + 64 + 8;       // bottone h-14 + gap

  useEffect(() => {
    const update = () => {
      const footer = document.getElementById('app-footer');
      if (!footer) { setBtnBottom(24); return; }
      const rect = footer.getBoundingClientRect();
      const vh   = window.innerHeight;
      if (rect.top < vh) {
        // Footer parzialmente visibile: alza il bottone
        setBtnBottom(Math.max(24, vh - rect.top + 12));
      } else {
        setBtnBottom(24);
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // ── Scroll automatico ai nuovi messaggi ──────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // ── Registrazione audio (MediaRecorder) ──────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Sceglie il formato più compatibile
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        // Ferma le tracce audio (rilascia microfono)
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio(mimeType);
      };

      mediaRecorderRef.current = mr;
      mr.start(250); // chunk ogni 250ms
      setRecordingState('recording');
      setRecordingSeconds(0);

      // Timer
      timerRef.current = setInterval(() => setRecordingSeconds(s => {
        if (s >= 59) { stopRecording(); return s; } // max 60 sec
        return s + 1;
      }), 1000);
    } catch (e: any) {
      // Fallback a Web Speech API se il microfono non è accessibile
      if (speechSupported) startWebSpeech();
      else toast.error('Microfono non accessibile: ' + e.message);
    }
  }, [speechSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      setRecordingState('transcribing');
      mediaRecorderRef.current?.stop();
    }
  }, []);

  const transcribeAudio = async (mimeType: string) => {
    const blob = new Blob(audioChunksRef.current, { type: mimeType });
    if (blob.size < 1000) {
      // Audio troppo corto
      setRecordingState('idle');
      toast.error('Registrazione troppo breve — riprova');
      return;
    }

    // Converti in base64
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    const base64 = btoa(binary);

    try {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64, mimeType },
      });
      if (error || !data?.text) throw new Error(data?.error || 'Trascrizione fallita');
      setInput(prev => (prev + ' ' + data.text).trim());
    } catch (e: any) {
      toast.error('Trascrizione fallita: ' + e.message);
    } finally {
      setRecordingState('idle');
    }
  };

  // ── Web Speech API (fallback / Chrome) ───────────────────────────────────
  const startWebSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart  = () => setRecordingState('recording');
    recognition.onend    = () => setRecordingState('idle');
    recognition.onerror  = () => setRecordingState('idle');
    recognition.onresult = (e: any) => {
      setInput(prev => (prev + ' ' + e.results[0][0].transcript).trim());
      setRecordingState('idle');
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleMicClick = () => {
    if (recordingState === 'recording') {
      // Ferma registrazione
      if (mediaRecorderRef.current?.state !== 'inactive') stopRecording();
      else { recognitionRef.current?.stop(); setRecordingState('idle'); }
    } else if (recordingState === 'idle') {
      if (mediaSupported) startRecording();
      else if (speechSupported) startWebSpeech();
      else toast.error('Questo browser non supporta la registrazione audio');
    }
  };

  // ── Esegui azione proposta da Silvia ─────────────────────────────────────
  const executeAction = async (action: { type: string; data: Record<string, any> }, msgIndex: number) => {
    if (!user) return;

    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, actionLoading: true } : m
    ));

    try {
      const { data, error } = await supabase.functions.invoke('agent-action', {
        body: { action, userId: user.id },
      });
      if (error) throw error;

      setMessages(prev => prev.map((m, i) =>
        i === msgIndex ? { ...m, actionDone: true, actionLoading: false } : m
      ));
      toast.success(data?.message ?? 'Azione eseguita ✅');

      // Invalida la cache → l'UI si aggiorna senza refresh
      if (action.type === 'create_appointment') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointments(user.id) });
      } else if (action.type === 'update_status') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.measurements(user.id) });
      }
    } catch (e: any) {
      setMessages(prev => prev.map((m, i) =>
        i === msgIndex ? { ...m, actionLoading: false } : m
      ));
      toast.error('Errore: ' + (e?.message ?? String(e)));
    }
  };

  // ── Invia messaggio ───────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          messages: next.map(m => ({ role: m.role, content: m.content })),
          userId: user?.id ?? null,
        },
      });
      if (error) throw error;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || 'Nessuna risposta.',
          action: data.action ?? undefined,
          actionDone: false,
          actionLoading: false,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Si è verificato un errore. Riprova tra poco.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const canRecord = mediaSupported || speechSupported;

  return (
    <div className="print:hidden">
      {/* Floating button — sale sopra il footer automaticamente */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ bottom: `${btnBottom}px` }}
        className={cn(
          'fixed right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300',
          open ? 'bg-foreground text-background scale-95' : 'bg-accent text-white hover:scale-105'
        )}
        aria-label="Apri assistente"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed right-6 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
          style={{ bottom: `${btnPanelBottom}px`, maxHeight: '70vh' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-foreground text-background shrink-0">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Silvia</p>
              <p className="text-[10px] opacity-60">Assistente AI · accede ai tuoi dati reali</p>
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

                {/* Pulsante azione — arancione, ben visibile */}
                {m.role === 'assistant' && m.action && !m.actionDone && (
                  <button
                    onClick={() => !m.actionLoading && executeAction(m.action!, i)}
                    disabled={m.actionLoading}
                    className={cn(
                      'mt-2 ml-8 flex items-center gap-1.5 text-xs font-semibold',
                      'bg-accent text-white rounded-xl px-3 py-1.5 shadow-sm',
                      'transition-all duration-150',
                      m.actionLoading
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:bg-accent/90 active:scale-95'
                    )}
                  >
                    {m.actionLoading
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Esecuzione...</>
                      : <><Zap className="h-3 w-3" /> {ACTION_LABELS[m.action.type] ?? 'Esegui'}</>
                    }
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

          {/* Input area */}
          <div className="border-t border-border shrink-0">
            {/* Barra di registrazione */}
            {recordingState !== 'idle' && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 text-xs font-medium',
                recordingState === 'recording'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-amber-500/10 text-amber-600'
              )}>
                {recordingState === 'recording' ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Registrazione in corso… {recordingSeconds}s
                    <span className="ml-auto opacity-60">max 60s</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Trascrizione con Whisper AI…
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2 p-3">
              {/* Bottone microfono — sempre visibile se il browser lo supporta */}
              {canRecord && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={recordingState === 'transcribing'}
                  className={cn(
                    'shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-150',
                    recordingState === 'recording'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : recordingState === 'transcribing'
                      ? 'bg-amber-400 text-white cursor-not-allowed'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-white'
                  )}
                  title={
                    recordingState === 'recording' ? 'Ferma registrazione'
                    : recordingState === 'transcribing' ? 'Trascrizione in corso…'
                    : 'Registra messaggio vocale'
                  }
                >
                  {recordingState === 'recording'
                    ? <Square className="h-3.5 w-3.5 fill-current" />
                    : recordingState === 'transcribing'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Mic className="h-4 w-4" />
                  }
                </button>
              )}

              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder={
                  recordingState === 'recording' ? '🎤 In ascolto…'
                  : recordingState === 'transcribing' ? '⏳ Trascrizione in corso…'
                  : 'Scrivi o parla con Silvia…'
                }
                className="text-sm"
                disabled={loading || recordingState !== 'idle'}
              />
              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() || loading || recordingState !== 'idle'}
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
