declare module 'typo-js' {
  class Typo {
    constructor(
      dictionary?: string,
      affData?: string | null,
      dicData?: string | null,
      options?: {
        dictionaryPath?: string;
        asyncLoad?: boolean;
        loadedCallback?: (err: Error | null, result: Typo) => void;
      }
    );
    
    /**
     * Check if a word is spelled correctly
     */
    check(word: string): boolean;
    
    /**
     * Get spelling suggestions for a misspelled word
     */
    suggest(word: string, limit?: number): string[];
    
    /**
     * Check if the dictionary has loaded
     */
    loaded: boolean;
  }
  
  export = Typo;
}
