'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MagneticButton } from '@/components/ui/scroll-animate'

interface PostCardProps {
  slug: string
  title: string
  date: string
  description: string
  readingTime: string
  image?: string
  className?: string
}

export function PostCard({
  slug,
  title,
  date,
  description,
  readingTime,
  image,
  className,
}: PostCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <MagneticButton strength={0.08} className="block h-full">
      <Link
        href={`/blog/${slug}`}
        className={cn(
          'group block h-full rounded-2xl bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm',
          'border border-slate-200/80 dark:border-slate-700/50',
          'shadow-sm hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5',
          'transition-all duration-300 ease-out',
          'hover:border-blue-200 dark:hover:border-blue-800/50',
          'overflow-hidden cursor-pointer',
          className
        )}
      >
        {/* Cover Image */}
        {image && (
          <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700/50 dark:to-slate-800/50">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Reading time badge */}
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-xs font-medium text-slate-600 dark:text-slate-300 shadow-lg">
              {readingTime}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formattedDate}
            </span>
            {!image && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {readingTime}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {title}
          </h2>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {description}
          </p>

          {/* Read more indicator */}
          <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm">
            <span className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
              Read article
            </span>
            <ArrowRight className="h-4 w-4 -translate-x-6 group-hover:translate-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300" />
          </div>
        </div>
      </Link>
    </MagneticButton>
  )
}

/**
 * FeaturedPostCard - Large hero-style card for the featured/latest post
 */
export function FeaturedPostCard({
  slug,
  title,
  date,
  description,
  readingTime,
  image,
  className,
}: PostCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <MagneticButton strength={0.05} className="block">
      <Link
        href={`/blog/${slug}`}
        className={cn(
          'group block rounded-3xl overflow-hidden cursor-pointer',
          'bg-gradient-to-br from-blue-50/90 to-indigo-50/90 dark:from-blue-950/50 dark:to-indigo-950/50',
          'border border-blue-100/80 dark:border-blue-900/40',
          'shadow-lg hover:shadow-2xl hover:shadow-blue-500/15 dark:hover:shadow-blue-500/10',
          'transition-all duration-500 ease-out',
          'hover:border-blue-200 dark:hover:border-blue-800/50',
          className
        )}
      >
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px] overflow-hidden">
            {image ? (
              <>
                <Image
                  src={image}
                  alt={title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent md:bg-gradient-to-l" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                <span className="text-8xl text-white/20 font-bold">អ</span>
              </div>
            )}

            {/* Featured badge */}
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-600/30">
              Featured
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 md:p-10 flex flex-col justify-center">
            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {readingTime}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
              {title}
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3">
              {description}
            </p>

            {/* Read more button */}
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
              <span>Read full article</span>
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-2" />
            </div>
          </div>
        </div>
      </Link>
    </MagneticButton>
  )
}
