'use client'

import { MDXRemote } from 'next-mdx-remote/rsc'
import Image from 'next/image'
import Link from 'next/link'

// Custom components for MDX with enhanced typography
const components = {
  // Enhanced image component with Next.js Image optimization
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    if (!src) return null

    // Handle relative paths
    const imageSrc = src.startsWith('/') ? src : `/blog/images/${src}`

    return (
      <figure className="my-10 -mx-4 sm:mx-0">
        <div className="relative overflow-hidden rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-slate-900/30">
          <Image
            src={imageSrc}
            alt={alt || ''}
            width={800}
            height={450}
            className="w-full"
            {...props}
          />
        </div>
        {alt && (
          <figcaption className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400 italic px-4">
            {alt}
          </figcaption>
        )}
      </figure>
    )
  },

  // Enhanced link component
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = href?.startsWith('http')

    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-700 underline-offset-2 hover:decoration-blue-500 dark:hover:decoration-blue-500 transition-colors"
          {...props}
        >
          {children}
        </a>
      )
    }

    return (
      <Link
        href={href || '#'}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-700 underline-offset-2 hover:decoration-blue-500 dark:hover:decoration-blue-500 transition-colors"
        {...props}
      >
        {children}
      </Link>
    )
  },

  // Enhanced code block styling
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <div className="my-8 -mx-4 sm:mx-0">
      <pre
        className="bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-2xl p-5 sm:p-6 overflow-x-auto text-sm leading-relaxed shadow-xl shadow-slate-900/20 dark:shadow-slate-900/40 border border-slate-800"
        {...props}
      >
        {children}
      </pre>
    </div>
  ),

  // Inline code styling
  code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
    // Check if this is inside a pre tag (code block)
    if (className?.includes('language-')) {
      return <code className={className} {...props}>{children}</code>
    }

    // Inline code
    return (
      <code
        className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono border border-blue-100 dark:border-blue-800/50"
        {...props}
      >
        {children}
      </code>
    )
  },

  // Enhanced blockquote styling
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-8 -mx-4 sm:mx-0 pl-6 pr-4 py-4 border-l-4 border-blue-500 dark:border-blue-400 bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-900/20 dark:to-transparent rounded-r-xl italic text-slate-700 dark:text-slate-300"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Enhanced heading styles
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-14 mb-5 scroll-mt-24 leading-tight"
      {...props}
    >
      {children}
    </h2>
  ),

  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 scroll-mt-24 leading-tight"
      {...props}
    >
      {children}
    </h3>
  ),

  h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3 scroll-mt-24"
      {...props}
    >
      {children}
    </h4>
  ),

  // Enhanced paragraph with better typography
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className="text-slate-600 dark:text-slate-300 leading-[1.8] my-5"
      {...props}
    >
      {children}
    </p>
  ),

  // Enhanced list styles
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-6 space-y-3 text-slate-600 dark:text-slate-300"
      {...props}
    >
      {children}
    </ul>
  ),

  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className="my-6 space-y-3 text-slate-600 dark:text-slate-300 list-decimal list-outside ml-5"
      {...props}
    >
      {children}
    </ol>
  ),

  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li
      className="leading-[1.8] pl-2 marker:text-blue-500 dark:marker:text-blue-400"
      {...props}
    >
      {children}
    </li>
  ),

  // Horizontal rule
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr
      className="my-12 border-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"
      {...props}
    />
  ),

  // Strong/bold
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-slate-900 dark:text-white" {...props}>
      {children}
    </strong>
  ),

  // Tables
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-8 -mx-4 sm:mx-0 overflow-x-auto">
      <table
        className="w-full text-left text-sm border-collapse"
        {...props}
      >
        {children}
      </table>
    </div>
  ),

  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
      {...props}
    >
      {children}
    </th>
  ),

  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300"
      {...props}
    >
      {children}
    </td>
  ),
}

interface PostContentProps {
  content: string
}

export function PostContent({ content }: PostContentProps) {
  return (
    <article className="blog-content">
      {/*
        Using custom components for full control over typography.
        The first-letter drop cap is handled via CSS below.
      */}
      <MDXRemote source={content} components={components} />

      {/* Drop cap styles */}
      <style jsx global>{`
        .blog-content > p:first-of-type::first-letter {
          float: left;
          font-size: 3.5em;
          line-height: 0.85;
          padding-right: 0.1em;
          padding-top: 0.05em;
          font-weight: 700;
          color: #2563eb;
        }

        @media (prefers-color-scheme: dark) {
          .blog-content > p:first-of-type::first-letter {
            color: #60a5fa;
          }
        }

        .dark .blog-content > p:first-of-type::first-letter {
          color: #60a5fa;
        }

        /* Smooth scrolling for anchor links */
        .blog-content {
          scroll-behavior: smooth;
        }

        /* Selection color */
        .blog-content ::selection {
          background-color: #dbeafe;
          color: #1e3a8a;
        }

        .dark .blog-content ::selection {
          background-color: #1e3a8a;
          color: #dbeafe;
        }

        /* Bullet list styling */
        .blog-content ul {
          list-style: none;
          padding-left: 0;
        }

        .blog-content ul li {
          position: relative;
          padding-left: 1.5rem;
        }

        .blog-content ul li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.75em;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
        }
      `}</style>
    </article>
  )
}
