'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useGrammarCheck } from '../contexts/grammar-check-context';
import { cn } from '@/lib/utils';
import { BookCheck, EyeOff } from 'lucide-react';

interface GrammarCheckContextMenuProps {
    children: React.ReactNode;
}

interface MenuPosition {
    x: number;
    y: number;
}

export function GrammarCheckContextMenu({ children }: GrammarCheckContextMenuProps) {
    const t = useTranslations('editor.contextMenu.grammarCheck');
    const {
        selectedWord,
        standardizedSpelling,
        alternativeSpellings,
        replaceWord,
        isLoading,
        error,
        grammarCheckEnabled,
    } = useGrammarCheck();
    
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Handle right-click
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        
        // Only show grammar menu if clicking on a grammar-marked word
        const grammarElement = target.classList?.contains('grammar-nonstandard')
            ? target
            : target.closest?.('.grammar-nonstandard') as HTMLElement | null;
            
        if (!grammarElement) {
            return;
        }
        
        e.preventDefault();
        setPosition({ x: e.clientX, y: e.clientY });
        setIsOpen(true);
    }, []);

    // Handle click/tap on grammar-marked word (for mobile support)
    const handleClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const grammarElement = target.classList?.contains('grammar-nonstandard')
            ? target
            : target.closest?.('.grammar-nonstandard') as HTMLElement | null;
        
        if (!grammarElement) {
            // Clicking elsewhere - close the menu if open
            if (isOpen) {
                setIsOpen(false);
            }
            return;
        }
        
        // Clicked on a grammar-marked word - show the context menu
        // Get the bounding rect of the word for positioning
        const rect = grammarElement.getBoundingClientRect();
        
        // Position the menu below the word
        setPosition({ 
            x: rect.left, 
            y: rect.bottom + 4 
        });
        setIsOpen(true);
        
        // Prevent default to avoid moving cursor
        e.preventDefault();
        e.stopPropagation();
    }, [isOpen]);

    // Handle clicking the suggestion
    const handleSuggestionClick = useCallback(() => {
        if (selectedWord && standardizedSpelling) {
            replaceWord(selectedWord, standardizedSpelling);
        }
        setIsOpen(false);
    }, [selectedWord, standardizedSpelling, replaceWord]);

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

            if (position.x + rect.width > viewportWidth - 10) {
                newX = viewportWidth - rect.width - 10;
            }

            if (position.y + rect.height > viewportHeight - 10) {
                newY = position.y - rect.height;
            }

            if (newX !== position.x || newY !== position.y) {
                setPosition({ x: newX, y: newY });
            }
        }
    }, [isOpen, position]);

    const hasNonStandardWord = !!selectedWord && !!standardizedSpelling;
    const showMenu = isOpen && grammarCheckEnabled && hasNonStandardWord;

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
                        "fixed z-50 min-w-[200px] overflow-hidden rounded-lg border border-sky-200 dark:border-sky-800/50 bg-popover/95 backdrop-blur-sm p-1.5 shadow-xl shadow-sky-500/10",
                        "animate-in fade-in-0 zoom-in-95 duration-150",
                        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                    )}
                    style={{
                        left: position.x,
                        top: position.y,
                        fontFamily: '"Noto Sans Khmer", sans-serif',
                    }}
                >
                    {/* Header showing the non-standard word */}
                    <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground border-b border-sky-100 dark:border-sky-900/50 mb-1.5 bg-sky-50/50 dark:bg-sky-950/20 -mx-1.5 -mt-1.5 rounded-t-lg">
                        <BookCheck className="h-3.5 w-3.5 text-sky-500" />
                        <span>{t('nonStandardSpelling')}</span>
                        <span className="font-semibold text-sky-600 dark:text-sky-400">{selectedWord}</span>
                    </div>

                    {/* Suggestion button */}
                    <button
                        onClick={handleSuggestionClick}
                        className={cn(
                            "relative flex w-full cursor-pointer select-none items-center rounded-md px-2.5 py-2 text-sm outline-none",
                            "hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-300",
                            "focus:bg-sky-50 dark:focus:bg-sky-950/40 focus:text-sky-700 dark:focus:text-sky-300",
                            "focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1",
                            "transition-colors duration-150"
                        )}
                        style={{
                            fontFamily: '"Noto Sans Khmer", sans-serif',
                        }}
                    >
                        {standardizedSpelling}
                    </button>

                    {/* Ignore button */}
                    <div className="border-t border-border mt-1.5 pt-1.5">
                        <button
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-xs outline-none",
                                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                "focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1",
                                "transition-colors duration-150"
                            )}
                        >
                            <EyeOff className="h-3 w-3" />
                            {t('ignore')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
