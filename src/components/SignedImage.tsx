import { useEffect, useState } from 'react';
import { isMeasurementPhoto, signMeasurementPhoto } from '@/lib/photoUrls';

type SignedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & { src: string };

/**
 * Drop-in per <img> usato nei punti che mostrano foto rilievo.
 * - Se `src` è una foto del bucket privato `measurement-photos`, genera un
 *   signed URL a scadenza prima di renderizzare.
 * - Ogni altro `src` (portfolio, news, loghi, URL pubblici) è mostrato subito
 *   invariato — così il componente è sicuro anche dove le sorgenti sono miste
 *   (es. lightbox condiviso).
 */
export function SignedImage({ src, ...imgProps }: SignedImageProps) {
  const needsSigning = isMeasurementPhoto(src);
  const [resolved, setResolved] = useState<string>(needsSigning ? '' : src);

  useEffect(() => {
    let active = true;
    if (isMeasurementPhoto(src)) {
      setResolved('');
      signMeasurementPhoto(src).then(url => { if (active) setResolved(url); });
    } else {
      setResolved(src);
    }
    return () => { active = false; };
  }, [src]);

  if (!resolved) return null;
  return <img src={resolved} {...imgProps} />;
}
