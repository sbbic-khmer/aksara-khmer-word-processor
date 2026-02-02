// Web Worker for spell check suggestions
// Uses typo-js for dictionary-based spell checking and suggestions

let typo = null;
let debugMode = false;

// Cache for suggestions (helps with repeated lookups)
const suggestionCache = new Map();
const CACHE_MAX_SIZE = 500;

// Load typo-js library from local copy (bundled to avoid CSP issues)
try {
    importScripts('/lib/typo.js');
} catch (e) {
    // Always log critical errors
    console.error('[SpellCheck] Failed to load typo-js:', e);
}

/**
 * Get suggestions with caching
 */
function getSuggestions(word, limit = 5) {
    if (suggestionCache.has(word)) {
        return { suggestions: suggestionCache.get(word), cached: true };
    }

    // Use typo-js suggest method
    const suggestions = typo.suggest(word, limit);

    // Cache result
    if (suggestionCache.size >= CACHE_MAX_SIZE) {
        const firstKey = suggestionCache.keys().next().value;
        suggestionCache.delete(firstKey);
    }
    suggestionCache.set(word, suggestions);

    return { suggestions, cached: false };
}

/**
 * Initialize the dictionary
 */
async function initDictionary() {
    try {
        if (debugMode) {
            console.log('[SpellCheck] Loading dictionary files...');
        }

        const [affResponse, dicResponse] = await Promise.all([
            fetch('/dictionaries/km_KH.aff'),
            fetch('/dictionaries/km_KH.dic')
        ]);

        if (!affResponse.ok || !dicResponse.ok) {
            throw new Error('Failed to fetch dictionary files');
        }

        const [aff, dic] = await Promise.all([
            affResponse.text(),
            dicResponse.text()
        ]);

        if (debugMode) {
            console.log('[SpellCheck] Initializing typo.js...');
        }
        typo = new Typo('km_KH', aff, dic);

        // Count words for logging
        const lines = dic.split('\n');
        const wordCount = lines.length - 1; // First line is count

        if (debugMode) {
            console.log('[SpellCheck] Dictionary loaded with', wordCount, 'words');
        }
        self.postMessage({ type: 'ready', wordCount });
    } catch (error) {
        // Always log critical errors
        console.error('[SpellCheck] Init error:', error);
        self.postMessage({ type: 'error', error: error.message || String(error) });
    }
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, word, requestId, debug } = e.data;

    if (type === 'init') {
        // Set debug mode from init message
        if (debug !== undefined) {
            debugMode = debug;
        }
        initDictionary();
        return;
    }

    if (type === 'setDebug') {
        debugMode = debug === true;
        return;
    }

    if (type === 'suggest') {
        if (!typo) {
            self.postMessage({
                type: 'suggestions',
                requestId,
                word,
                suggestions: [],
                error: 'Dictionary not loaded'
            });
            return;
        }

        try {
            const startTime = performance.now();
            const { suggestions, cached } = getSuggestions(word, 5);
            const elapsed = performance.now() - startTime;

            self.postMessage({
                type: 'suggestions',
                requestId,
                word,
                suggestions,
                elapsed,
                cached
            });
        } catch (error) {
            // Always log errors
            if (debugMode) {
                console.error('[SpellCheck] Suggest error:', error);
            }
            self.postMessage({
                type: 'suggestions',
                requestId,
                word,
                suggestions: [],
                error: error.message || String(error)
            });
        }
    }

    if (type === 'check') {
        if (!typo) {
            self.postMessage({
                type: 'checkResult',
                requestId,
                word,
                isCorrect: true,
                error: 'Dictionary not loaded'
            });
            return;
        }

        try {
            const isCorrect = typo.check(word);
            self.postMessage({
                type: 'checkResult',
                requestId,
                word,
                isCorrect
            });
        } catch (error) {
            self.postMessage({
                type: 'checkResult',
                requestId,
                word,
                isCorrect: true,
                error: error.message || String(error)
            });
        }
    }

    if (type === 'clearCache') {
        suggestionCache.clear();
        self.postMessage({ type: 'cacheCleared' });
    }
};

// Worker script loaded - only log in debug mode
// Note: debugMode will be false at this point, so this won't log initially
// Debug mode is set via the 'init' message from the main thread
