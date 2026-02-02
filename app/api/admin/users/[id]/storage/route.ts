import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

// PATCH - Update a user's storage limit
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const { storageLimitBytes } = await request.json()

    if (typeof storageLimitBytes !== "number" || storageLimitBytes < 0) {
      return NextResponse.json(
        { error: "Invalid storage limit" },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id },
      data: { storageLimitBytes },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user storage limit:", error)
    return NextResponse.json(
      { error: "Failed to update storage limit" },
      { status: 500 }
    )
  }
}
