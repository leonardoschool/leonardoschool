/**
 * Leonardo School Mobile - LaTeX Renderer
 * 
 * Componente per il rendering di formule LaTeX usando WebView con KaTeX.
 * Approccio semplice e compatibile che non richiede dipendenze native.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { hasRenderableRichText } from '@shared/richText/latex';
import { colors } from '../../lib/theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { RichContentWebView } from './RichContentWebView';

// ==================== TYPES ====================

interface LaTeXRendererProps {
  /** LaTeX string to render */
  latex: string;
  /** Display mode (block) vs inline mode */
  displayMode?: boolean;
  /** Font size in pixels */
  fontSize?: number;
  /** Optional custom style */
  style?: object;
  /** Minimum height for the WebView */
  minHeight?: number;
}

// ==================== CONSTANTS ====================

// KaTeX JS (using CDN for simplicity - in production, you might want to bundle this)
const KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
const KATEX_CSS_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';

// ==================== COMPONENT ====================

/**
 * LaTeXRenderer - Renders LaTeX formulas using WebView with KaTeX
 * 
 * Usage:
 * <LaTeXRenderer latex="x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}" />
 */
export function LaTeXRenderer({
  latex,
  displayMode = true,
  fontSize = 16,
  style,
  minHeight = 40,
}: Readonly<LaTeXRendererProps>) {
  const { themed } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [webViewHeight, setWebViewHeight] = useState(minHeight);

  const textColor = themed(colors.text.primary);
  const bgColor = themed(colors.background.primary);

  // Generate HTML content with KaTeX
  const htmlContent = useMemo(() => {
    if (!latex?.trim()) return '';

    // Escape special HTML characters in LaTeX
    const escapedLatex = latex
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

    // Prepare LaTeX for use in JavaScript string context
    const jsEscapedLatex = escapedLatex
      .replaceAll('\\', '\\\\')
      .replaceAll('"', '\\"');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="${KATEX_CSS_CDN}">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      background-color: ${bgColor};
      color: ${textColor};
      font-size: ${fontSize}px;
      overflow: hidden;
      -webkit-text-size-adjust: 100%;
    }
    #container {
      display: flex;
      align-items: center;
      justify-content: ${displayMode ? 'center' : 'flex-start'};
      min-height: ${minHeight}px;
      padding: 8px;
    }
    .katex {
      font-size: 1.1em;
      color: ${textColor};
    }
    .katex-display {
      margin: 0;
      padding: 0;
    }
    .error {
      color: #ef4444;
      font-size: 14px;
      padding: 8px;
    }
  </style>
</head>
<body>
  <div id="container">
    <span id="latex"></span>
  </div>
  <script src="${KATEX_CDN}"></script>
  <script>
    try {
      katex.render("${jsEscapedLatex}", document.getElementById('latex'), {
        displayMode: ${displayMode},
        throwOnError: false,
        output: 'html',
        trust: true
      });
      
      // Send height to React Native
      setTimeout(function() {
        var height = document.getElementById('container').offsetHeight;
        window.ReactNativeWebView.postMessage(JSON.stringify({ height: height }));
      }, 100);
    } catch (e) {
      document.getElementById('latex').innerHTML = '<span class="error">Errore nel rendering: ' + e.message + '</span>';
      window.ReactNativeWebView.postMessage(JSON.stringify({ height: 50 }));
    }
  </script>
</body>
</html>
    `;
  }, [latex, displayMode, fontSize, textColor, bgColor, minHeight]);

  // Handle messages from WebView
  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.height) {
        setWebViewHeight(Math.max(data.height, minHeight));
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  // Don't render if no LaTeX
  if (!latex?.trim()) {
    return null;
  }

  return (
    <View style={[styles.container, { minHeight }, style]}>
      <WebView
        source={{ html: htmlContent }}
        style={[styles.webview, { height: webViewHeight, width: screenWidth - 48 }]}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        automaticallyAdjustContentInsets={false}
      />
    </View>
  );
}

// ==================== SIMPLE TEXT FALLBACK ====================

/**
 * SimpleLaTeXText - Fallback for when WebView is not available
 * Displays the raw LaTeX wrapped in $ symbols
 */
export function SimpleLaTeXText({ latex, style }: Readonly<{ latex: string; style?: object }>) {
  const { themed } = useTheme();
  
  if (!latex?.trim()) return null;

  return (
    <Text style={[styles.fallbackText, { color: themed(colors.text.secondary) }, style]}>
      {`$${latex}$`}
    </Text>
  );
}

// ==================== MIXED CONTENT RENDERER ====================

/**
 * RichTextWithLaTeX - Renders question/answer content: HTML, LaTeX and inline images.
 *
 * Delegates to RichContentWebView, which runs the same `shared/richText` pipeline as the
 * web app. It used to split on `$...$` and print everything else as plain text, which is
 * why inline `\includegraphics{...}` images and HTML lists were invisible on the app.
 */
interface RichTextWithLaTeXProps {
  content: string;
  style?: object;
  fontSize?: number;
}

export function RichTextWithLaTeX({ content, style, fontSize = 16 }: Readonly<RichTextWithLaTeXProps>) {
  const { themed } = useTheme();

  if (!content?.trim()) {
    return null;
  }

  // Plain prose (no markup, math or image) stays a native <Text>: it avoids a WebView per
  // question and keeps text selection and accessibility behaving natively.
  if (!hasRenderableRichText(content)) {
    return (
      <Text style={[styles.richText, { color: themed(colors.text.primary), fontSize }, style]}>
        {content}
      </Text>
    );
  }

  return <RichContentWebView content={content} fontSize={fontSize} style={style} />;
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    backgroundColor: 'transparent',
  },
  fallbackText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  richTextContainer: {
    flexDirection: 'column',
  },
  richText: {
    lineHeight: 24,
  },
});

export default LaTeXRenderer;
