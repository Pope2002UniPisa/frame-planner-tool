import { useEffect, useRef } from 'react';

// Visualizzazione onda audio in tempo reale (stile WhatsApp) mentre il microfono
// ascolta. Apre un proprio stream getUserMedia + AnalyserNode e disegna le barre.
// Si chiude e rilascia il microfono allo smontaggio.
export function MicWaveform({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let analyser: AnalyserNode | null = null;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
        const source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const c = canvas.getContext('2d');
        if (!c) return;

        const draw = () => {
          if (stopped || !analyser) return;
          analyser.getByteFrequencyData(data);
          const w = canvas.width, h = canvas.height;
          c.clearRect(0, 0, w, h);
          const bars = 28;
          const step = Math.max(1, Math.floor(data.length / bars));
          const bw = w / bars;
          c.fillStyle = '#d99a52'; // tono accent del brand
          for (let i = 0; i < bars; i++) {
            const v = data[i * step] / 255;
            const bh = Math.max(3, v * v * h); // v^2 = onda più reattiva
            c.beginPath();
            const x = i * bw + bw * 0.25;
            const bwReal = bw * 0.5;
            const y = (h - bh) / 2;
            const r = bwReal / 2;
            // barra arrotondata
            c.moveTo(x + r, y);
            c.arcTo(x + bwReal, y, x + bwReal, y + bh, r);
            c.arcTo(x + bwReal, y + bh, x, y + bh, r);
            c.arcTo(x, y + bh, x, y, r);
            c.arcTo(x, y, x + bwReal, y, r);
            c.fill();
          }
          raf = requestAnimationFrame(draw);
        };
        draw();
      } catch {
        /* microfono non accessibile: nessuna onda, ma la trascrizione continua */
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach(t => t.stop());
      ctx?.close().catch(() => {});
    };
  }, []);

  return <canvas ref={canvasRef} width={240} height={28} className={className} />;
}
