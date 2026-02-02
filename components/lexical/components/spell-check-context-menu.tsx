'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSpellCheck } from '../contexts/spell-check-context';
import { cn } from '@/lib/utils';
import { BookOpen, Loader2 } from 'lucide-react';

// Clean a word by removing invisible characters and punctuation (same as spell-check-plugin)
function cleanKhmerWord(text: string): string {
  return text
    .replace(/[\u200B\u200C\u200D\u2060]/g, '')
    .replace(/[\u17D4-\u17DA]/g, '')
    .replace(/[.,!?;:'"()\[\]{}]/g, '')
    .replace(/[«»‹›""'']/g, '')
    .replace(/[–—…]/g, '')
    .trim();
}

interface SpellCheckContextMenuProps {
  children: React.ReactNode;
}

interface MenuPosition {
  x: number;
  y: number;
}

export function SpellCheckContextMenu({ children }: SpellCheckContextMenuProps) {
  const { suggestions: contextSuggestions, replaceWord, isLoading, error, addWordToDictionary, ignoreWord, setSelectedWord, requestSuggestions, suggestionsLoaded } = useSpellCheck();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [clickedWord, setClickedWord] = useState<string | null>(null); // Local state - won't be cleared by plugin
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([]); // Local suggestions - won't be cleared by plugin
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const openTimeRef = useRef<number>(0); // Track when menu was opened

  // Detect if device is mobile (has touch support and small screen)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouchScreen && hasSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Capture suggestions when they arrive for our clicked word
  useEffect(() => {
    if (clickedWord && suggestionsLoaded && isLoadingLocal) {
      setLocalSuggestions(contextSuggestions);
      setIsLoadingLocal(false);
    }
  }, [clickedWord, contextSuggestions, suggestionsLoaded, isLoadingLocal]);

  // Handle right-click or tap on misspelled word
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only show spell check menu if right-clicking directly on a misspelled word
    // Handle both Element targets and Text node targets (when clicking directly on text)
    const target = e.target as Node;

    // If target is a Text node, get its parent element
    const element = target.nodeType === Node.TEXT_NODE
      ? target.parentElement
      : target as HTMLElement;

    if (!element) {
      setIsOpen(false);
      setClickedWord(null);
      setLocalSuggestions([]);
      setIsLoadingLocal(false);
      return;
    }

    const misspelledElement = element.classList?.contains('spellcheck-misspelled')
      ? element
      : element.closest?.('.spellcheck-misspelled') as HTMLElement | null;

    if (!misspelledElement) {
      // Not clicking on a misspelled word - don't show spell check menu
      // Let the browser's default context menu or other handlers take over
      setIsOpen(false);
      setClickedWord(null);
      setLocalSuggestions([]);
      setIsLoadingLocal(false);
      return;
    }

    // Prevent the browser's default context menu and stop propagation
    // to prevent the spell check plugin's contextmenu handler from interfering
    e.preventDefault();
    e.stopPropagation();

    // Extract the word directly from the misspelled element's text content
    // This is instant - no need to wait for the spell check plugin
    const wordText = misspelledElement.textContent;
    if (wordText) {
      const cleanedWord = cleanKhmerWord(wordText);
      if (cleanedWord) {
        setClickedWord(cleanedWord); // Local state - won't be cleared by plugin
        setLocalSuggestions([]); // Clear previous suggestions
        setIsLoadingLocal(true); // Mark as loading
        setSelectedWord(cleanedWord); // Update context
        requestSuggestions(cleanedWord); // Request suggestions from worker
      }
    }

    // Set position and open immediately
    setPosition({ x: e.clientX, y: e.clientY });
    openTimeRef.current = Date.now();
    setIsOpen(true);
  }, [setSelectedWord, requestSuggestions]);

  // Handle click/tap on misspelled word (for mobile support)
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Handle both Element targets and Text node targets
    const target = e.target as Node;
    const element = target.nodeType === Node.TEXT_NODE
      ? target.parentElement
      : target as HTMLElement;

    if (!element) {
      if (isOpen) {
        setIsOpen(false);
        setClickedWord(null);
        setLocalSuggestions([]);
        setIsLoadingLocal(false);
      }
      return;
    }

    const misspelledElement = element.classList?.contains('spellcheck-misspelled')
      ? element
      : element.closest?.('.spellcheck-misspelled') as HTMLElement | null;

    if (!misspelledElement) {
      // Clicking elsewhere - close the menu if open
      if (isOpen) {
        setIsOpen(false);
        setClickedWord(null);
        setLocalSuggestions([]);
        setIsLoadingLocal(false);
      }
      return;
    }

    // Extract the word directly from the misspelled element's text content
    const wordText = misspelledElement.textContent;
    if (wordText) {
      const cleanedWord = cleanKhmerWord(wordText);
      if (cleanedWord) {
        setClickedWord(cleanedWord); // Local state - won't be cleared by plugin
        setLocalSuggestions([]); // Clear previous suggestions
        setIsLoadingLocal(true); // Mark as loading
        setSelectedWord(cleanedWord); // Update context
        requestSuggestions(cleanedWord); // Request suggestions from worker
      }
    }

    // Clicked on a misspelled word - show the context menu
    // Get the bounding rect of the misspelled word for positioning
    const rect = misspelledElement.getBoundingClientRect();

    // Position the menu below the word
    setPosition({
      x: rect.left,
      y: rect.bottom + 4
    });
    openTimeRef.current = Date.now();
    setIsOpen(true);

    // Prevent default to avoid moving cursor
    e.preventDefault();
    e.stopPropagation();
  }, [isOpen, setSelectedWord, requestSuggestions]);

  // Handle clicking a suggestion
  const handleSuggestionClick = useCallback((suggestion: string) => {
    if (clickedWord) {
      replaceWord(clickedWord, suggestion);
    }
    setIsOpen(false);
    setClickedWord(null);
    setLocalSuggestions([]);
    setIsLoadingLocal(false);
  }, [clickedWord, replaceWord]);

  // Handle adding word to dictionary
  const handleAddToDictionary = useCallback(async () => {
    if (clickedWord) {
      await addWordToDictionary(clickedWord);
    }
    setIsOpen(false);
    setClickedWord(null);
    setLocalSuggestions([]);
    setIsLoadingLocal(false);
  }, [clickedWord, addWordToDictionary]);

  // Handle ignoring word
  const handleIgnoreWord = useCallback(async () => {
    if (clickedWord) {
      await ignoreWord(clickedWord);
    }
    setIsOpen(false);
    setClickedWord(null);
    setLocalSuggestions([]);
    setIsLoadingLocal(false);
  }, [clickedWord, ignoreWord]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const closeMenu = () => {
      setIsOpen(false);
      setClickedWord(null);
      setLocalSuggestions([]);
      setIsLoadingLocal(false);
    };

    // Ignore events that happen within 150ms of opening (to avoid closing from the opening event)
    const shouldIgnoreEvent = () => Date.now() - openTimeRef.current < 150;

    const handleClickOutside = (e: MouseEvent) => {
      if (shouldIgnoreEvent()) return;
      // Ignore right-clicks (they might be opening a new context menu)
      if (e.button === 2) return;

      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleContextMenuOutside = (e: MouseEvent) => {
      if (shouldIgnoreEvent()) return;
      // Close if right-clicking outside the menu
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleScroll = () => {
      if (shouldIgnoreEvent()) return;
      closeMenu();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    // Add listeners immediately - they'll ignore events within 150ms of opening
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleContextMenuOutside);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenuOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth - 10) {
        newX = viewportWidth - rect.width - 10;
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight - 10) {
        newY = position.y - rect.height;
      }

      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    }
  }, [isOpen, position]);

  const hasMisspelledWord = !!clickedWord;
  const noSuggestionsFound = clickedWord && !isLoadingLocal && localSuggestions.length === 0;
  const showMenu = isOpen;

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      onClick={isMobile ? handleClick : undefined}
      className="contents"
    >
      {children}

      {showMenu && (
        <div
          ref={menuRef}
          className={cn(
            "fixed z-50 min-w-[180px] overflow-hidden rounded-md border bg-popover p-1 shadow-lg",
            "animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
          style={{
            left: position.x,
            top: position.y,
            fontFamily: '"Noto Sans Khmer", sans-serif',
          }}
        >
          {isLoading && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>កំពុងផ្ទុកវចនានុក្រម...</span>
            </div>
          )}

          {error && (
            <div className="px-2 py-1.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {hasMisspelledWord && (
            <>
              {/* Header showing the misspelled word */}
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                <BookOpen className="h-3 w-3" />
                <span>ពាក្យមិនត្រឹមត្រូវ៖</span>
                <span className="font-medium text-destructive">{clickedWord}</span>
              </div>

              {/* Loading suggestions indicator */}
              {isLoadingLocal && (
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>កំពុងស្វែងរកពាក្យ...</span>
                </div>
              )}

              {/* No suggestions found */}
              {noSuggestionsFound && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground italic">
                  រកមិនឃើញពាក្យស្រដៀង
                </div>
              )}

              {/* Suggestions */}
              {localSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    "transition-colors"
                  )}
                  style={{
                    fontFamily: '"Noto Sans Khmer", sans-serif',
                  }}
                >
                  {suggestion}
                </button>
              ))}

              {/* Dictionary management options */}
              <div className="border-t border-border mt-1 pt-1 space-y-0.5">
                <button
                  onClick={handleAddToDictionary}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none",
                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    "transition-colors"
                  )}
                  title="Add word to personal dictionary"
                >
                  បន្ថែមទៅវចនានុក្រម
                </button>
                <button
                  onClick={handleIgnoreWord}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none",
                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    "transition-colors"
                  )}
                  title="Ignore this word in spell checking"
                >
                  មិនអើពើ
                </button>
              </div>
            </>
          )}

          
        </div>
      )}
    </div>
  );
}
