import { useEffect, useRef } from 'react';
import { BookViewer, type BookInput } from '../book3d/BookViewer';

interface Book3DProps extends BookInput {
  title: string;
  onReady: () => void;
  onFail: () => void;
}

/**
 * The interactive 3D book. Loaded lazily (three.js is big), so the flat
 * cover in BookCover.tsx stands in until the first frame is on screen.
 */
export default function Book3D({ title, lang, format, weightOz, frontImage, onReady, onFail }: Book3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<BookViewer | null>(null);

  // Keep the latest callbacks without re-creating the viewer.
  const cb = useRef({ onReady, onFail });
  cb.current = { onReady, onFail };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let viewer: BookViewer;
    try {
      viewer = new BookViewer(canvas);
    } catch (err) {
      console.warn('3D book unavailable, using the flat cover.', err);
      cb.current.onFail();
      return undefined;
    }
    viewer.onFirstFrame = () => cb.current.onReady();
    viewerRef.current = viewer;

    const onLost = (e: Event) => {
      e.preventDefault();
      cb.current.onFail();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewerRef.current?.setBook({ lang, format, weightOz, frontImage }).catch((err) => {
      console.warn('Could not build the 3D book, using the flat cover.', err);
      cb.current.onFail();
    });
  }, [lang, format, weightOz, frontImage]);

  return (
    <canvas
      ref={canvasRef}
      className="book3d-canvas"
      role="img"
      aria-label={title ? `${title} — 3D model. Drag to turn it; flick to spin it.` : '3D book model'}
    />
  );
}
