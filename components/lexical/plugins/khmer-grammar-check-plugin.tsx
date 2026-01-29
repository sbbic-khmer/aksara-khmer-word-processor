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

// Pattern for punctuation that can be attached to words
const PUNCTUATION_PATTERN = /[\u200B\u200C\u200D\u2060\u17D4-\u17DA.,!?;:'"()\[\]{}«»‹›""''–—…]/;

// Clean a word by removing invisible characters, punctuation, and trimming.
// IMPORTANT: This must handle all punctuation that might be attached to words,
// including guillemets («»), smart quotes, and other typographic characters.
// Without this, words like «អោយ or អស់»។ would fail dictionary lookups.
function cleanKhmerWord(text: string): string {
    return text
        .replace(/[\u200B\u200C\u200D\u2060]/g, '') // zero-width chars
        .replace(/[\u17D4-\u17DA]/g, '') // Khmer punctuation (។ ៕ ៖ ៗ ៘ ៙ ៚)
        .replace(/[.,!?;:'"()\[\]{}]/g, '') // common punctuation
        .replace(/[«»‹›""'']/g, '') // guillemets and smart quotes
        .replace(/[–—…]/g, '') // en-dash, em-dash, ellipsis
        .trim();
}

// Extract leading and trailing punctuation from a word.
// Returns { leading, core, trailing } where core is the actual word.
// This is used to preserve punctuation when replacing a word.
// Example: «អោយ» → { leading: "«", core: "អោយ", trailing: "»" }
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
                // Clean the word to remove punctuation before dictionary lookup
                const cleanWord = cleanKhmerWord(word);
                if (!cleanWord || !containsKhmer(cleanWord)) continue;
                
                const rule = spellingRules.get(cleanWord);
                if (rule && rule.standard !== cleanWord) {
                    hasNonStandard = true;
                    break;
                }
            }
            
            // Add/remove class on the span
            // Note: This may include attached punctuation visually, but replacement
            // logic uses extractPunctuation() to preserve punctuation when fixing.
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

    // Handle right-click or click/tap on grammar-marked words
    useEffect(() => {
        if (!grammarCheckEnabled || spellingRules.size === 0) return;

        const rootEl = editor.getRootElement();
        if (!rootEl) return;

        // Shared handler for setting up word data and replace handler
        const setupWordData = (target: HTMLElement) => {
            // Check if clicked on a grammar-marked span
            const grammarElement = target.classList.contains(GRAMMAR_CLASS)
                ? target
                : target.closest(`.${GRAMMAR_CLASS}`) as HTMLElement | null;
            
            if (!grammarElement) {
                setSelectedWord(null);
                setStandardizedSpelling(null);
                setAlternativeSpellings([]);
                return false;
            }
            
            const text = grammarElement.textContent;
            if (!text) return false;
            
            const cleanWord = cleanKhmerWord(text);
            const rule = spellingRules.get(cleanWord);
            
            if (rule) {
                setSelectedWord(cleanWord);
                setStandardizedSpelling(rule.standard);
                setAlternativeSpellings(rule.alternatives);
                
                // Get the Lexical node key from the clicked DOM element
                const lexicalSpan = grammarElement.closest('span[data-lexical-text="true"]') as HTMLElement;
                
                if (lexicalSpan) {
                    // Find the node key by reading the editor state
                    editor.getEditorState().read(() => {
                        const root = editor.getRootElement();
                        if (!root) return;
                        
                        let targetNodeKey: string | null = null;
                        
                        // Get the lexical key from the DOM element
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
                                        // Preserve leading/trailing punctuation when replacing
                                        const nodeText = maybeNode.getTextContent();
                                        const { leading, trailing } = extractPunctuation(nodeText);
                                        maybeNode.setTextContent(leading + newWord + trailing);
                                    });
                                };
                            });
                        } else {
                            // Fallback: find and update the node by matching text content
                            setReplaceHandler(() => {
                                return (oldWord: string, newWord: string) => {
                                    editor.update(() => {
                                        const root = $getRoot();
                                        const textNodes: TextNode[] = [];
                                        
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
                                        
                                        for (const textNode of textNodes) {
                                            const nodeText = textNode.getTextContent();
                                            const cleanNodeText = cleanKhmerWord(nodeText);
                                            if (cleanNodeText === oldWord) {
                                                // Preserve leading/trailing punctuation when replacing
                                                const { leading, trailing } = extractPunctuation(nodeText);
                                                textNode.setTextContent(leading + newWord + trailing);
                                                break;
                                            }
                                        }
                                    });
                                };
                            });
                        }
                    });
                }
                return true;
            }
            return false;
        };

        const handleContextMenu = (e: MouseEvent) => {
            setupWordData(e.target as HTMLElement);
        };

        // Handle click/tap for mobile support
        const handleClick = (e: MouseEvent) => {
            setupWordData(e.target as HTMLElement);
        };

        rootEl.addEventListener('contextmenu', handleContextMenu);
        rootEl.addEventListener('click', handleClick);
        
        return () => {
            rootEl.removeEventListener('contextmenu', handleContextMenu);
            rootEl.removeEventListener('click', handleClick);
        };
    }, [editor, grammarCheckEnabled, spellingRules, setSelectedWord, setStandardizedSpelling, setAlternativeSpellings, setReplaceHandler]);

    return null;
}
