'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    $getNodeByKey,
    $getRoot,
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
            
            // Split text by whitespace AND ZWSP to get individual words
            const words = text.split(/[\s\u200B]+/).filter(w => w.length > 0);
            
            // Check each word in this span for non-standard spellings
            let hasNonStandard = false;
            
            for (const word of words) {
                const cleanWord = cleanKhmerWord(word);
                if (!cleanWord || !containsKhmer(cleanWord)) continue;
                
                const rule = spellingRules.get(cleanWord);
                if (rule && rule.standard !== cleanWord) {
                    hasNonStandard = true;
                    break;
                }
            }
            
            if (hasNonStandard) {
                span.classList.add(GRAMMAR_CLASS);
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

        // Initial scan when rules are loaded - delay to allow word break plugin to segment paragraphs first
        const initialScanTimeout = window.setTimeout(() => {
            scanAndMarkNonStandard();
        }, 300);
        
        // Second scan after word break plugin has had more time to process
        const secondScanTimeout = window.setTimeout(() => {
            scanAndMarkNonStandard();
        }, 800);
        
        // Third scan to catch any remaining unsegmented content
        const thirdScanTimeout = window.setTimeout(() => {
            scanAndMarkNonStandard();
        }, 1500);

        return () => {
            if (scanDebounceRef.current) {
                window.clearTimeout(scanDebounceRef.current);
            }
            window.clearTimeout(initialScanTimeout);
            window.clearTimeout(secondScanTimeout);
            window.clearTimeout(thirdScanTimeout);
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
                
                // Get the Lexical node key from the clicked DOM element
                // The span has data-lexical-text="true" and we need to find its node key
                // Walk up to find the element with the lexical key, or use the target directly
                const lexicalSpan = target.closest('span[data-lexical-text="true"]') as HTMLElement;
                
                if (lexicalSpan) {
                    // Find the node key by reading the editor state
                    editor.getEditorState().read(() => {
                        // Get all text nodes and find the one matching this DOM element
                        const root = editor.getRootElement();
                        if (!root) return;
                        
                        // Find all text nodes by iterating through the DOM and matching
                        const allSpans = root.querySelectorAll('span[data-lexical-text="true"]');
                        let targetNodeKey: string | null = null;
                        
                        // We need to find which Lexical TextNode corresponds to this span
                        // The DOM structure maps to Lexical nodes, so we can use $getNodeByKey 
                        // after finding the key from the __lexicalKey property
                        const lexicalKey = (lexicalSpan as any).__lexicalKey;
                        
                        if (lexicalKey) {
                            targetNodeKey = lexicalKey;
                        }
                        
                        if (targetNodeKey) {
                            setReplaceHandler(() => {
                                return (oldWord: string, newWord: string) => {
                                    editor.update(() => {
                                        const maybeNode = $getNodeByKey(targetNodeKey!);
                                        if (!$isTextNode(maybeNode)) return;
                                        maybeNode.setTextContent(newWord);
                                    });
                                };
                            });
                        } else {
                            // Fallback: store the DOM element reference and replace via DOM + sync
                            setReplaceHandler(() => {
                                return (oldWord: string, newWord: string) => {
                                    // Try to find and update the node by matching text content
                                    editor.update(() => {
                                        const root = $getRoot();
                                        const textNodes: TextNode[] = [];
                                        
                                        // Collect all text nodes
                                        const collectTextNodes = (node: any) => {
                                            if ($isTextNode(node)) {
                                                textNodes.push(node);
                                            }
                                            if (node.getChildren) {
                                                for (const child of node.getChildren()) {
                                                    collectTextNodes(child);
                                                }
                                            }
                                        };
                                        collectTextNodes(root);
                                        
                                        // Find the node with matching text
                                        for (const textNode of textNodes) {
                                            const nodeText = textNode.getTextContent();
                                            const cleanNodeText = cleanKhmerWord(nodeText);
                                            if (cleanNodeText === oldWord) {
                                                textNode.setTextContent(newWord);
                                                break;
                                            }
                                        }
                                    });
                                };
                            });
                        }
                    });
                }
            }
        };

        rootEl.addEventListener('contextmenu', handleContextMenu);
        
        return () => {
            rootEl.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [editor, grammarCheckEnabled, spellingRules, setSelectedWord, setStandardizedSpelling, setAlternativeSpellings, setReplaceHandler]);

    return null;
}
