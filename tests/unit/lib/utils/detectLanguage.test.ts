import { describe, it, expect } from 'vitest';
import { detectQuestionLanguage } from '@/lib/utils/detectLanguage';

describe('detectQuestionLanguage', () => {
  it('riconosce una domanda italiana', () => {
    expect(
      detectQuestionLanguage(
        'Quale delle seguenti affermazioni sulla struttura della cellula eucariote è corretta?'
      )
    ).toBe('IT');
  });

  it('riconosce una domanda inglese', () => {
    expect(
      detectQuestionLanguage(
        'Which of the following statements about the structure of the eukaryotic cell is correct?'
      )
    ).toBe('EN');
  });

  it('riconosce la domanda IMAT che era finita etichettata come italiana', () => {
    expect(
      detectQuestionLanguage(
        '8.0 g of copper oxide is reduced to 5.6 g of copper using hydrogen gas. What is the relative atomic mass of the element that was removed from the oxide?'
      )
    ).toBe('EN');
  });

  it('usa anche il testo delle risposte quando la domanda è corta', () => {
    expect(
      detectQuestionLanguage(
        'Copper oxide',
        'The mass of the sample',
        'The volume of the gas that was produced'
      )
    ).toBe('EN');
  });

  it('non decide quando il testo è troppo corto', () => {
    expect(detectQuestionLanguage('2 + 2 = ?')).toBeNull();
  });

  it('non decide su una formula senza parole', () => {
    expect(
      detectQuestionLanguage('$\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}$ \\includegraphics{fig.png}')
    ).toBeNull();
  });

  it('non decide su un testo misto, invece di tirare a indovinare', () => {
    // Una consegna inglese che cita un testo italiano: meglio lasciare scegliere
    // a chi importa che etichettarla male.
    expect(
      detectQuestionLanguage(
        'Which of the following is the correct translation of "il gatto sale sulla sedia con calma"?'
      )
    ).toBeNull();
  });

  it('ignora i tag HTML e non li conta come parole', () => {
    expect(
      detectQuestionLanguage('<p>Quale <b>delle</b> seguenti sostanze non è un acido per la teoria?</p>')
    ).toBe('IT');
  });
});
