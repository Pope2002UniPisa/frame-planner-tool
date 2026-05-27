/**
 * transcribe-audio — trascrive audio con Groq Whisper large-v3
 *
 * Riceve: { audio: "<base64 WebM>", mimeType: "audio/webm" }
 * Restituisce: { text: "trascrizione" }
 *
 * Groq Whisper è gratuito nel piano free (60 req/min, 7200 sec audio/ora).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    if (!GROQ_API_KEY) return json({ error: 'GROQ_API_KEY non configurata' }, 500);

    const { audio, mimeType = 'audio/webm' } = await req.json() as {
      audio: string;   // base64
      mimeType?: string;
    };

    if (!audio) return json({ error: 'Campo "audio" obbligatorio' }, 400);

    // Decodifica base64 → Uint8Array → Blob
    const binaryStr = atob(audio);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const audioBlob = new Blob([bytes], { type: mimeType });

    // Estensione file da mimeType
    const ext = mimeType.includes('webm') ? 'webm'
               : mimeType.includes('ogg')  ? 'ogg'
               : mimeType.includes('mp4')  ? 'mp4'
               : mimeType.includes('mp3')  ? 'mp3'
               : 'webm';

    // FormData per Groq Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, `audio.${ext}`);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'it');
    formData.append('response_format', 'json');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[transcribe-audio] Groq error:', err);
      return json({ error: `Errore Groq: ${err}` }, 500);
    }

    const data = await res.json();
    return json({ text: data.text ?? '' });

  } catch (err) {
    console.error('[transcribe-audio] errore:', err);
    return json({ error: String(err) }, 500);
  }
});
