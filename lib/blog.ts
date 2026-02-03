import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'

const BLOG_DIRECTORY = path.join(process.cwd(), 'content/blog')
const WORDS_PER_MINUTE = 200

export interface BlogPost {
  slug: string
  title: string
  date: string
  description: string
  author?: string
  image?: string
  content: string
  readingTime: string
}

export interface BlogPostFrontmatter {
  title: string
  date: string
  description: string
  author?: string
  image?: string
}

/**
 * Calculate reading time based on word count
 * @param content - The text content to analyze
 * @returns Formatted reading time string (e.g., "3 min read")
 */
export function calculateReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / WORDS_PER_MINUTE)
  return `${minutes} min read`
}

/**
 * Get all blog posts sorted by date (newest first)
 * @returns Array of blog posts with metadata and content
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  // Ensure directory exists
  if (!fs.existsSync(BLOG_DIRECTORY)) {
    return []
  }

  const files = fs.readdirSync(BLOG_DIRECTORY)
  const markdownFiles = files.filter((file) => file.endsWith('.md'))

  const posts: BlogPost[] = markdownFiles
    .map((filename) => {
      const slug = filename.replace(/\.md$/, '')
      const filePath = path.join(BLOG_DIRECTORY, filename)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(fileContents)

      const frontmatter = data as BlogPostFrontmatter

      // Skip files without required frontmatter
      if (!frontmatter.title || !frontmatter.date || !frontmatter.description) {
        console.warn(`Skipping ${filename}: missing required frontmatter`)
        return null
      }

      return {
        slug,
        title: frontmatter.title,
        date: frontmatter.date,
        description: frontmatter.description,
        author: frontmatter.author,
        image: frontmatter.image,
        content,
        readingTime: calculateReadingTime(content),
      }
    })
    .filter((post): post is BlogPost => post !== null)

  // Sort by date descending (newest first)
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Get a single blog post by slug
 * @param slug - The URL slug of the post (filename without .md)
 * @returns The blog post or null if not found
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const filePath = path.join(BLOG_DIRECTORY, `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)

  const frontmatter = data as BlogPostFrontmatter

  // Validate required frontmatter
  if (!frontmatter.title || !frontmatter.date || !frontmatter.description) {
    console.warn(`Post ${slug}: missing required frontmatter`)
    return null
  }

  return {
    slug,
    title: frontmatter.title,
    date: frontmatter.date,
    description: frontmatter.description,
    author: frontmatter.author,
    image: frontmatter.image,
    content,
    readingTime: calculateReadingTime(content),
  }
}

/**
 * Get paginated posts
 * @param page - Page number (1-indexed)
 * @param postsPerPage - Number of posts per page
 * @returns Object containing posts for the page and pagination info
 */
export async function getPaginatedPosts(
  page: number = 1,
  postsPerPage: number = 10
): Promise<{
  posts: BlogPost[]
  totalPosts: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}> {
  const allPosts = await getAllPosts()
  const totalPosts = allPosts.length
  const totalPages = Math.ceil(totalPosts / postsPerPage)
  const currentPage = Math.max(1, Math.min(page, totalPages || 1))

  const startIndex = (currentPage - 1) * postsPerPage
  const posts = allPosts.slice(startIndex, startIndex + postsPerPage)

  return {
    posts,
    totalPosts,
    totalPages,
    currentPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  }
}

/**
 * Get all post slugs for static generation
 * @returns Array of slug strings
 */
export async function getAllPostSlugs(): Promise<string[]> {
  const posts = await getAllPosts()
  return posts.map((post) => post.slug)
}
