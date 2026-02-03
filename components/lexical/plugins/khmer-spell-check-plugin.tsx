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
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSpellCheck } from '../contexts/spell-check-context';
import { generateRequestId } from '@/lib/spell-check-types';
import { $isKhmerBreakNode } from '../nodes/khmer-break-node';
import { useSpellCheckCustomWords } from '@/hooks/use-spell-check-custom-words';
import { measurePerformance, isPerfDebugEnabled, isDebugEnabled } from '@/lib/debug';

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

// Clean a word by removing invisible characters, punctuation, and trimming.
// IMPORTANT: This must handle all punctuation that might be attached to words,
// including guillemets («»), smart quotes, and other typographic characters.
// Without this, words like «អោយ or អស់»។ would fail dictionary lookups.
// NOTE: ៗ (U+17D7) is removed here for dictionary lookup, but preserved during replacement via extractPunctuation.
function cleanKhmerWord(text: string): string {
    return text
        // Remove zero-width characters
        .replace(/[\u200B\u200C\u200D\u2060]/g, '')
        // Remove Khmer punctuation (។ ៕ ៖ ៗ ៘ ៙ ៚)
        .replace(/[\u17D4-\u17DA]/g, '')
        // Remove common punctuation (explicit Unicode for quotes to ensure proper matching)
        .replace(/[.,!?;:\u0027\u0022()\[\]{}]/g, '')
        // Remove all quote variants: guillemets, curly quotes, angle quotes, primes, backticks
        // U+00AB-00BB: « »
        // U+2018-201F: ' ' ‚ ‛ " " „ ‟
        // U+2039-203A: ‹ ›
        // U+2032-2033: ′ ″ (prime marks)
        // U+0060: ` (backtick)
        // U+00B4: ´ (acute accent sometimes used as quote)
        .replace(/[\u00AB\u00BB\u2018-\u201F\u2039\u203A\u2032\u2033\u0060\u00B4]/g, '')
        // Remove en-dash, em-dash, ellipsis
        .replace(/[\u2013\u2014\u2026]/g, '')
        // Trim whitespace
        .trim();
}

// Pattern for punctuation that can be attached to words (used in extractPunctuation)
// This includes ៗ (U+17D7) so it's preserved when replacing a word with a suggestion
// Must match the same characters as cleanKhmerWord strips
const PUNCTUATION_PATTERN = /[\u200B\u200C\u200D\u2060\u17D4-\u17DA.,!?;:\u0027\u0022()\[\]{}\u00AB\u00BB\u2018-\u201F\u2039\u203A\u2032\u2033\u0060\u00B4\u2013\u2014\u2026]/;

/**
 * Clear the spell check cache in the worker.
 * Call when user adds/ignores words to ensure re-checking.
 */
export function clearSpellCheckCache(): void {
    // The worker handles its own caching now
    // This function is kept for API compatibility
    if (typeof window !== 'undefined' && localStorage.getItem('aksara-debug-enabled') === 'true') {
        console.log('[SpellCheck] Cache clear requested');
    }
}

// Track previous span contents for incremental spell checking
// Using WeakMap so removed spans are automatically garbage collected
const previousSpanContents = new WeakMap<Element, string>();
// Track all spans we've seen to detect removed ones
let previousSpanSet = new Set<Element>();

/**
 * Clear span tracking. Call when forcing a full rescan.
 */
export function clearSpanTracking(): void {
    previousSpanSet = new Set<Element>();
    // WeakMap entries for removed elements will be garbage collected automatically
}

// Extract leading and trailing punctuation from a word.
// Returns { leading, core, trailing } where core is the actual word.
// This is used to preserve punctuation when replacing a word.
function extractPunctuation(text: string): { leading: string; core: string; trailing: string } {
    let leading = '';
    let trailing = '';
    let start = 0;
    let end = text.length;
    
    // Extract leading punctuation
    while (start < text.length && PUNCTUATION_PATTERN.test(text[start])) {
        leading += text[start];
        start++;
    }
    
    // Extract trailing punctuation
    while (end > start && PUNCTUATION_PATTERN.test(text[end - 1])) {
        trailing = text[end - 1] + trailing;
        end--;
    }
    
    return {
        leading,
        core: text.slice(start, end),
        trailing
    };
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
        setRequestSuggestionsHandler,
    } = useSpellCheck();

    // Fetch custom words (added and ignored)
    const { addedWordStrings, ignoredWordStrings, refresh: refreshCustomWords } = useSpellCheckCustomWords();

    // Pending batch check request tracking
    const pendingBatchCheckRef = useRef<{
        requestId: string;
        wordSpanMap: Map<string, Element[]>;
    } | null>(null);

    // Convert to Sets for fast lookup
    const addedWordsSet = useMemo(() => new Set(addedWordStrings), [addedWordStrings]);
    const ignoredWordsSet = useMemo(() => new Set(ignoredWordStrings), [ignoredWordStrings]);
    
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

    // Initialize Web Worker for spell checking (both correctness and suggestions)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        try {
            // Use module worker to support ES imports in spell-check-worker.js
            const worker = new Worker('/workers/spell-check-worker.js', { type: 'module' });
            
            worker.onmessage = (e) => {
                const { type, word, suggestions, elapsed, error, requestId, results, wordCount } = e.data;

                if (type === 'ready') {
                    setWorkerReady(true);
                    setIsLoading(false);
                    if (debugMode) {
                        console.log(`[SpellCheck] Worker ready with ${wordCount?.toLocaleString()} words`);
                    }
                }

                if (type === 'error') {
                    console.error('[SpellCheck] Worker error:', error);
                    setError(error || 'Spell check error');
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

                if (type === 'batchCheckResult') {
                    // Handle batch check results
                    const pending = pendingBatchCheckRef.current;
                    if (pending && pending.requestId === requestId) {
                        const wordSpanMap = pending.wordSpanMap;

                        if (debugMode) {
                            const checkedCount = Object.keys(results || {}).length;
                            console.log(`[SpellCheck] Batch check complete: ${checkedCount} words in ${elapsed?.toFixed(1)}ms`);
                        }

                        // Apply results to spans
                        for (const [checkedWord, spans] of wordSpanMap) {
                            const isCorrect = results?.[checkedWord] ?? true;
                            for (const span of spans) {
                                if (isCorrect) {
                                    span.classList.remove(MISSPELLED_CLASS);
                                } else {
                                    span.classList.add(MISSPELLED_CLASS);
                                }
                            }
                        }

                        pendingBatchCheckRef.current = null;
                    }
                }
            };
            
            worker.onerror = (err: ErrorEvent) => {
                // Always log worker errors as they indicate real problems
                console.error('[SpellCheck] Worker error:', {
                    message: err.message,
                    filename: err.filename,
                    lineno: err.lineno,
                    colno: err.colno,
                    error: err.error
                });
            };

            // Initialize the worker's dictionary with debug flag
            worker.postMessage({ type: 'init', debug: debugMode });
            workerRef.current = worker;
            
            return () => {
                worker.terminate();
                workerRef.current = null;
            };
        } catch (err) {
            // Always log critical errors
            console.error('[SpellCheck] Failed to create worker:', err);
        }
    }, [debugMode, setSuggestions, setSuggestionsLoaded]);

    // Update worker's debug mode when it changes
    useEffect(() => {
        if (workerRef.current && workerReady) {
            workerRef.current.postMessage({ type: 'setDebug', debug: debugMode });
        }
    }, [debugMode, workerReady]);

    // Register the suggestion request handler for the context menu to use
    useEffect(() => {
        const handler = (word: string) => {
            if (!workerRef.current || !workerReady) {
                console.log('[SpellCheck] Worker not ready for suggestion request');
                return;
            }

            // Clear previous suggestions and mark as loading
            setSuggestions([]);
            setSuggestionsLoaded(false);

            // Request suggestions from worker
            pendingRequestRef.current = word;
            if (debugMode) {
                console.log('[SpellCheck] Context menu requesting suggestions for:', word);
            }
            workerRef.current.postMessage({
                type: 'suggest',
                word: word,
                requestId: word
            });
        };

        setRequestSuggestionsHandler(() => handler);
    }, [workerReady, debugMode, setSuggestions, setSuggestionsLoaded, setRequestSuggestionsHandler]);

    /**
     * Scan text spans in the DOM and mark misspelled words using batch checking.
     * Collects all words needing checks, filters custom words, sends to worker.
     */
    const scanAndMarkMisspellings = useCallback(() => {
        if (!workerReady || !workerRef.current) return;

        const rootEl = editor.getRootElement();
        if (!rootEl) return;

        // Find all text spans in the editor
        const spans = rootEl.querySelectorAll('span[data-lexical-text="true"]');

        // If spell check is disabled, remove all misspelled markers and return
        if (!spellCheckEnabled) {
            spans.forEach(span => {
                span.classList.remove(MISSPELLED_CLASS);
            });
            previousSpanSet = new Set<Element>();
            return;
        }

        // Build word -> spans mapping for batch checking
        const wordSpanMap = new Map<string, Element[]>();
        const currentSpanSet = new Set<Element>();
        let changedCount = 0;
        let unchangedCount = 0;
        let skippedCount = 0;

        measurePerformance(`spellCheck:collect(${spans.length} spans)`, () => {
            spans.forEach((span) => {
                currentSpanSet.add(span);
                const currentContent = span.textContent || '';
                const previousContent = previousSpanContents.get(span);

                // Check if span is unchanged - keep existing spell check marks
                if (previousContent === currentContent) {
                    unchangedCount++;
                    return;
                }

                // Span is new or changed - update tracking
                changedCount++;
                previousSpanContents.set(span, currentContent);

                // Skip whitespace-only spans
                if (!currentContent || /^\s+$/.test(currentContent)) {
                    span.classList.remove(MISSPELLED_CLASS);
                    return;
                }

                // Skip spans with multiple words (can't mark individual words)
                const words = currentContent.split(/\s+/).filter(w => w.length > 0);
                if (words.length > 1) {
                    span.classList.remove(MISSPELLED_CLASS);
                    return;
                }

                // Clean the word for checking
                const cleanWord = cleanKhmerWord(currentContent);
                if (!cleanWord) {
                    span.classList.remove(MISSPELLED_CLASS);
                    return;
                }

                // Skip non-Khmer text
                if (!containsKhmer(cleanWord)) {
                    span.classList.remove(MISSPELLED_CLASS);
                    return;
                }

                // Check if word is in user's added words (should be considered correct)
                if (addedWordsSet.has(cleanWord)) {
                    span.classList.remove(MISSPELLED_CLASS);
                    skippedCount++;
                    return;
                }

                // Check if word is in user's ignored words (skip spell check)
                if (ignoredWordsSet.has(cleanWord)) {
                    span.classList.remove(MISSPELLED_CLASS);
                    skippedCount++;
                    return;
                }

                // Add to word -> spans mapping for batch checking
                if (!wordSpanMap.has(cleanWord)) {
                    wordSpanMap.set(cleanWord, []);
                }
                wordSpanMap.get(cleanWord)!.push(span);
            });

            previousSpanSet = currentSpanSet;
        });

        // If no words need checking, we're done
        if (wordSpanMap.size === 0) {
            if (debugMode) {
                console.log(`[SpellCheck] No words to check (${changedCount} changed, ${unchangedCount} unchanged, ${skippedCount} skipped)`);
            }
            return;
        }

        // Send batch check request to worker
        const requestId = generateRequestId();
        const wordsToCheck = Array.from(wordSpanMap.keys());

        pendingBatchCheckRef.current = { requestId, wordSpanMap };

        if (debugMode) {
            console.log(`[SpellCheck] Sending batch check: ${wordsToCheck.length} unique words from ${changedCount} changed spans`);
        }

        workerRef.current.postMessage({
            type: 'batchCheck',
            words: wordsToCheck,
            requestId
        });
    }, [editor, workerReady, MISSPELLED_CLASS, debugMode, spellCheckEnabled, addedWordsSet, ignoredWordsSet]);

    // Register update listener to scan for misspellings on content change
    useEffect(() => {
        if (!workerReady) return;

        const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, workerReady, spellCheckEnabled]);

    // Immediately trigger scan when spellCheckEnabled changes (e.g., to clear markers when disabled)
    useEffect(() => {
        scanAndMarkMisspellings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spellCheckEnabled]);

    // Trigger scan when custom words change (added or ignored)
    useEffect(() => {
        if (!workerReady) return;
        if (isDebugEnabled()) {
            console.log('[SpellCheck] Custom words changed, rescanning document');
        }
        scanAndMarkMisspellings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addedWordsSet, ignoredWordsSet, workerReady]);

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

            if (!workerReady) {
                if (debugMode) {
                    console.log('[SpellCheck] Worker not ready, clearing suggestions');
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

            // Check if word is in user's added words (should be considered correct)
            if (addedWordsSet.has(cleanWord)) {
                setSelectedWord(null);
                setSuggestions([]);
                setReplaceHandler(() => () => { });
                lastWordRef.current = null;
                lastDetected.current = null;
                return;
            }

            // Check if word is in user's ignored words (skip spell check)
            if (ignoredWordsSet.has(cleanWord)) {
                setSelectedWord(null);
                setSuggestions([]);
                setReplaceHandler(() => () => { });
                lastWordRef.current = null;
                lastDetected.current = null;
                return;
            }

            // Check if the DOM element has the misspelled class (already determined by batch check)
            const rootEl = editor.getRootElement();
            let isCorrect = true;
            if (rootEl) {
                // Find the span for this node and check if it has the misspelled class
                const spans = rootEl.querySelectorAll(`span[data-lexical-text="true"]`);
                for (const span of spans) {
                    const spanText = cleanKhmerWord(span.textContent || '');
                    if (spanText === cleanWord && span.classList.contains(MISSPELLED_CLASS)) {
                        isCorrect = false;
                        break;
                    }
                }
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
                                    // Preserve leading/trailing punctuation when replacing
                                    const { leading, trailing } = extractPunctuation(currentText);
                                    maybeNode.setTextContent(leading + newWord + trailing);
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
                // SymSpell is much faster than Hunspell - suggestions typically complete in < 50ms
                setSuggestions([]); // Clear while loading
                setSuggestionsLoaded(false); // Mark as loading

                // Request suggestions from worker
                pendingRequestRef.current = cleanWord;
                if (debugMode) {
                    console.log('[SpellCheck] Requesting suggestions from worker for:', cleanWord);
                }
                workerRef.current!.postMessage({
                    type: 'suggest',
                    word: cleanWord,
                    requestId: cleanWord
                });
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
        [editor, MISSPELLED_CLASS, setReplaceHandler, setSelectedWord, setSuggestions, setSuggestionsLoaded, debugMode, workerReady, addedWordsSet, ignoredWordsSet]
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
        if (!workerReady) return;
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
    }, [editor, workerReady, handleSelectionChange]);

    // pointerdown + contextmenu handling
    useEffect(() => {
        if (!workerReady) return;
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
    }, [editor, workerReady, handleSelectionChange, debugMode]);

    return null;
}
