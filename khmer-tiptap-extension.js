/**
 * TipTap Extension for Khmer Text Breaking
 * 
 * This extension provides proper word and line breaking for Khmer text in TipTap editor.
 * It uses a dictionary-based approach to identify word boundaries and insert break
 * opportunities for proper text wrapping.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { KhmerBreaker } from './khmer-breaker.js';

export const KhmerTextBreakExtension = Extension.create({
  name: 'khmerTextBreak',

  addOptions() {
    return {
      // Dictionary data: array of {word, frequency} objects
      dictionaryData: null,
      
      // Enable automatic break insertion
      autoInsertBreaks: true,
      
      // Enable visual break indicators (for debugging)
      showBreakIndicators: false,
      
      // Apply CSS word-break properties
      applyWordBreakCSS: true,
      
      // Debounce delay for break recalculation (ms)
      debounceDelay: 300,
      
      // CSS class for Khmer text blocks
      khmerBlockClass: 'khmer-text',
    };
  },

  addStorage() {
    return {
      breaker: null,
      breakCache: new Map(),
    };
  },

  onCreate() {
    // Initialize the Khmer breaker
    this.storage.breaker = new KhmerBreaker(this.options.dictionaryData);
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote', 'listItem'],
        attributes: {
          khmerText: {
            default: false,
            parseHTML: element => element.hasAttribute('data-khmer-text'),
            renderHTML: attributes => {
              if (!attributes.khmerText) {
                return {};
              }
              return {
                'data-khmer-text': '',
                class: this.options.khmerBlockClass,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Enable Khmer text breaking for current selection/block
       */
      enableKhmerBreaking: () => ({ commands }) => {
        return commands.updateAttributes('paragraph', { khmerText: true });
      },

      /**
       * Disable Khmer text breaking
       */
      disableKhmerBreaking: () => ({ commands }) => {
        return commands.updateAttributes('paragraph', { khmerText: false });
      },

      /**
       * Insert break opportunities in selected text
       */
      insertKhmerBreaks: () => ({ state, dispatch }) => {
        const { from, to } = state.selection;
        const text = state.doc.textBetween(from, to);
        
        if (!this.storage.breaker) return false;
        
        const processedText = this.storage.breaker.insertBreakOpportunities(text);
        
        if (dispatch) {
          const tr = state.tr.insertText(processedText, from, to);
          dispatch(tr);
        }
        
        return true;
      },

      /**
       * Load dictionary data
       */
      loadKhmerDictionary: (data) => () => {
        if (this.storage.breaker) {
          this.storage.breaker.loadDictionary(data);
        }
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      // Plugin for handling Khmer text
      new Plugin({
        key: new PluginKey('khmerTextBreak'),
        
        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
              debounceTimer: null,
            };
          },
          
          apply(tr, value, oldState, newState) {
            // Clear debounce timer on transaction
            if (value.debounceTimer) {
              clearTimeout(value.debounceTimer);
            }

            // Only recalculate if document changed
            if (!tr.docChanged) {
              return value;
            }

            // Debounce decoration updates
            const debounceTimer = setTimeout(() => {
              const decorations = extension.createDecorations(newState);
              // Force editor update with new decorations
              const view = extension.editor?.view;
              if (view) {
                view.dispatch(view.state.tr.setMeta('khmerDecorations', decorations));
              }
            }, extension.options.debounceDelay);

            return {
              ...value,
              debounceTimer,
            };
          },
        },

        props: {
          decorations(state) {
            const meta = state.tr.getMeta('khmerDecorations');
            if (meta) return meta;
            
            return this.getState(state).decorations;
          },

          // Handle input to detect Khmer text
          handleTextInput(view, from, to, text) {
            if (!extension.storage.breaker) return false;
            
            // Check if input contains Khmer characters
            const hasKhmer = /[\u1780-\u17FF]/.test(text);
            
            if (hasKhmer && extension.options.autoInsertBreaks) {
              // Process the text to add break opportunities
              const processed = extension.storage.breaker.insertBreakOpportunities(text);
              
              if (processed !== text) {
                const tr = view.state.tr.insertText(processed, from, to);
                view.dispatch(tr);
                return true;
              }
            }
            
            return false;
          },
        },
      }),
    ];
  },

  /**
   * Create decorations for Khmer text (for visual indicators)
   */
  createDecorations(state) {
    if (!this.options.showBreakIndicators) {
      return DecorationSet.empty;
    }

    const decorations = [];
    const { doc } = state;

    doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;

      const text = node.text;
      const hasKhmer = /[\u1780-\u17FF]/.test(text);

      if (hasKhmer && this.storage.breaker) {
        const breaks = this.storage.breaker.findLineBreaks(text);

        for (const breakPos of breaks) {
          decorations.push(
            Decoration.widget(
              pos + breakPos,
              () => {
                const span = document.createElement('span');
                span.className = 'khmer-break-indicator';
                span.textContent = '|';
                return span;
              },
              { side: 0 }
            )
          );
        }
      }
    });

    return DecorationSet.create(doc, decorations);
  },

  addPasteRules() {
    return [
      {
        find: /[\u1780-\u17FF]+/g,
        handler: ({ state, range, match }) => {
          if (!this.storage.breaker || !this.options.autoInsertBreaks) {
            return;
          }

          const text = match[0];
          const processed = this.storage.breaker.insertBreakOpportunities(text);

          if (processed !== text) {
            const { tr } = state;
            tr.insertText(processed, range.from, range.to);
            return tr;
          }
        },
      },
    ];
  },
});

/**
 * Helper function to create extension with custom dictionary
 */
export function createKhmerTextBreakExtension(dictionaryData) {
  return KhmerTextBreakExtension.configure({
    dictionaryData,
  });
}

/**
 * Helper function to load dictionary from URL
 */
export async function loadKhmerDictionaryFromURL(url) {
  const response = await fetch(url);
  const text = await response.text();
  
  const breaker = new KhmerBreaker();
  breaker.loadDictionaryFromText(text);
  
  return breaker;
}

/**
 * CSS styles for Khmer text breaking
 */
export const khmerTextBreakStyles = `
  /* Khmer text block styles */
  .khmer-text {
    word-break: normal;
    overflow-wrap: break-word;
    line-break: strict;
    word-spacing: 0;
  }

  /* Allow breaks at zero-width spaces */
  .khmer-text {
    white-space: pre-wrap;
  }

  /* Break indicator styles (for debugging) */
  .khmer-break-indicator {
    color: rgba(255, 0, 0, 0.3);
    font-size: 0.8em;
    pointer-events: none;
    user-select: none;
  }

  /* Prevent breaking in the middle of Khmer clusters */
  [data-khmer-text] {
    -webkit-hyphens: none;
    -moz-hyphens: none;
    hyphens: none;
  }
`;

export default KhmerTextBreakExtension;
