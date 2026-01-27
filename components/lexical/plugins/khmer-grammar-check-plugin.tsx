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
        
        console.log('[v0] GrammarCheck: Starting to load spelling rules...');
        
        async function loadSpellingRules() {
            try {
                setIsLoading(true);
                setError(null);
                
                console.log('[v0] GrammarCheck: Fetching /dictionaries/khmer-multiple-spellings.txt');
                const response = await fetch('/dictionaries/khmer-multiple-spellings.txt');
                console.log('[v0] GrammarCheck: Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`Failed to load spelling rules: ${response.status}`);
                }
                
                const content = await response.text();
                console.log('[v0] GrammarCheck: Got content, length:', content.length);
                
                if (!mounted) return;
                
                const rules = parseSpellingRules(content);
                console.log('[v0] GrammarCheck: Parsed', rules.size, 'spelling rules');
                
                // Debug: Check if អោយ is in the rules
                const testWord = 'អោយ';
                const testRule = rules.get(testWord);
                console.log('[v0] GrammarCheck: Test word "អោយ" rule:', testRule);
                
                setSpellingRules(rules);
                setIsLoading(false);
            } catch (err) {
                console.error('[v0] GrammarCheck: Error loading rules:', err);
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
        console.log('[v0] GrammarCheck: scanAndMarkNonStandard called, rules size:', spellingRules.size, 'enabled:', grammarCheckEnabled);
        
        // Debug: log first 5 keys and test lookup
        const keys = Array.from(spellingRules.keys()).slice(0, 10);
        console.log('[v0] GrammarCheck: First 10 keys:', JSON.stringify(keys));
        const testLookup = spellingRules.get('អោយ');
        console.log('[v0] GrammarCheck: Direct lookup "អោយ":', testLookup ? JSON.stringify(testLookup) : 'NOT FOUND');
        
        if (spellingRules.size === 0) {
            console.log('[v0] GrammarCheck: No rules loaded, skipping scan');
            return;
        }
        
        const rootEl = editor.getRootElement();
        if (!rootEl) {
            console.log('[v0] GrammarCheck: No root element');
            return;
        }
        
        const spans = rootEl.querySelectorAll('span[data-lexical-text="true"]');
        console.log('[v0] GrammarCheck: Found', spans.length, 'text spans');
        
        // If grammar check is disabled, remove all markers
        if (!grammarCheckEnabled) {
            spans.forEach(span => {
                span.classList.remove(GRAMMAR_CLASS);
            });
            return;
        }
        
        spans.forEach((span) => {
            const text = span.textContent;
            if (!text || /^\s+$/.test(text)) {
                span.classList.remove(GRAMMAR_CLASS);
                return;
            }
            
            // Split by spaces to check each word
            const words = text.split(/\s+/).filter(w => w.length > 0);
            
            // Only check single-word spans
            if (words.length > 1) {
                span.classList.remove(GRAMMAR_CLASS);
                return;
            }
            
            const cleanWord = cleanKhmerWord(text);
            
            // Special debug for អោយ
            if (text.includes('អោយ') || cleanWord.includes('អោយ')) {
                console.log('[v0] GrammarCheck: FOUND អោយ! text:', JSON.stringify(text), 'cleanWord:', JSON.stringify(cleanWord));
            }
            
            if (!cleanWord || !containsKhmer(cleanWord)) {
                span.classList.remove(GRAMMAR_CLASS);
                return;
            }
            
            // Check if this word has a non-standard spelling
            const rule = spellingRules.get(cleanWord);
            
            // Only log when we find a match or for specific test words
            if (rule) {
                console.log('[v0] GrammarCheck: MATCH FOUND for', cleanWord, '-> standard:', rule.standard);
                if (rule.standard !== cleanWord) {
                    span.classList.add(GRAMMAR_CLASS);
                    console.log('[v0] GrammarCheck: Added blue underline to:', cleanWord);
                } else {
                    span.classList.remove(GRAMMAR_CLASS);
                }
            } else {
                span.classList.remove(GRAMMAR_CLASS);
            }
        });
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

        // Initial scan
        scanAndMarkNonStandard();

        return () => {
            if (scanDebounceRef.current) {
                window.clearTimeout(scanDebounceRef.current);
            }
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
