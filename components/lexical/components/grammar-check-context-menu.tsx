'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGrammarCheck } from '../contexts/grammar-check-context';
import { cn } from '@/lib/utils';
import { BookCheck, ArrowRight } from 'lucide-react';

interface GrammarCheckContextMenuProps {
    children: React.ReactNode;
}

interface MenuPosition {
    x: number;
    y: number;
}

export function GrammarCheckContextMenu({ children }: GrammarCheckContextMenuProps) {
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

    // Handle right-click
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        
        // Only show grammar menu if clicking on a grammar-marked word
        if (!target.classList.contains('grammar-nonstandard')) {
            return;
        }
        
        e.preventDefault();
        setPosition({ x: e.clientX, y: e.clientY });
        setIsOpen(true);
    }, []);

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
        <div ref={containerRef} onContextMenu={handleContextMenu} className="contents">
            {children}

            {showMenu && (
                <div
                    ref={menuRef}
                    className={cn(
                        "fixed z-50 min-w-[220px] overflow-hidden rounded-md border bg-popover p-1 shadow-lg",
                        "animate-in fade-in-0 zoom-in-95",
                        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                    )}
                    style={{
                        left: position.x,
                        top: position.y,
                        fontFamily: '"Noto Sans Khmer", sans-serif',
                    }}
                >
                    {/* Header explaining the issue */}
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                        <BookCheck className="h-3 w-3 text-blue-500" />
                        <span>អក្ខរាវិរុទ្ធមិនស្តង់ដារ</span>
                    </div>

                    {/* Current word and suggested standardized spelling */}
                    <div className="px-2 py-2 text-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-blue-600 font-medium">{selectedWord}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-green-600 font-medium">{standardizedSpelling}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                            សូមប្រើអក្ខរាវិរុទ្ធស្តង់ដារដើម្បីភាពស៊ីសង្វាក់
                        </p>
                    </div>

                    {/* Action button */}
                    <button
                        onClick={handleSuggestionClick}
                        className={cn(
                            "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                            "bg-blue-50 text-blue-700 hover:bg-blue-100",
                            "dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50",
                            "transition-colors"
                        )}
                        style={{
                            fontFamily: '"Noto Sans Khmer", sans-serif',
                        }}
                    >
                        <BookCheck className="h-4 w-4 mr-2" />
                        ប្រើ "{standardizedSpelling}"
                    </button>

                    {/* Alternative spellings info (optional) */}
                    {alternativeSpellings.length > 1 && (
                        <div className="border-t border-border mt-1 pt-1 px-2 py-1">
                            <p className="text-xs text-muted-foreground">
                                អក្ខរាវិរុទ្ធផ្សេងទៀត៖ {alternativeSpellings.filter(a => a !== selectedWord).join(', ')}
                            </p>
                        </div>
                    )}

                    {/* Ignore button */}
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
                </div>
            )}
        </div>
    );
}
