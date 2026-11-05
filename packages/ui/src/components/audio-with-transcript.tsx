import { cn } from '../lib/cn.ts';

/**
 * Recorded audio always travels with its transcript (and a captions track when there is a .vtt).
 * No autoplay, nothing is downloaded until the person presses play (preload none).
 * `transcript` is required on purpose: audio without a text alternative does not type-check.
 */
export function AudioWithTranscript({
  titulo,
  src,
  transcript,
  transcriptLabel,
  captionsSrc,
  captionsLang,
  captionsLabel,
  className,
}: {
  titulo: string;
  src: string;
  transcript: string;
  transcriptLabel: string;
  captionsSrc?: string;
  captionsLang?: string;
  captionsLabel?: string;
  className?: string;
}) {
  return (
    <figure className={cn('m-0 rounded-card border-2 border-line bg-surface p-4', className)}>
      <figcaption className="mb-2 text-body font-bold text-ink">{titulo}</figcaption>
      <audio controls preload="none" src={src} aria-label={titulo} className="w-full">
        {captionsSrc ? <track kind="captions" src={captionsSrc} srcLang={captionsLang} label={captionsLabel ?? captionsLang} default /> : null}
      </audio>
      <details open className="mt-2">
        <summary className="min-h-12 cursor-pointer py-3 text-small font-bold text-ink">{transcriptLabel}</summary>
        <p className="m-0 max-w-[62ch] text-body text-ink-2">{transcript}</p>
      </details>
    </figure>
  );
}
