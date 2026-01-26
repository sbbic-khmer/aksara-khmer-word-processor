// Source - https://stackoverflow.com/a
// Posted by Alex
// Retrieved 2026-01-26, License - CC BY-SA 4.0
// Modified for Khmer language support - checks words after they are segmented by KhmerWordBreakPlugin

'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    $getNodeByKey,
    COMMAND_PRIORITY_LOW,
    SELECTION_CHANGE_COMMAND,
    type TextNode,
} from 'lexical';
import { useEffect, useState, useRef, useCallback } from 'react';
import Typo from 'typo-js';
import { useSpellCheck } from '../contexts/spell-check-context';
import { $isKhmerBreakNode } from '../nodes/khmer-break-node';

/**
 * Cross-browser caret range from point helper
 */
function getDOMRangeFromPoint(x: number, y: number): Range | null {
    // Modern browsers have document.caretRangeFromPoint in WebKit/Chrome
    if ((document as any).caretRangeFromPoint) {
        return (document as any).caretRangeFromPoint(x, y);
    }

    // Firefox: caretPositionFromPoint
    // returns { offsetNode, offset }
    if ((document as any).caretPositionFromPoint) {
        const pos = (document as any).caretPositionFromPoint(x, y);
        if (pos && pos.offsetNode) {
            const r = document.createRange();
            r.setStart(pos.offsetNode, pos.offset);
            r.setEnd(pos.offsetNode, pos.offset);
            return r;
        }
    }

    // As a last resort, use rangeFromPoint (some browsers support it)
    if ((document as any).rangeFromPoint) {
        return (document as any).rangeFromPoint(x, y);
    }

    return null;
}

// Check if a character is Khmer
function isKhmerChar(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 0x1780 && code <= 0x17FF;
}

// Check if text contains Khmer characters
function containsKhmer(text: string): boolean {
    return [...text].some(isKhmerChar);
}

export function KhmerSpellCheckPlugin() {
    const [editor] = useLexicalComposerContext();
    const { setSelectedWord, setSuggestions, setReplaceHandler, setIsLoading, setError } = useSpellCheck();

    const [typo, setTypo] = useState<Typo | null>(null);

    // last detected word info for debugging/fallback
    const lastDetected = useRef<{ nodeKey: string; start: number; end: number } | null>(null);
    const lastWordRef = useRef<string | null>(null);

    // debounce timer ref
    const debounceRef = useRef<number | null>(null);
    const DEBOUNCE_MS = 100;

    // Load Khmer dictionary from /public/dictionaries
    useEffect(() => {
        let mounted = true;
        async function loadDictionary() {
            try {
                setIsLoading(true);
                setError(null);
                
                const [aff, dic] = await Promise.all([
                    fetch('/dictionaries/km_KH.aff').then((r) => {
                        if (!r.ok) throw new Error(`Failed to load km_KH.aff: ${r.status}`);
                        return r.text();
                    }),
                    fetch('/dictionaries/km_KH.dic').then((r) => {
                        if (!r.ok) throw new Error(`Failed to load km_KH.dic: ${r.status}`);
                        return r.text();
                    }),
                ]);
                
                if (!mounted) return;
                
                const typoInstance = new Typo('km_KH', aff, dic);
                setTypo(typoInstance);
                setIsLoading(false);
                console.log('[v0] Khmer spell check dictionary loaded successfully');
            } catch (err) {
                console.warn('[v0] Failed to load Khmer dictionary:', err);
                if (mounted) {
                    setIsLoading(false);
                    setError(err instanceof Error ? err.message : 'Failed to load dictionary');
                }
            }
        }
        loadDictionary();
        return () => {
            mounted = false;
        };
    }, [setIsLoading, setError]);

    /**
     * For Khmer text, each TextNode after word-breaking represents a word segment.
     * We don't need regex-based word detection - the TextNode IS the word.
     * For non-Khmer text, we fall back to word boundary detection.
     */
    const detectWordAtCursor = useCallback((node: TextNode, offset: number): { word: string; start: number; end: number } | null => {
        const text = node.getTextContent();
        
        if (!text || text.length === 0) return null;
        
        // For Khmer text, the entire TextNode is considered one word
        // (since KhmerWordBreakPlugin already segments words into separate TextNodes)
        if (containsKhmer(text)) {
            // Skip whitespace-only nodes
            if (/^\s+$/.test(text)) return null;
            
            // The entire node content is the word
            return { word: text.trim(), start: 0, end: text.length };
        }
        
        // For non-Khmer (e.g., English), use traditional word boundary detection
        const wordRegex = /\b[\w]+\b/g;
        let match: RegExpExecArray | null = null;
        while ((match = wordRegex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            if (offset >= start && offset < end) {
                return { word: match[0], start, end };
            }
        }
        
        return null;
    }, []);

    // small helper that updates suggestions for a specific lexical text node
    const updateSuggestionsForNode = useCallback(
        (node: TextNode, start: number, end: number, word: string) => {
            lastDetected.current = { nodeKey: node.getKey(), start, end };

            if (!typo) {
                setSelectedWord(null);
                setSuggestions([]);
                setReplaceHandler(() => () => { });
                lastWordRef.current = null;
                return;
            }

            // Clean the word (remove any ZWSP or other invisible chars)
            const cleanWord = word.replace(/[\u200B\u200C\u200D\u2060]/g, '').trim();
            
            if (!cleanWord) {
                setSelectedWord(null);
                setSuggestions([]);
                setReplaceHandler(() => () => { });
                lastWordRef.current = null;
                return;
            }

            if (!typo.check(cleanWord)) {
                const suggs = typo.suggest(cleanWord) || [];
                setSelectedWord(cleanWord);
                setSuggestions(suggs.slice(0, 5)); // Limit to 5 suggestions

                // set replace handler
                setReplaceHandler(() => {
                    const nodeKey = node.getKey();

                    return (oldWord: string, newWord: string) => {
                        try {
                            editor.update(() => {
                                const maybeNode = $getNodeByKey(nodeKey);
                                if (!$isTextNode(maybeNode)) return;

                                // For Khmer, we replace the entire node content
                                // since each TextNode is a word segment
                                const currentText = maybeNode.getTextContent();
                                
                                if (containsKhmer(currentText)) {
                                    // Replace the entire text content
                                    maybeNode.setTextContent(newWord);
                                } else {
                                    // For non-Khmer, do targeted replacement
                                    const newText = currentText.slice(0, start) + newWord + currentText.slice(end);
                                    maybeNode.setTextContent(newText);
                                }
                            });
                        } catch (err) {
                            console.error('[v0] Error performing spell replace:', err);
                        }
                    };
                });
            } else {
                // word is correct -> clear suggestions
                setSelectedWord(null);
                setSuggestions([]);
                setReplaceHandler(() => () => { });
                lastWordRef.current = null;
                lastDetected.current = null;
            }
        },
        [editor, typo, setReplaceHandler, setSelectedWord, setSuggestions]
    );

    // Called when selection changes (debounced)
    const handleSelectionChange = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                if (lastWordRef.current !== null) {
                    setSelectedWord(null);
                    setSuggestions([]);
                    setReplaceHandler(() => () => { });
                    lastWordRef.current = null;
                    lastDetected.current = null;
                }
                return;
            }

            const anchor = selection.anchor;
            const node = anchor.getNode();

            // Skip KhmerBreakNodes
            if ($isKhmerBreakNode(node)) {
                if (lastWordRef.current !== null) {
                    setSelectedWord(null);
                    setSuggestions([]);
                    setReplaceHandler(() => () => { });
                    lastWordRef.current = null;
                    lastDetected.current = null;
                }
                return;
            }

            if (!$isTextNode(node)) {
                if (lastWordRef.current !== null) {
                    setSelectedWord(null);
                    setSuggestions([]);
                    setReplaceHandler(() => () => { });
                    lastWordRef.current = null;
                    lastDetected.current = null;
                }
                return;
            }

            const offset = anchor.offset;
            const found = detectWordAtCursor(node, offset);

            if (!found) {
                if (lastWordRef.current !== null) {
                    setSelectedWord(null);
                    setSuggestions([]);
                    setReplaceHandler(() => () => { });
                    lastWordRef.current = null;
                    lastDetected.current = null;
                }
                return;
            }

            const { word, start, end } = found;

            // If the word hasn't changed, skip heavy suggestion generation
            if (word === lastWordRef.current) {
                return;
            }
            lastWordRef.current = word;

            updateSuggestionsForNode(node, start, end, word);
        });
    }, [editor, detectWordAtCursor, updateSuggestionsForNode, setReplaceHandler, setSelectedWord, setSuggestions]);

    // register Lexical selection change with debounce
    useEffect(() => {
        if (!typo) return;
        const unregister = editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                if (debounceRef.current) {
                    window.clearTimeout(debounceRef.current);
                }
                debounceRef.current = window.setTimeout(() => {
                    handleSelectionChange();
                }, DEBOUNCE_MS);

                return false; // don't swallow
            },
            COMMAND_PRIORITY_LOW
        );

        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
            unregister();
        };
    }, [editor, typo, handleSelectionChange]);

    // pointerdown + contextmenu handling
    useEffect(() => {
        if (!typo) return;
        const root = editor.getRootElement();
        if (!root) return;

        const handlePointerDown = (ev: PointerEvent) => {
            // only care about right-clicks (button === 2)
            if (ev.button !== 2) return;

            const r = getDOMRangeFromPoint(ev.clientX, ev.clientY);
            if (!r) return;
            const sel = window.getSelection();
            if (!sel) return;
            sel.removeAllRanges();
            sel.addRange(r);

            setTimeout(() => {
                if (debounceRef.current) window.clearTimeout(debounceRef.current);
                handleSelectionChange();
            }, 0);
        };

        const handleContextMenu = (ev: MouseEvent) => {
            const r = getDOMRangeFromPoint(ev.clientX, ev.clientY);
            if (r) {
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(r);
            }

            handleSelectionChange();
        };

        root.addEventListener('pointerdown', handlePointerDown, true);
        root.addEventListener('contextmenu', handleContextMenu);

        return () => {
            root.removeEventListener('pointerdown', handlePointerDown, true);
            root.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [editor, typo, handleSelectionChange]);

    return null;
}
