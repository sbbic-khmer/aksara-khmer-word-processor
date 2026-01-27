'use client';

import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
} from 'react';

interface GrammarCheckContextValue {
    // Selected word info for the context menu
    selectedWord: string | null;
    standardizedSpelling: string | null;
    alternativeSpellings: string[];
    setSelectedWord: (word: string | null) => void;
    setStandardizedSpelling: (spelling: string | null) => void;
    setAlternativeSpellings: (spellings: string[]) => void;
    
    // Replace handler for fixing grammar issues
    setReplaceHandler: (handler: (oldWord: string, newWord: string) => void) => void;
    replaceWord: (oldWord: string, newWord: string) => void;
    
    // Loading state
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
    
    // The spelling rules map (alternative -> standardized)
    spellingRules: Map<string, { standard: string; alternatives: string[] }>;
    setSpellingRules: (rules: Map<string, { standard: string; alternatives: string[] }>) => void;
    
    // Enable/disable grammar checking
    grammarCheckEnabled: boolean;
    setGrammarCheckEnabled: (enabled: boolean) => void;
    
    // Debug mode
    debugMode: boolean;
    setDebugMode: (debug: boolean) => void;
}

const GrammarCheckContext = createContext<GrammarCheckContextValue>({
    selectedWord: null,
    standardizedSpelling: null,
    alternativeSpellings: [],
    setSelectedWord: () => {},
    setStandardizedSpelling: () => {},
    setAlternativeSpellings: () => {},
    setReplaceHandler: () => {},
    replaceWord: () => {},
    isLoading: true,
    setIsLoading: () => {},
    error: null,
    setError: () => {},
    spellingRules: new Map(),
    setSpellingRules: () => {},
    grammarCheckEnabled: true,
    setGrammarCheckEnabled: () => {},
    debugMode: false,
    setDebugMode: () => {},
});

export const useGrammarCheck = () => useContext(GrammarCheckContext);

export function GrammarCheckProvider({ children }: { children: ReactNode }) {
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [standardizedSpelling, setStandardizedSpelling] = useState<string | null>(null);
    const [alternativeSpellings, setAlternativeSpellings] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [spellingRules, setSpellingRules] = useState<Map<string, { standard: string; alternatives: string[] }>>(new Map());
    const [grammarCheckEnabled, setGrammarCheckEnabled] = useState(true);
    const [debugMode, setDebugMode] = useState(false);

    // Store the active replacement function
    const [replaceHandler, setReplaceHandler] = useState<(oldWord: string, newWord: string) => void>(
        () => () => {}
    );

    // Ensure replaceWord always uses the latest handler
    const replaceWord = useCallback(
        (oldWord: string, newWord: string) => {
            replaceHandler(oldWord, newWord);
        },
        [replaceHandler]
    );

    return (
        <GrammarCheckContext.Provider
            value={{
                selectedWord,
                setSelectedWord,
                standardizedSpelling,
                setStandardizedSpelling,
                alternativeSpellings,
                setAlternativeSpellings,
                setReplaceHandler,
                replaceWord,
                isLoading,
                setIsLoading,
                error,
                setError,
                spellingRules,
                setSpellingRules,
                grammarCheckEnabled,
                setGrammarCheckEnabled,
                debugMode,
                setDebugMode,
            }}
        >
            {children}
        </GrammarCheckContext.Provider>
    );
}
