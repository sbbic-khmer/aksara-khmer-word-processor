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

// Check if a character is Khmer (letters only, not punctuation)
function isKhmerLetter(char: string): boolean {
    const code = char.charCodeAt(0);
    // Khmer letters: U+1780 to U+17DD (excluding punctuation U+17D4-U+17DA)
    // Khmer punctuation: ។ (U+17D4), ៖ (U+17D6), etc.
    return (code >= 0x1780 && code <= 0x17D3) || (code >= 0x17DB && code <= 0x17DD);
}

// Check if a character is Khmer punctuation
function isKhmerPunctuation(char: string): boolean {
    const code = char.charCodeAt(0);
    // Khmer punctuation range: U+17D4 to U+17DA
    // ។ (U+17D4), ៕ (U+17D5), ៖ (U+17D6), ៗ (U+17D7), ៘ (U+17D8), ៙ (U+17D9), ៚ (U+17DA)
    return code >= 0x17D4 && code <= 0x17DA;
}

// Check if text contains Khmer characters (letters)
function containsKhmer(text: string): boolean {
    return [...text].some(isKhmerLetter);
}

// Clean a word by removing invisible characters, punctuation, and trimming
function cleanKhmerWord(text: string): string {
    return text
        // Remove zero-width characters
        .replace(/[\u200B\u200C\u200D\u2060]/g, '')
        // Remove Khmer punctuation
        .replace(/[\u17D4-\u17DA]/g, '')
        // Remove common punctuation
        .replace(/[.,!?;:'"()\[\]{}]/g, '')
        // Trim whitespace
        .trim();
}

export function KhmerSpellCheckPlugin() {
    const [editor] = useLexicalComposerContext();
    const { 
        setSelectedWord, 
        setSuggestions, 
        setReplaceHandler, 
        setIsLoading, 
        setError,
        debugMode,
        setSuggestionsLoaded,
        spellCheckEnabled,
    } = useSpellCheck();

    const [typo, setTypo] = useState<Typo | null>(null);
    
    // Web Worker for async suggestions (prevents UI freeze for complex words)
    const workerRef = useRef<Worker | null>(null);
    const [workerReady, setWorkerReady] = useState(false);
    const pendingRequestRef = useRef<string | null>(null);

    // last detected word info for debugging/fallback
    const lastDetected = useRef<{ nodeKey: string; start: number; end: number } | null>(null);
    const lastWordRef = useRef<string | null>(null);

    // debounce timer ref
    const debounceRef = useRef<number | null>(null);
    const scanDebounceRef = useRef<number | null>(null);
    const DEBOUNCE_MS = 100;
    const SCAN_DEBOUNCE_MS = 300;

    // CSS class name for misspelled words
    const MISSPELLED_CLASS = 'spellcheck-misspelled';

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
                console.log('[SpellCheck] Dictionary loaded successfully');
            } catch (err) {
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

    // Initialize Web Worker for async suggestions
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        try {
            const worker = new Worker('/workers/spell-check-worker.js');
            
            worker.onmessage = (e) => {
                const { type, word, suggestions, elapsed, error } = e.data;
                
                if (type === 'ready') {
                    setWorkerReady(true);
                    if (debugMode) {
                        console.log('[SpellCheck] Worker ready');
                    }
                }
                
                if (type === 'suggestions') {
                    if (debugMode) {
                        console.log('[SpellCheck] Worker suggestions for', word, ':', suggestions?.length, 'in', elapsed?.toFixed(2), 'ms', error ? `(error: ${error})` : '');
                    }
                    
                    // Only update if this is still the pending request
                    if (pendingRequestRef.current === word) {
                        setSuggestions(suggestions || []);
                        setSuggestionsLoaded(true);
                        pendingRequestRef.current = null;
                    }
                }
            };
            
            worker.onerror = (err) => {
                console.error('[SpellCheck] Worker error:', err);
            };
            
            // Initialize the worker's dictionary
            worker.postMessage({ type: 'init' });
            workerRef.current = worker;
            
            return () => {
                worker.terminate();
                workerRef.current = null;
            };
        } catch (err) {
            console.error('[SpellCheck] Failed to create worker:', err);
        }
    }, [debugMode, setSuggestions, setSuggestionsLoaded]);

    /**
     * Scan all text spans in the DOM and mark misspelled words visually
     * This approach directly scans DOM elements rather than trying to map Lexical nodes
     */
const scanAndMarkMisspellings = useCallback(() => {
    if (!typo) return;
    
    const rootEl = editor.getRootElement();
    if (!rootEl) return;
    
    // Find all text spans in the editor
    const spans = rootEl.querySelectorAll('span[data-lexical-text="true"]');
    
    // If spell check is disabled, remove all misspelled markers and return
    if (!spellCheckEnabled) {
        spans.forEach(span => {
            span.classList.remove(MISSPELLED_CLASS);
        });
        return;
    }
        
        if (debugMode) {
            console.log('[SpellCheck] Scanning', spans.length, 'text spans');
        }
        
        spans.forEach((span) => {
            const text = span.textContent;
            if (!text || /^\s+$/.test(text)) {
                span.classList.remove(MISSPELLED_CLASS);
                return;
            }

            // Clean the word (remove invisible characters, punctuation, etc.)
            const cleanWord = cleanKhmerWord(text);
            if (!cleanWord) {
                span.classList.remove(MISSPELLED_CLASS);
                return;
            }

            let isMisspelled = false;

            // For Khmer text, we may have multiple words separated by spaces
            // Split by spaces and check each word
            if (containsKhmer(cleanWord)) {
                const words = cleanWord.split(/\s+/).filter(w => w.length > 0);
                for (const word of words) {
                    const cleanedWord = cleanKhmerWord(word);
                    if (cleanedWord && !typo.check(cleanedWord)) {
                        isMisspelled = true;
                        break;
                    }
                }
            } else {
                // For non-Khmer, check individual words
                const words = cleanWord.match(/\b[\w]+\b/g);
                if (words) {
                    for (const word of words) {
                        if (!typo.check(word)) {
                            isMisspelled = true;
                            break;
                        }
                    }
                }
            }

            if (isMisspelled) {
                span.classList.add(MISSPELLED_CLASS);
                if (debugMode) {
                    console.log('[SpellCheck] Misspelled word:', cleanWord);
                }
            } else {
                span.classList.remove(MISSPELLED_CLASS);
            }
        });
    }, [editor, typo, MISSPELLED_CLASS, debugMode]);

    // Register update listener to scan for misspellings on content change
    useEffect(() => {
        if (!typo) return;

        const unregister = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
            // Only scan if there are actual changes
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

            // Debounce the scan
            if (scanDebounceRef.current) {
                window.clearTimeout(scanDebounceRef.current);
            }
            scanDebounceRef.current = window.setTimeout(() => {
                scanAndMarkMisspellings();
            }, SCAN_DEBOUNCE_MS);
        });

        // Initial scan
        scanAndMarkMisspellings();

        return () => {
            if (scanDebounceRef.current) {
                window.clearTimeout(scanDebounceRef.current);
            }
            unregister();
        };
    }, [editor, typo, scanAndMarkMisspellings, SCAN_DEBOUNCE_MS, spellCheckEnabled]);

    /**
     * For Khmer text, each TextNode after word-breaking represents a word segment.
     * We don't need regex-based word detection - the TextNode IS the word.
     * For non-Khmer text, we fall back to word boundary detection.
     * Also handles spaces and punctuation properly.
     */
    const detectWordAtCursor = useCallback((node: TextNode, offset: number): { word: string; start: number; end: number } | null => {
        const text = node.getTextContent();
        
        if (debugMode) {
            console.log('[SpellCheck] detectWordAtCursor called with:', { 
                text: text?.substring(0, 50) + (text && text.length > 50 ? '...' : ''), 
                offset, 
                textLength: text?.length,
                containsKhmer: text ? containsKhmer(text) : false
            });
        }
        
        if (!text || text.length === 0) return null;
        
        // For Khmer text, the TextNode may contain one or more words
        // If there are spaces, find the word at the cursor position
        if (containsKhmer(text)) {
            // Skip whitespace-only nodes
            if (/^\s+$/.test(text)) return null;
            
            // If the text contains spaces, find the word at cursor
            if (/\s/.test(text)) {
                // Split into words while tracking positions
                let currentPos = 0;
                const words = text.split(/(\s+)/); // Keep delimiters to track positions
                
                for (const segment of words) {
                    const segmentEnd = currentPos + segment.length;
                    
                    // Skip whitespace segments
                    if (/^\s+$/.test(segment)) {
                        currentPos = segmentEnd;
                        continue;
                    }
                    
                    // Check if cursor is within this word
                    if (offset >= currentPos && offset <= segmentEnd) {
                        const cleanedWord = cleanKhmerWord(segment);
                        if (cleanedWord) {
                            return { word: cleanedWord, start: currentPos, end: segmentEnd };
                        }
                    }
                    currentPos = segmentEnd;
                }
                return null;
            }
            
            // No spaces - the entire node content is the word (clean it first)
            const cleanedWord = cleanKhmerWord(text);
            if (!cleanedWord) {
                if (debugMode) {
                    console.log('[SpellCheck] Word cleaned to empty, skipping');
                }
                return null;
            }
            if (debugMode) {
                console.log('[SpellCheck] Detected Khmer word (whole node):', cleanedWord);
            }
            return { word: cleanedWord, start: 0, end: text.length };
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
    }, [debugMode]);

    // small helper that updates suggestions for a specific lexical text node
    const updateSuggestionsForNode = useCallback(
        (node: TextNode, start: number, end: number, word: string) => {
            if (debugMode) {
                console.log('[SpellCheck] updateSuggestionsForNode called:', { word, start, end, nodeKey: node.getKey() });
            }
            
            lastDetected.current = { nodeKey: node.getKey(), start, end };

            if (!typo) {
                if (debugMode) {
                    console.log('[SpellCheck] No typo instance, clearing suggestions');
                }
                setSelectedWord(null);
                setSuggestions([]);
                setReplaceHandler(() => () => { });
                lastWordRef.current = null;
                return;
            }

            // Clean the word (remove invisible chars, punctuation, etc.)
            const cleanWord = cleanKhmerWord(word);
            if (debugMode) {
                console.log('[SpellCheck] Cleaned word:', cleanWord, 'from:', word);
            }
            
            if (!cleanWord) {
                setSelectedWord(null);
                setSuggestions([]);
                setReplaceHandler(() => () => { });
                lastWordRef.current = null;
                return;
            }

            const checkStart = debugMode ? performance.now() : 0;
            const isCorrect = typo.check(cleanWord);
            if (debugMode) {
                console.log('[SpellCheck] typo.check() took', (performance.now() - checkStart).toFixed(2), 'ms, result:', isCorrect);
            }
            
            if (!isCorrect) {
                // Set the selected word immediately so context menu can show
                setSelectedWord(cleanWord);
                
                // Set up replace handler immediately
                const nodeKey = node.getKey();
                setReplaceHandler(() => {
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
                        } catch {
                            // Error performing spell replace
                        }
                    };
                });

                // Use Web Worker for suggestions to prevent UI freeze
                // This is especially important for complex Khmer words where suggest() can take 10+ seconds
                setSuggestions([]); // Clear while loading
                setSuggestionsLoaded(false); // Mark as loading
                
                if (workerRef.current && workerReady) {
                    // Use worker for non-blocking suggestions
                    pendingRequestRef.current = cleanWord;
                    if (debugMode) {
                        console.log('[SpellCheck] Requesting suggestions from worker for:', cleanWord);
                    }
                    workerRef.current.postMessage({ 
                        type: 'suggest', 
                        word: cleanWord,
                        requestId: cleanWord 
                    });
                } else {
                    // Fallback: run synchronously (may freeze for complex words)
                    if (debugMode) {
                        console.log('[SpellCheck] Worker not ready, using sync suggest for:', cleanWord);
                    }
                    setTimeout(() => {
                        try {
                            const suggestStart = performance.now();
                            const suggs = typo.suggest(cleanWord) || [];
                            const elapsed = performance.now() - suggestStart;
                            
                            if (debugMode) {
                                console.log('[SpellCheck] Sync typo.suggest() took', elapsed.toFixed(2), 'ms, found', suggs.length, 'suggestions');
                            }
                            
                            if (lastWordRef.current === cleanWord) {
                                setSuggestions(suggs.slice(0, 5));
                                setSuggestionsLoaded(true);
                            }
                        } catch (err) {
                            if (debugMode) {
                                console.log('[SpellCheck] typo.suggest() error:', err);
                            }
                        }
                    }, 0);
                }
            } else {
                // word is correct -> clear suggestions
                if (debugMode) {
                    console.log('[SpellCheck] Word is correct, clearing suggestions');
                }
                setSelectedWord(null);
                setSuggestions([]);
                setReplaceHandler(() => () => { });
                lastWordRef.current = null;
                lastDetected.current = null;
            }
        },
        [editor, typo, setReplaceHandler, setSelectedWord, setSuggestions, setSuggestionsLoaded, debugMode, workerReady]
    );

    // Called when selection changes (debounced)
    const handleSelectionChange = useCallback(() => {
        if (debugMode) {
            console.log('[SpellCheck] handleSelectionChange called');
        }
        
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                if (debugMode) {
                    console.log('[SpellCheck] Not a range selection, clearing');
                }
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
                if (debugMode) {
                    console.log('[SpellCheck] Node is KhmerBreakNode, skipping');
                }
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
                if (debugMode) {
                    console.log('[SpellCheck] Node is not TextNode, skipping');
                }
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
                if (debugMode) {
                    console.log('[SpellCheck] No word found at cursor');
                }
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
                if (debugMode) {
                    console.log('[SpellCheck] Word unchanged, skipping suggestion update:', word);
                }
                return;
            }
            
            if (debugMode) {
                console.log('[SpellCheck] New word detected, updating suggestions:', word, 'previous:', lastWordRef.current);
            }
            lastWordRef.current = word;

            updateSuggestionsForNode(node, start, end, word);
        });
    }, [editor, detectWordAtCursor, updateSuggestionsForNode, setReplaceHandler, setSelectedWord, setSuggestions, debugMode]);

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

            if (debugMode) {
                console.log('[SpellCheck] Right-click pointerdown at:', ev.clientX, ev.clientY);
            }

            const r = getDOMRangeFromPoint(ev.clientX, ev.clientY);
            if (!r) {
                if (debugMode) {
                    console.log('[SpellCheck] Could not get DOM range from point');
                }
                return;
            }
            const sel = window.getSelection();
            if (!sel) {
                if (debugMode) {
                    console.log('[SpellCheck] Could not get window selection');
                }
                return;
            }
            sel.removeAllRanges();
            sel.addRange(r);

            if (debugMode) {
                console.log('[SpellCheck] Selection set, calling handleSelectionChange');
            }

            setTimeout(() => {
                if (debounceRef.current) window.clearTimeout(debounceRef.current);
                handleSelectionChange();
            }, 0);
        };

        const handleContextMenu = (ev: MouseEvent) => {
            if (debugMode) {
                console.log('[SpellCheck] Context menu event at:', ev.clientX, ev.clientY);
            }
            
            const r = getDOMRangeFromPoint(ev.clientX, ev.clientY);
            if (r) {
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(r);
                if (debugMode) {
                    console.log('[SpellCheck] Selection updated from contextmenu');
                }
            } else {
                if (debugMode) {
                    console.log('[SpellCheck] No DOM range from contextmenu point');
                }
            }

            handleSelectionChange();
        };

        root.addEventListener('pointerdown', handlePointerDown, true);
        root.addEventListener('contextmenu', handleContextMenu);

        return () => {
            root.removeEventListener('pointerdown', handlePointerDown, true);
            root.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [editor, typo, handleSelectionChange, debugMode]);

    return null;
}
