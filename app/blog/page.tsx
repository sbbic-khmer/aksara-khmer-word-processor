import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, Sparkles } from 'lucide-react'
import { getPaginatedPosts } from '@/lib/blog'
import { PostCard, FeaturedPostCard } from '@/components/blog/post-card'
import { Button } from '@/components/ui/button'
import { ScrollAnimate, ParallaxLayer, GlowOrb, TextReveal, MagneticButton } from '@/components/ui/scroll-animate'

export const metadata: Metadata = {
  title: 'Blog | Aksara Pro',
  description: 'Tutorials, tips, and insights about Khmer language and Aksara Pro',
  openGraph: {
    title: 'Blog | Aksara Pro',
    description: 'Tutorials, tips, and insights about Khmer language and Aksara Pro',
    type: 'website',
  },
}

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const { posts, totalPages, currentPage, hasNextPage, hasPrevPage } = await getPaginatedPosts(page, 10)

  // Separate featured post (first post on page 1)
  const featuredPost = page === 1 && posts.length > 0 ? posts[0] : null
  const regularPosts = page === 1 && featuredPost ? posts.slice(1) : posts

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
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                Sign In
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

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 sm:pt-40 pb-16 sm:pb-24">
        {/* Parallax background orbs */}
        <ParallaxLayer depth={0.2} maxOffset={40} className="absolute inset-0 pointer-events-none">
          <GlowOrb
            color="blue"
            size="lg"
            intensity="medium"
            floatAmplitude={20}
            floatDuration={12}
            className="top-[-100px] left-[5%]"
          />
        </ParallaxLayer>
        <ParallaxLayer depth={0.3} maxOffset={50} className="absolute inset-0 pointer-events-none">
          <GlowOrb
            color="indigo"
            size="md"
            intensity="subtle"
            floatAmplitude={25}
            floatDuration={15}
            className="top-20 right-[10%]"
          />
        </ParallaxLayer>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          {/* Page Header */}
          <div className="text-center mb-16">
            <ScrollAnimate variant="hero-badge" delay={0} duration={700}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/90 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-300 text-sm font-medium mb-6 border border-blue-200/60 dark:border-blue-700/50 shadow-lg shadow-blue-500/15">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Aksara Pro Blog
              </div>
            </ScrollAnimate>

            <ScrollAnimate variant="hero-title" delay={100} duration={1000}>
              <TextReveal
                text="Tutorials & Insights"
                className="text-4xl sm:text-6xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight"
                wordDelay={100}
                initialDelay={200}
                duration={700}
                as="h1"
              />
            </ScrollAnimate>

            <ScrollAnimate variant="zoom-blur" delay={500} duration={700}>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Learn about Khmer language, typography, and how to get the most out of Aksara Pro.
              </p>
            </ScrollAnimate>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          {posts.length > 0 ? (
            <>
              {/* Featured Post */}
              {featuredPost && (
                <ScrollAnimate variant="zoom-blur" delay={0} duration={700}>
                  <div className="mb-12">
                    <FeaturedPostCard
                      slug={featuredPost.slug}
                      title={featuredPost.title}
                      date={featuredPost.date}
                      description={featuredPost.description}
                      readingTime={featuredPost.readingTime}
                      image={featuredPost.image}
                    />
                  </div>
                </ScrollAnimate>
              )}

              {/* Section divider */}
              {regularPosts.length > 0 && (
                <ScrollAnimate variant="fade-up" delay={100} duration={500}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 px-4">
                      {page === 1 ? 'More Articles' : `Page ${page}`}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
                  </div>
                </ScrollAnimate>
              )}

              {/* Posts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {regularPosts.map((post, index) => (
                  <ScrollAnimate key={post.slug} variant="zoom-blur" delay={index * 80} duration={600}>
                    <PostCard
                      slug={post.slug}
                      title={post.title}
                      date={post.date}
                      description={post.description}
                      readingTime={post.readingTime}
                      image={post.image}
                    />
                  </ScrollAnimate>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <ScrollAnimate variant="fade-up" delay={200} duration={500}>
                  <nav className="flex items-center justify-center gap-4" aria-label="Pagination">
                    {hasPrevPage ? (
                      <MagneticButton strength={0.15}>
                        <Link
                          href={`/blog?page=${currentPage - 1}`}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Previous
                        </Link>
                      </MagneticButton>
                    ) : (
                      <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-400 dark:text-slate-500 cursor-not-allowed">
                        <ArrowLeft className="h-4 w-4" />
                        Previous
                      </span>
                    )}

                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>

                    {hasNextPage ? (
                      <MagneticButton strength={0.15}>
                        <Link
                          href={`/blog?page=${currentPage + 1}`}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
                        >
                          Next
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </MagneticButton>
                    ) : (
                      <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-400 dark:text-slate-500 cursor-not-allowed">
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </nav>
                </ScrollAnimate>
              )}
            </>
          ) : (
            /* Empty State */
            <ScrollAnimate variant="scale" delay={0} duration={700}>
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-lg">
                  <BookOpen className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  No posts yet
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                  We&apos;re working on some great content. Check back soon!
                </p>
                <MagneticButton strength={0.2}>
                  <Link href="/">
                    <Button variant="outline" className="gap-2 cursor-pointer px-6 py-5 rounded-xl">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Home
                    </Button>
                  </Link>
                </MagneticButton>
              </div>
            </ScrollAnimate>
          )}
        </div>
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
