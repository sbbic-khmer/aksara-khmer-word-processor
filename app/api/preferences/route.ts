import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"

// Disable all caching for this route
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// GET user preferences
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // First try to find existing preferences
    let preferences = await prisma.userPreference.findUnique({
      where: { userId: user.id },
    })

    if (!preferences) {
      preferences = await prisma.userPreference.create({
        data: { userId: user.id },
      })
    }

    return NextResponse.json({
      user_id: preferences.userId,
      vad_silence_threshold: preferences.vadSilenceThreshold,
      vad_threshold: preferences.vadThreshold,
      preferred_mic_device_id: preferences.preferredMicDeviceId,
      show_breaks: preferences.showBreaks,
      theme: preferences.theme,
      stt_provider: preferences.sttProvider,
      last_opened_document_id: preferences.lastOpenedDocumentId,
      locale: preferences.locale,
      has_seen_data_notice: preferences.hasSeenDataNotice,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error("Error fetching preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    )
  }
}

// PUT update user preferences
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      vad_silence_threshold,
      vad_threshold,
      preferred_mic_device_id,
      show_breaks,
      theme,
      stt_provider,
      last_opened_document_id,
      locale,
      has_seen_data_notice,
    } = body

    // Validate locale
    const validLocales = ['en', 'km']
    if (locale !== undefined && !validLocales.includes(locale)) {
      return NextResponse.json(
        { error: "locale must be 'en' or 'km'" },
        { status: 400 }
      )
    }

    // Validate numeric ranges
    if (vad_silence_threshold !== undefined) {
      const value = parseFloat(vad_silence_threshold)
      if (isNaN(value) || value < 0 || value > 10) {
        return NextResponse.json(
          { error: "vad_silence_threshold must be between 0 and 10" },
          { status: 400 }
        )
      }
    }

    if (vad_threshold !== undefined) {
      const value = parseFloat(vad_threshold)
      if (isNaN(value) || value < 0 || value > 1) {
        return NextResponse.json(
          { error: "vad_threshold must be between 0 and 1" },
          { status: 400 }
        )
      }
    }

    const preferences = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        ...(vad_silence_threshold !== undefined && {
          vadSilenceThreshold: vad_silence_threshold,
        }),
        ...(vad_threshold !== undefined && { vadThreshold: vad_threshold }),
        ...(preferred_mic_device_id !== undefined && {
          preferredMicDeviceId: preferred_mic_device_id,
        }),
        ...(show_breaks !== undefined && { showBreaks: show_breaks }),
        ...(theme !== undefined && { theme }),
        ...(stt_provider !== undefined && { sttProvider: stt_provider }),
        ...(last_opened_document_id !== undefined && {
          lastOpenedDocumentId: last_opened_document_id,
        }),
        ...(locale !== undefined && { locale }),
        ...(has_seen_data_notice !== undefined && {
          hasSeenDataNotice: has_seen_data_notice,
        }),
      },
      create: {
        userId: user.id,
        vadSilenceThreshold: vad_silence_threshold ?? 1.0,
        vadThreshold: vad_threshold ?? 0.4,
        preferredMicDeviceId: preferred_mic_device_id ?? null,
        showBreaks: show_breaks ?? true,
        theme: theme ?? "light",
        sttProvider: stt_provider ?? "browser",
        lastOpenedDocumentId: last_opened_document_id ?? null,
        locale: locale ?? "en",
        hasSeenDataNotice: has_seen_data_notice ?? false,
      },
    })

    return NextResponse.json({
      user_id: preferences.userId,
      vad_silence_threshold: preferences.vadSilenceThreshold,
      vad_threshold: preferences.vadThreshold,
      preferred_mic_device_id: preferences.preferredMicDeviceId,
      show_breaks: preferences.showBreaks,
      theme: preferences.theme,
      stt_provider: preferences.sttProvider,
      last_opened_document_id: preferences.lastOpenedDocumentId,
      locale: preferences.locale,
      has_seen_data_notice: preferences.hasSeenDataNotice,
    })
  } catch (error) {
    console.error("Error updating preferences:", error)
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    )
  }
}
