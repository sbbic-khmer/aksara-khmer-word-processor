// Web Worker for spell check suggestions
// This runs typo.suggest() off the main thread to prevent UI freezing

let typo = null;

// Load typo-js library
importScripts('https://unpkg.com/typo-js@1.2.4/typo.js');

// Initialize the dictionary
async function initDictionary() {
    try {
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

        typo = new Typo('km_KH', aff, dic);
        self.postMessage({ type: 'ready' });
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, word, requestId } = e.data;

    if (type === 'init') {
        initDictionary();
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
            const suggestions = typo.suggest(word) || [];
            const elapsed = performance.now() - startTime;

            self.postMessage({ 
                type: 'suggestions', 
                requestId, 
                word, 
                suggestions: suggestions.slice(0, 5),
                elapsed
            });
        } catch (error) {
            self.postMessage({ 
                type: 'suggestions', 
                requestId, 
                word, 
                suggestions: [],
                error: error.message
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
                error: error.message
            });
        }
    }
};
