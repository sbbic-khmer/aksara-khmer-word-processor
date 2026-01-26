'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSpellCheck } from '../contexts/spell-check-context';
import { cn } from '@/lib/utils';
import { BookOpen, Loader2 } from 'lucide-react';

interface SpellCheckContextMenuProps {
  children: React.ReactNode;
}

interface MenuPosition {
  x: number;
  y: number;
}

export function SpellCheckContextMenu({ children }: SpellCheckContextMenuProps) {
  const { selectedWord, suggestions, replaceWord, isLoading, error } = useSpellCheck();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle right-click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Prevent the browser's default context menu
    e.preventDefault();
    
    // Small delay to let the spell check plugin detect the word first
    setTimeout(() => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsOpen(true);
    }, 50);
  }, []);

  // Handle clicking a suggestion
  const handleSuggestionClick = useCallback((suggestion: string) => {
    if (selectedWord) {
      replaceWord(selectedWord, suggestion);
    }
    setIsOpen(false);
  }, [selectedWord, replaceWord]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  const hasSpellingSuggestions = selectedWord && suggestions.length > 0;
  const isWordCorrect = selectedWord && suggestions.length === 0 && !isLoading;
  const showMenu = isOpen && (hasSpellingSuggestions || isLoading || error);

  return (
    <div ref={containerRef} onContextMenu={handleContextMenu} className="contents">
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

          {hasSpellingSuggestions && (
            <>
              {/* Header showing the misspelled word */}
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                <BookOpen className="h-3 w-3" />
                <span>ពាក្យមិនត្រឹមត្រូវ៖</span>
                <span className="font-medium text-destructive">{selectedWord}</span>
              </div>

              {/* Suggestions */}
              {suggestions.map((suggestion, index) => (
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

              {/* Add to dictionary option (future feature) */}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none",
                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    "transition-colors"
                  )}
                >
                  មិនអើពើ
                </button>
              </div>
            </>
          )}

          {isWordCorrect && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              ពាក្យត្រឹមត្រូវ
            </div>
          )}
        </div>
      )}
    </div>
  );
}
