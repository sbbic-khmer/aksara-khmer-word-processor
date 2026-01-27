'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    $getNodeByKey,
    type TextNode,
} from 'lexical';
import { useEffect, useRef, useCallback } from 'react';
import { useGrammarCheck } from '../contexts/grammar-check-context';

// CSS class name for non-standard spelling (blue underline)
const GRAMMAR_CLASS = 'grammar-nonstandard';

// Check if text contains Khmer characters
function containsKhmer(text: string): boolean {
    return /[\u1780-\u17FF]/.test(text);
}

// Clean a word by removing invisible characters, punctuation, and trimming
function cleanKhmerWord(text: string): string {
    return text
        .replace(/[\u200B\u200C\u200D\u2060]/g, '') // zero-width chars
        .replace(/[\u17D4-\u17DA]/g, '') // Khmer punctuation
        .replace(/[.,!?;:'"()\[\]{}]/g, '') // common punctuation
        .trim();
}

/**
 * Parse the multiple spellings file format:
 * - Lines starting with # are comments
 * - Format: alternative1|alternative2|...=standardized
 * - Or: alternative=standardized (for two-word mappings)
 */
function parseSpellingRules(content: string): Map<string, { standard: string; alternatives: string[] }> {
    const rules = new Map<string, { standard: string; alternatives: string[] }>();
    
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // Parse the rule: alternatives=standard
        const [alternativesPart, standard] = trimmed.split('=');
        if (!alternativesPart || !standard) continue;
        
        const alternatives = alternativesPart.split('|').map(s => s.trim()).filter(Boolean);
        const standardized = standard.trim();
        
        // Map each alternative to the standardized spelling
        for (const alt of alternatives) {
            rules.set(alt, { standard: standardized, alternatives });
        }
    }
    
    return rules;
}

export function KhmerGrammarCheckPlugin() {
    const [editor] = useLexicalComposerContext();
    const {
        setSelectedWord,
        setStandardizedSpelling,
        setAlternativeSpellings,
        setReplaceHandler,
        setIsLoading,
        setError,
        spellingRules,
        setSpellingRules,
        grammarCheckEnabled,
        debugMode,
    } = useGrammarCheck();

    const scanDebounceRef = useRef<number | null>(null);
    const SCAN_DEBOUNCE_MS = 300;

    // Load the multiple spellings file
    useEffect(() => {
        let mounted = true;
        
        async function loadSpellingRules() {
            try {
                setIsLoading(true);
                setError(null);
                
                const response = await fetch('/dictionaries/khmer-multiple-spellings.txt');
                
                if (!response.ok) {
                    throw new Error(`Failed to load spelling rules: ${response.status}`);
                }
                
                const content = await response.text();
                
                if (!mounted) return;
                
                const rules = parseSpellingRules(content);
                setSpellingRules(rules);
                setIsLoading(false);
            } catch (err) {
                if (mounted) {
                    setIsLoading(false);
                    setError(err instanceof Error ? err.message : 'Failed to load spelling rules');
                }
            }
        }
        
        loadSpellingRules();
        
        return () => {
            mounted = false;
        };
    }, [setIsLoading, setError, setSpellingRules]);

    /**
     * Scan all text spans and mark words with non-standard spellings
     */
    const scanAndMarkNonStandard = useCallback(() => {
        if (spellingRules.size === 0) return;
        
        const rootEl = editor.getRootElement();
        if (!rootEl) return;
        
        const spans = rootEl.querySelectorAll('span[data-lexical-text="true"]');
        
        console.log('[v0] GrammarCheck: Scanning', spans.length, 'spans, enabled:', grammarCheckEnabled);
        
        // If grammar check is disabled, remove all markers
        if (!grammarCheckEnabled) {
            spans.forEach(span => {
                span.classList.remove(GRAMMAR_CLASS);
            });
            return;
        }
        
        let markedCount = 0;
        
        spans.forEach((span) => {
            const text = span.textContent;
            if (!text || /^\s+$/.test(text)) {
                span.classList.remove(GRAMMAR_CLASS);
                return;
            }
            
            // Split by ZWSP (zero-width space) and regular spaces to handle all word boundaries
            const ZWSP = '\u200B';
            // First split by ZWSP, then split each segment by regular spaces
            const zwspSegments = text.split(ZWSP);
            const segments: string[] = [];
            for (const seg of zwspSegments) {
                // Also split by regular spaces
                const spaceSplit = seg.split(/\s+/);
                segments.push(...spaceSplit);
            }
            
            // Check if any segment in this span is a non-standard spelling
            let hasNonStandard = false;
            let matchedWord = '';
            
            for (const segment of segments) {
                if (!segment) continue;
                
                const cleanWord = cleanKhmerWord(segment);
                
                if (!cleanWord || !containsKhmer(cleanWord)) {
                    continue;
                }
                
                // Check if this word has a non-standard spelling
                const rule = spellingRules.get(cleanWord);
                
                if (rule && rule.standard !== cleanWord) {
                    hasNonStandard = true;
                    matchedWord = cleanWord;
                    break;
                }
            }
            
            if (hasNonStandard) {
                span.classList.add(GRAMMAR_CLASS);
                markedCount++;
                console.log('[v0] GrammarCheck: Marked word:', matchedWord, 'in span:', text.substring(0, 30));
            } else {
                span.classList.remove(GRAMMAR_CLASS);
            }
        });
        
        console.log('[v0] GrammarCheck: Scan complete, marked', markedCount, 'spans');
    }, [editor, spellingRules, grammarCheckEnabled]);

    // Register update listener to scan on content change
    useEffect(() => {
        if (spellingRules.size === 0) return;

        const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

            if (scanDebounceRef.current) {
                window.clearTimeout(scanDebounceRef.current);
            }
            scanDebounceRef.current = window.setTimeout(() => {
                scanAndMarkNonStandard();
            }, SCAN_DEBOUNCE_MS);
        });

        // Initial scan when rules are loaded - use a small delay to ensure DOM is ready
        const initialScanTimeout = window.setTimeout(() => {
            console.log('[v0] GrammarCheck: Running initial scan');
            scanAndMarkNonStandard();
        }, 100);
        
        // Second scan after a longer delay in case document is still loading
        const secondScanTimeout = window.setTimeout(() => {
            console.log('[v0] GrammarCheck: Running second scan');
            scanAndMarkNonStandard();
        }, 500);

        return () => {
            if (scanDebounceRef.current) {
                window.clearTimeout(scanDebounceRef.current);
            }
            window.clearTimeout(initialScanTimeout);
            window.clearTimeout(secondScanTimeout);
            unregister();
        };
    }, [editor, spellingRules, scanAndMarkNonStandard]);

    // Trigger scan when grammarCheckEnabled changes
    useEffect(() => {
        scanAndMarkNonStandard();
    }, [grammarCheckEnabled, scanAndMarkNonStandard]);

    // Handle right-click on grammar-marked words
    useEffect(() => {
        if (!grammarCheckEnabled || spellingRules.size === 0) return;

        const rootEl = editor.getRootElement();
        if (!rootEl) return;

        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // Check if clicked on a grammar-marked span
            if (!target.classList.contains(GRAMMAR_CLASS)) {
                setSelectedWord(null);
                setStandardizedSpelling(null);
                setAlternativeSpellings([]);
                return;
            }
            
            const text = target.textContent;
            if (!text) return;
            
            const cleanWord = cleanKhmerWord(text);
            const rule = spellingRules.get(cleanWord);
            
            if (rule) {
                setSelectedWord(cleanWord);
                setStandardizedSpelling(rule.standard);
                setAlternativeSpellings(rule.alternatives);
                
                // Set up replace handler
                editor.update(() => {
                    const selection = $getSelection();
                    if (!$isRangeSelection(selection)) return;
                    
                    const anchorNode = selection.anchor.getNode();
                    if (!$isTextNode(anchorNode)) return;
                    
                    const nodeKey = anchorNode.getKey();
                    
                    setReplaceHandler(() => {
                        return (oldWord: string, newWord: string) => {
                            editor.update(() => {
                                const maybeNode = $getNodeByKey(nodeKey);
                                if (!$isTextNode(maybeNode)) return;
                                maybeNode.setTextContent(newWord);
                            });
                        };
                    });
                });
            }
        };

        rootEl.addEventListener('contextmenu', handleContextMenu);
        
        return () => {
            rootEl.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [editor, grammarCheckEnabled, spellingRules, setSelectedWord, setStandardizedSpelling, setAlternativeSpellings, setReplaceHandler]);

    return null;
}
