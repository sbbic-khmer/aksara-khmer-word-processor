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
});

export const useSpellCheck = () => useContext(SpellCheckContext);

export function SpellCheckProvider({ children }: { children: ReactNode }) {
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // store the active Lexical replacement function
    const [replaceHandler, setReplaceHandler] = useState<
        (oldWord: string, newWord: string) => void
    >(() => () => { });

    // ensure replaceWord always uses the latest handler
    const replaceWord = useCallback(
        (oldWord: string, newWord: string) => {
            replaceHandler(oldWord, newWord);
        },
        [replaceHandler]
    );

    return (
        <SpellCheckContext.Provider
            value={{
                selectedWord, setSelectedWord,
                suggestions, setSuggestions,
                setReplaceHandler,
                replaceWord,
                isLoading, setIsLoading,
                error, setError,
            }}
        >
            {children}
        </SpellCheckContext.Provider>
    );
}
