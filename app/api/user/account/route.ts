import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"

/**
 * DELETE /api/user/account
 *
 * Permanently deletes the user's account and all associated data.
 * Fulfills GDPR Article 17 (right to erasure).
 *
 * Requires confirmation string "DELETE" in the request body.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate the confirmation
    const body = await request.json()
    const { confirmation } = body

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Invalid confirmation. Please type DELETE to confirm." },
        { status: 400 }
      )
    }

    // Delete the user - Prisma cascade will handle all related data:
    // - Sessions
    // - Accounts
    // - Documents
    // - UserPreference
    // - UserDictionaryWord
    // - UserIgnoredDictionaryWord
    // - SpellCheckAddedWord
    // - SpellCheckIgnoredWord
    // - UserReplacement
    await prisma.user.delete({
      where: { id: user.id },
    })

    // Return success - the client will handle sign out and redirect
    // since the session is now invalid (user deleted)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user account:", error)
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 }
    )
  }
}
