import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import { DEFAULT_STORAGE_LIMIT } from "@/lib/storage"

// GET - Get the global default storage limit
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const setting = await prisma.appSetting.findUnique({
      where: { key: "default_storage_limit_bytes" },
    })

    const bytes = Number(setting?.value || DEFAULT_STORAGE_LIMIT)

    return NextResponse.json({
      defaultLimitBytes: bytes,
      defaultLimitMB: Math.round(bytes / (1024 * 1024)),
    })
  } catch (error) {
    console.error("Error fetching default storage limit:", error)
    return NextResponse.json(
      { error: "Failed to fetch storage settings" },
      { status: 500 }
    )
  }
}

// PUT - Update the global default storage limit
export async function PUT(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { defaultLimitMB } = await request.json()

    if (typeof defaultLimitMB !== "number" || defaultLimitMB < 1) {
      return NextResponse.json(
        { error: "Invalid storage limit. Must be at least 1 MB." },
        { status: 400 }
      )
    }

    const bytes = defaultLimitMB * 1024 * 1024

    await prisma.appSetting.upsert({
      where: { key: "default_storage_limit_bytes" },
      update: { value: String(bytes) },
      create: { key: "default_storage_limit_bytes", value: String(bytes) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating default storage limit:", error)
    return NextResponse.json(
      { error: "Failed to update storage settings" },
      { status: 500 }
    )
  }
}
