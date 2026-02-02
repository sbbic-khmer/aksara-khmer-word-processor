// Source - https://stackoverflow.com/a
// Posted by Alex
// Retrieved 2026-01-26, License - CC BY-SA 4.0
// Modified for Khmer language support

'use client';

import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
} from 'react';
import { mutate } from 'swr';
import { clearSegmentationCache } from '../plugins/khmer-word-break-plugin';
import { clearSpellCheckCache, clearSpanTracking } from '../plugins/khmer-spell-check-plugin';
import { clearGrammarSpanTracking } from '../plugins/khmer-grammar-check-plugin';

interface SpellCheckContextValue {
    selectedWord: string | null;
    suggestions: string[];
    setSelectedWord: (word: string | null) => void;
    setSuggestions: (suggestions: string[]) => void;
    setReplaceHandler: (
        handler: (oldWord: string, newWord: string) => void
    ) => void;
    replaceWord: (oldWord: string, newWord: string) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
    // Track misspelled node keys for visual highlighting
    misspelledNodeKeys: Set<string>;
    addMisspelledNode: (key: string) => void;
    removeMisspelledNode: (key: string) => void;
    clearMisspelledNodes: () => void;
    // Debug mode
    debugMode: boolean;
    setDebugMode: (debug: boolean) => void;
    // Track if suggestions have been loaded for current word
    suggestionsLoaded: boolean;
    setSuggestionsLoaded: (loaded: boolean) => void;
    // Enable/disable spell checking
    spellCheckEnabled: boolean;
    setSpellCheckEnabled: (enabled: boolean) => void;
    // Custom words management
    addWordToDictionary: (word: string) => Promise<void>;
    ignoreWord: (word: string) => Promise<void>;
    triggerRescan: () => void;
    // Request suggestions for a word (called by context menu)
    requestSuggestions: (word: string) => void;
    setRequestSuggestionsHandler: (handler: (word: string) => void) => void;
}

const SpellCheckContext = createContext<SpellCheckContextValue>({
    selectedWord: null,
    suggestions: [],
    setSelectedWord: () => { },
    setSuggestions: () => { },
    setReplaceHandler: () => { },
    replaceWord: () => { },
    isLoading: true,
    setIsLoading: () => { },
    error: null,
    setError: () => { },
    misspelledNodeKeys: new Set(),
    addMisspelledNode: () => { },
    removeMisspelledNode: () => { },
    clearMisspelledNodes: () => { },
    debugMode: false,
    setDebugMode: () => { },
    suggestionsLoaded: false,
    setSuggestionsLoaded: () => { },
    spellCheckEnabled: true,
    setSpellCheckEnabled: () => { },
    addWordToDictionary: async () => { },
    ignoreWord: async () => { },
    triggerRescan: () => { },
    requestSuggestions: () => { },
    setRequestSuggestionsHandler: () => { },
});

export const useSpellCheck = () => useContext(SpellCheckContext);

export function SpellCheckProvider({ children }: { children: ReactNode }) {
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [misspelledNodeKeys, setMisspelledNodeKeys] = useState<Set<string>>(new Set());
    const [debugMode, setDebugMode] = useState(false);
    const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
    const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);
    const [rescanTrigger, setRescanTrigger] = useState(0);

    // store the active Lexical replacement function
    const [replaceHandler, setReplaceHandler] = useState<
        (oldWord: string, newWord: string) => void
    >(() => () => { });

    // store the suggestion request handler (set by the spell check plugin)
    const [requestSuggestionsHandler, setRequestSuggestionsHandler] = useState<
        (word: string) => void
    >(() => () => { });

    // Request suggestions for a word
    const requestSuggestions = useCallback(
        (word: string) => {
            requestSuggestionsHandler(word);
        },
        [requestSuggestionsHandler]
    );

    // ensure replaceWord always uses the latest handler
    const replaceWord = useCallback(
        (oldWord: string, newWord: string) => {
            replaceHandler(oldWord, newWord);
        },
        [replaceHandler]
    );

    const addMisspelledNode = useCallback((key: string) => {
        setMisspelledNodeKeys(prev => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    }, []);

    const removeMisspelledNode = useCallback((key: string) => {
        setMisspelledNodeKeys(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    }, []);

    const clearMisspelledNodes = useCallback(() => {
        setMisspelledNodeKeys(new Set());
    }, []);

    // Add word to spell check dictionary
    const addWordToDictionary = useCallback(async (word: string) => {
        try {
            const res = await fetch('/api/spell-check/custom-words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word, action: 'add' }),
            });

            if (!res.ok) {
                throw new Error('Failed to add word');
            }

            // Revalidate the custom words cache to fetch updated data
            await mutate('/api/spell-check/custom-words');

            // Clear caches so words are re-checked/re-segmented with updated dictionary
            clearSegmentationCache();
            clearSpellCheckCache();
            clearSpanTracking(); // Force full rescan of all spans
            clearGrammarSpanTracking(); // Force grammar rescan too

            // Trigger rescan to remove red underline
            setRescanTrigger(prev => prev + 1);
        } catch (err) {
            console.error('Error adding word to dictionary:', err);
        }
    }, []);

    // Ignore word in spell checker
    const ignoreWord = useCallback(async (word: string) => {
        try {
            const res = await fetch('/api/spell-check/custom-words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word, action: 'ignore' }),
            });

            if (!res.ok) {
                throw new Error('Failed to ignore word');
            }

            // Revalidate the custom words cache to fetch updated data
            await mutate('/api/spell-check/custom-words');

            // Clear caches so words are re-checked/re-segmented with updated dictionary
            clearSegmentationCache();
            clearSpellCheckCache();
            clearSpanTracking(); // Force full rescan of all spans
            clearGrammarSpanTracking(); // Force grammar rescan too

            // Trigger rescan to remove red underline
            setRescanTrigger(prev => prev + 1);
        } catch (err) {
            console.error('Error ignoring word:', err);
        }
    }, []);

    // Trigger a rescan of the document
    const triggerRescan = useCallback(() => {
        setRescanTrigger(prev => prev + 1);
    }, []);

    return (
        <SpellCheckContext.Provider
            value={{
                selectedWord, setSelectedWord,
                suggestions, setSuggestions,
                setReplaceHandler,
                replaceWord,
                isLoading, setIsLoading,
                error, setError,
                misspelledNodeKeys,
                addMisspelledNode,
                removeMisspelledNode,
                clearMisspelledNodes,
                debugMode, setDebugMode,
                suggestionsLoaded, setSuggestionsLoaded,
                spellCheckEnabled, setSpellCheckEnabled,
                addWordToDictionary,
                ignoreWord,
                triggerRescan,
                requestSuggestions,
                setRequestSuggestionsHandler,
            }}
        >
            {children}
        </SpellCheckContext.Provider>
    );
}
