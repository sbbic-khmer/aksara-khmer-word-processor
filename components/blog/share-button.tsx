'use client'

import { Share2 } from 'lucide-react'

interface ShareButtonProps {
  title: string
  description: string
}

export function ShareButton({ title, description }: ShareButtonProps) {
  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title,
        text: description,
        url: window.location.href,
      })
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <button
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium cursor-pointer"
      onClick={handleShare}
    >
      <Share2 className="h-4 w-4" />
      Share
    </button>
  )
}
