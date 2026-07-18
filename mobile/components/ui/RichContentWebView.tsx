/**
 * Leonardo School Mobile - Rich content renderer
 *
 * Renders question/answer content (HTML + LaTeX + inline images) inside a WebView,
 * reusing the SAME `shared/richText` pipeline as the web app. The previous mobile
 * renderer only understood `$...$` and printed everything else verbatim, so inline
 * `\includegraphics{...}` images and HTML lists were invisible to students on the app
 * while rendering correctly on the web — every web-side fix stayed invisible to them.
 */

import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { normalizeStoredRichText } from '@shared/richText/latex';
import { richTextSanitizeConfig } from '@shared/richText/sanitize';
import { colors } from '../../lib/theme/colors';
import { useTheme } from '../../contexts/ThemeContext';

// Pinned to the same major as the web app's katex dependency.
const KATEX_CSS_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
const KATEX_JS_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
const KATEX_AUTORENDER_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
const DOMPURIFY_CDN = 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js';

interface RichContentWebViewProps {
  /** Raw content as stored in the database */
  content: string;
  /** Base font size in pixels */
  fontSize?: number;
  /** Optional container style */
  style?: object;
}

/**
 * Serializes a value for embedding in an inline <script>. JSON.stringify alone is not
 * enough: `</script>` inside a string would close the tag early, and U+2028/U+2029 are
 * literal line terminators in JS source.
 */
// Built via char codes so no raw U+2028/U+2029 ever appears in this source file.
const JS_LINE_SEP = String.fromCharCode(0x2028);
const JS_PARA_SEP = String.fromCharCode(0x2029);

function toScriptLiteral(value: unknown): string {
  return JSON.stringify(value)
    .split('<').join('\\u003C')
    .split(JS_LINE_SEP).join('\\u2028')
    .split(JS_PARA_SEP).join('\\u2029');
}

export function RichContentWebView({ content, fontSize = 16, style }: Readonly<RichContentWebViewProps>) {
  const { themed } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [webViewHeight, setWebViewHeight] = useState(fontSize * 2);
  const hasLoadedRef = useRef(false);

  const textColor = themed(colors.text.primary);
  const bgColor = themed(colors.background.primary);

  const htmlContent = useMemo(() => {
    if (!content?.trim()) return '';

    // Same normalization the web renderer runs: entities, \newline, inline
    // \includegraphics -> <img>, and $-wrapping of bare LaTeX commands.
    const normalized = normalizeStoredRichText(content);

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="${KATEX_CSS_CDN}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background-color: ${bgColor};
      color: ${textColor};
      font-size: ${fontSize}px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
      overflow-x: hidden;
    }
    #content { padding: 2px 0; word-wrap: break-word; }
    #content img { max-width: 100%; height: auto; display: block; margin: 8px auto; border-radius: 4px; }
    #content ol, #content ul { padding-left: 1.4em; margin: 6px 0; }
    #content li { margin: 4px 0; }
    #content p { margin: 6px 0; }
    #content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    #content th, #content td { border: 1px solid rgba(128,128,128,0.4); padding: 4px 6px; text-align: left; }
    /* Wide formulas scroll inside their own block instead of widening the page. */
    .katex-display { overflow-x: auto; overflow-y: hidden; padding: 2px 0; }
    .katex { color: ${textColor}; }
  </style>
</head>
<body>
  <div id="content"></div>
  <script src="${DOMPURIFY_CDN}"></script>
  <script src="${KATEX_JS_CDN}"></script>
  <script src="${KATEX_AUTORENDER_CDN}"></script>
  <script>
    (function () {
      var RAW = ${toScriptLiteral(normalized)};
      var CONFIG = ${toScriptLiteral(richTextSanitizeConfig)};
      var target = document.getElementById('content');

      // Sanitize before insertion, with the same allowlist as the web renderer. If the
      // CDN failed, fall back to textContent rather than injecting unsanitized markup.
      if (typeof DOMPurify !== 'undefined') {
        target.innerHTML = DOMPurify.sanitize(RAW, CONFIG);
      } else {
        target.textContent = RAW;
      }

      if (typeof renderMathInElement !== 'undefined') {
        try {
          renderMathInElement(target, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\\\[', right: '\\\\]', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\\\(', right: '\\\\)', display: false }
            ],
            throwOnError: false
          });
        } catch (e) { /* leave the raw math visible rather than blanking the question */ }
      }

      var lastHeight = 0;
      function postHeight() {
        var height = document.body.scrollHeight;
        if (height > 0 && height !== lastHeight) {
          lastHeight = height;
          window.ReactNativeWebView.postMessage(JSON.stringify({ height: height }));
        }
      }

      postHeight();
      // Images and late-loading fonts change the height after first paint; without this
      // the WebView keeps its initial size and the image ends up clipped or invisible.
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(postHeight).observe(document.body);
      }
      window.addEventListener('load', postHeight);
      Array.prototype.forEach.call(document.images, function (img) {
        img.addEventListener('load', postHeight);
        img.addEventListener('error', postHeight);
      });
    })();
  </script>
</body>
</html>`;
  }, [content, fontSize, textColor, bgColor]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (typeof data.height === 'number' && data.height > 0) {
        setWebViewHeight(data.height);
      }
    } catch {
      // A malformed height message must not take the question down with it.
    }
  };

  if (!content?.trim()) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
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
        androidLayerType="software"
        // The question text is not a browser: allow the initial document, then block any
        // navigation embedded markup might try. Gated on a ref rather than on the URL
        // because the first load reports a different scheme across platforms, and getting
        // that wrong would leave the question blank.
        onShouldStartLoadWithRequest={() => {
          if (hasLoadedRef.current) return false;
          hasLoadedRef.current = true;
          return true;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

export default RichContentWebView;
