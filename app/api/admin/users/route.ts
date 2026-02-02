import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/auth-server"
import { DEFAULT_STORAGE_LIMIT } from "@/lib/storage"

// GET all users with their ad status and optionally storage info (admin only)
export async function GET(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const includeStorage = searchParams.get("includeStorage") === "true"

  try {
    if (includeStorage) {
      // Include storage usage calculation
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          showAds: true,
          storageLimitBytes: true,
          createdAt: true,
          documents: {
            select: {
              content: true,
              editorState: true,
            },
          },
        },
        orderBy: { email: "asc" },
      })

      // Calculate storage used for each user
      const result = users.map((user) => {
        const storageUsed = user.documents.reduce((acc, doc) => {
          const contentSize = Buffer.byteLength(doc.content || "", "utf8")
          const editorStateSize = Buffer.byteLength(
            JSON.stringify(doc.editorState) || "",
            "utf8"
          )
          return acc + contentSize + editorStateSize
        }, 0)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          show_ads: user.showAds,
          storage_limit_bytes: user.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT,
          storage_used: storageUsed,
          created_at: user.createdAt,
        }
      })

      return NextResponse.json({ users: result })
    }

    // Standard query without storage
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        showAds: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Map to expected format
    const result = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      show_ads: user.showAds,
      created_at: user.createdAt,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
