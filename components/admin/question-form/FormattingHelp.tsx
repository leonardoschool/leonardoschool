'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { colors } from '@/lib/theme/colors';

/**
 * The "Come formattare" cheat sheet shown next to a question text field.
 * Shared by the creation form and the PDF import review so both explain the
 * same LaTeX/HTML syntax.
 */
export default function FormattingHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`inline-flex items-center gap-1 text-sm ${colors.text.muted} hover:${colors.primary.text} transition-colors`}
      >
        <Info className="w-4 h-4" />
        Come formattare
      </button>

      {isOpen && (
        <div className={`mt-2 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
          <h4 className={`font-medium ${colors.text.primary} mb-2`}>Formattazione del testo</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className={`font-medium ${colors.text.secondary} mb-1`}>LaTeX (formule matematiche)</p>
              <ul className={`${colors.text.muted} space-y-1`}>
                <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">$formula$</code> - formula inline</li>
                <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">$$formula$$</code> - formula centrata</li>
                <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">\(formula\)</code> - formula inline</li>
                <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">\[formula\]</code> - formula centrata</li>
              </ul>
            </div>
            <div>
              <p className={`font-medium ${colors.text.secondary} mb-1`}>HTML (formattazione testo)</p>
              <ul className={`${colors.text.muted} space-y-1`}>
                <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;sub&gt;testo&lt;/sub&gt;</code> - pedice</li>
                <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;sup&gt;testo&lt;/sup&gt;</code> - apice</li>
                <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;b&gt;testo&lt;/b&gt;</code> - <b>grassetto</b></li>
                <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;i&gt;testo&lt;/i&gt;</code> - <i>corsivo</i></li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className={`mt-3 text-sm ${colors.primary.text} hover:underline`}
          >
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}
