import { colors } from '@/lib/theme/colors';

export function ContractContentEditorStyles() {
  return (
    <style jsx global>{`
      .contract-rich-editor h1,
      .contract-rich-editor h2,
      .contract-rich-editor h3,
      .contract-rich-editor h4,
      .contract-rich-editor h5,
      .contract-rich-editor h6 {
        font-weight: 700;
        line-height: 1.25;
      }
      .contract-rich-editor h1,
      .contract-rich-editor h1 * {
        font-size: 1.55rem !important;
      }
      .contract-rich-editor h1 {
        margin: 0 0 1rem;
      }
      .contract-rich-editor h2,
      .contract-rich-editor h2 * {
        font-size: 1.35rem !important;
      }
      .contract-rich-editor h2 {
        margin: 0 0 0.9rem;
      }
      .contract-rich-editor h3,
      .contract-rich-editor h3 * {
        font-size: 1.18rem !important;
      }
      .contract-rich-editor h3 {
        margin: 1.15rem 0 0.65rem;
      }
      .contract-rich-editor h4,
      .contract-rich-editor h4 * {
        font-size: 1.05rem !important;
      }
      .contract-rich-editor h4 {
        margin: 1rem 0 0.55rem;
      }
      .contract-rich-editor h5,
      .contract-rich-editor h5 * {
        font-size: 0.95rem !important;
      }
      .contract-rich-editor h5 {
        margin: 0.9rem 0 0.5rem;
      }
      .contract-rich-editor h6,
      .contract-rich-editor h6 * {
        font-size: 0.88rem !important;
      }
      .contract-rich-editor h6 {
        margin: 0.8rem 0 0.45rem;
      }
      .contract-rich-editor p {
        margin: 0 0 0.75rem;
      }
      .contract-rich-editor ul,
      .contract-rich-editor ol {
        margin: 0.8rem 0;
        padding-left: 1.5rem;
      }
      .contract-rich-editor ul {
        list-style-type: disc;
      }
      .contract-rich-editor ol {
        list-style-type: decimal;
      }
      .contract-rich-editor li {
        margin-bottom: 0.35rem;
      }

      .contract-rich-editor blockquote {
        border-left: 3px solid ${colors.primary.main};
        margin: 1rem 0;
        padding: 0.65rem 0 0.65rem 1rem;
      }

      .contract-rich-editor table {
        border-collapse: collapse;
        margin: 1rem 0;
        width: 100%;
      }

      .contract-rich-editor th,
      .contract-rich-editor td {
        border: 1px solid rgb(229 231 235);
        padding: 0.55rem;
        vertical-align: top;
      }

      .dark .contract-rich-editor th,
      .dark .contract-rich-editor td {
        border-color: rgb(51 65 85);
      }

      .contract-rich-editor .contract-checkbox {
        display: inline-block;
        font-weight: 700;
        min-width: 1.25em;
      }

      .contract-rich-editor hr {
        border: none;
        border-top: 1px solid rgb(229 231 235);
        margin: 1.25rem 0;
      }

      .dark .contract-rich-editor hr {
        border-top-color: rgb(51 65 85);
      }

      .contract-rich-editor:empty::before {
        content: attr(data-placeholder);
        color: rgb(107 114 128);
        pointer-events: none;
      }

      .contract-rich-editor img {
        max-width: 100%;
        height: auto;
        margin: 0.5rem 0;
        display: block;
        cursor: pointer;
        border-radius: 4px;
      }

      .contract-rich-editor img.contract-img-selected {
        outline: 2px solid ${colors.primary.main};
        outline-offset: 2px;
      }
    `}</style>
  );
}