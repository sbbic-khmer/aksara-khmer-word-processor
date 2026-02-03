import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Calendar, Clock, User, BookOpen } from 'lucide-react'
import { getPostBySlug, getAllPostSlugs } from '@/lib/blog'
import { PostContent } from '@/components/blog/post-content'
import { ShareButton } from '@/components/blog/share-button'
import { Button } from '@/components/ui/button'
import { ScrollAnimate, ParallaxLayer, GlowOrb, MagneticButton } from '@/components/ui/scroll-animate'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found | Aksara Pro Blog',
    }
  }

  return {
    title: `${post.title} | Aksara Pro Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      images: post.image ? [post.image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="fixed top-4 left-4 right-4 z-50">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-900/5 dark:shadow-slate-900/30">
          <Link href="/" className="flex items-center gap-2 group">
            {/* Logo icon */}
            <div className="relative w-10 h-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
              <div className="absolute inset-[1px] rounded-[10px] border border-white/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-2xl font-bold leading-none translate-y-[-2px] translate-x-[1px]">អ</span>
              </div>
            </div>

            {/* Logo text */}
            <div className="flex items-baseline">
              <span
                className="text-xl sm:text-2xl text-slate-900 dark:text-white leading-none"
                style={{ fontFamily: 'var(--font-moul), serif' }}
              >
                អក្សរា
              </span>
              <span
                className="ml-[4px] text-base sm:text-2xl text-slate-900 dark:text-white leading-none font-medium"
                style={{ fontFamily: 'var(--font-geist-sans), sans' }}
              >
                Pro
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/blog">
              <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Blog</span>
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 cursor-pointer">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section with Cover Image */}
      <section className="relative pt-24 sm:pt-28">
        {/* Parallax background */}
        <ParallaxLayer depth={0.15} maxOffset={30} className="absolute inset-0 pointer-events-none">
          <GlowOrb
            color="blue"
            size="lg"
            intensity="subtle"
            floatAmplitude={15}
            floatDuration={12}
            className="top-[-50px] left-[10%]"
          />
        </ParallaxLayer>
        <ParallaxLayer depth={0.2} maxOffset={40} className="absolute inset-0 pointer-events-none">
          <GlowOrb
            color="indigo"
            size="md"
            intensity="subtle"
            floatAmplitude={20}
            floatDuration={15}
            className="top-40 right-[5%]"
          />
        </ParallaxLayer>

        {/* Cover Image */}
        {post.image && (
          <ScrollAnimate variant="zoom-blur" delay={0} duration={800}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8">
              <div className="relative aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20 dark:shadow-slate-900/40">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
              </div>
            </div>
          </ScrollAnimate>
        )}
      </section>

      {/* Main Content */}
      <main className="pb-24 px-4">
        <article className="max-w-3xl mx-auto">
          {/* Back Link */}
          <ScrollAnimate variant="fade-left" delay={100} duration={500}>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-8 group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to all posts
            </Link>
          </ScrollAnimate>

          {/* Post Header */}
          <header className="mb-12">
            <ScrollAnimate variant="hero-title" delay={200} duration={900}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-[1.15] tracking-tight">
                {post.title}
              </h1>
            </ScrollAnimate>

            <ScrollAnimate variant="zoom-blur" delay={400} duration={700}>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                {post.description}
              </p>
            </ScrollAnimate>

            {/* Meta Bar */}
            <ScrollAnimate variant="fade-up" delay={500} duration={600}>
              <div className="flex flex-wrap items-center justify-between gap-4 py-6 border-y border-slate-200/80 dark:border-slate-700/50">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    {post.readingTime}
                  </span>
                  {post.author && (
                    <span className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      {post.author}
                    </span>
                  )}
                </div>

                {/* Share button */}
                <ShareButton title={post.title} description={post.description} />
              </div>
            </ScrollAnimate>
          </header>

          {/* Post Content */}
          <ScrollAnimate variant="fade-up" delay={600} duration={700}>
            <PostContent content={post.content} />
          </ScrollAnimate>

          {/* Post Footer */}
          <ScrollAnimate variant="fade-up" delay={200} duration={500}>
            <footer className="mt-16 pt-10 border-t border-slate-200/80 dark:border-slate-700/50">
              {/* CTA Card */}
              <div className="rounded-3xl bg-gradient-to-br from-blue-50/90 to-indigo-50/90 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-100/80 dark:border-blue-900/40 p-8 sm:p-10 mb-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/25 shrink-0">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Ready to write beautiful Khmer?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Experience intelligent word breaking, spell checking, and more with Aksara Pro.
                    </p>
                  </div>
                  <MagneticButton strength={0.2}>
                    <Link href="/signup">
                      <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 cursor-pointer whitespace-nowrap">
                        Try Aksara Pro
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </MagneticButton>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <MagneticButton strength={0.15}>
                  <Link
                    href="/blog"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to all posts
                  </Link>
                </MagneticButton>
              </div>
            </footer>
          </ScrollAnimate>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 dark:border-slate-800/50 py-12 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3 group transition-transform duration-200 hover:scale-105">
              {/* Logo icon */}
              <div className="relative w-8 h-8 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md shadow-blue-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-lg font-bold leading-none">អ</span>
                </div>
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                &copy; {new Date().getFullYear()} Aksara Pro
              </span>
            </Link>

            <nav className="flex items-center gap-8">
              <Link
                href="/"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-colors"
              >
                Home
              </Link>
              <Link
                href="/blog"
                className="text-slate-900 dark:text-white font-medium text-sm"
              >
                Blog
              </Link>
              <Link href="/signup">
                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                  Try Free
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
