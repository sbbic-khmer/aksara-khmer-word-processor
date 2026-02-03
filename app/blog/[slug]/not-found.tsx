import Link from 'next/link'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BlogPostNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <FileQuestion className="h-10 w-10 text-slate-400 dark:text-slate-500" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Post Not Found
        </h1>

        <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md">
          The blog post you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <Link href="/blog">
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
      </div>
    </div>
  )
}
