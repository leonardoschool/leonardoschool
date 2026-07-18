/* eslint-disable @next/next/no-img-element -- plain <img> is the point: these assert the
   delegation works on raw images, including ones next/image never produces. */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoomableImageArea from '@/components/ui/ZoomableImageArea';

describe('ZoomableImageArea', () => {
  it('opens an inline image injected as raw HTML', () => {
    // Inline `\includegraphics{...}` figures reach the page through
    // dangerouslySetInnerHTML, so no React prop can make them zoomable — event
    // delegation is the only thing that covers them.
    render(
      <ZoomableImageArea>
        <div dangerouslySetInnerHTML={{ __html: '<img src="https://cdn.example/nephron.png" alt="Nefrone" />' }} />
      </ZoomableImageArea>
    );

    fireEvent.click(screen.getByAltText('Nefrone'));

    const overlay = screen.getByRole('dialog', { name: 'Immagine ingrandita' });
    expect(overlay).toBeInTheDocument();
    expect(screen.getAllByAltText('Nefrone')).toHaveLength(2); // original + enlarged
  });

  it('opens a regular React child image too', () => {
    render(
      <ZoomableImageArea>
        <img src="https://cdn.example/figure.png" alt="Figura" />
      </ZoomableImageArea>
    );

    fireEvent.click(screen.getByAltText('Figura'));
    expect(screen.getByRole('dialog', { name: 'Immagine ingrandita' })).toBeInTheDocument();
  });

  it('marks images as keyboard-reachable and opens on Enter', () => {
    render(
      <ZoomableImageArea>
        <img src="https://cdn.example/figure.png" alt="Figura" />
      </ZoomableImageArea>
    );

    const img = screen.getByAltText('Figura');
    expect(img).toHaveAttribute('tabindex', '0');
    expect(img).toHaveAttribute('role', 'button');

    fireEvent.keyDown(img, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: 'Immagine ingrandita' })).toBeInTheDocument();
  });

  it('closes on Escape and restores body scroll', () => {
    render(
      <ZoomableImageArea>
        <img src="https://cdn.example/figure.png" alt="Figura" />
      </ZoomableImageArea>
    );

    fireEvent.click(screen.getByAltText('Figura'));
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Immagine ingrandita' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('ignores clicks that are not on an image', () => {
    render(
      <ZoomableImageArea>
        <p>Testo della domanda</p>
      </ZoomableImageArea>
    );

    fireEvent.click(screen.getByText('Testo della domanda'));
    expect(screen.queryByRole('dialog', { name: 'Immagine ingrandita' })).not.toBeInTheDocument();
  });
});
