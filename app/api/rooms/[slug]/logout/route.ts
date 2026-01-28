import { NextRequest, NextResponse } from "next/server"
import { successResponse } from "@/lib/apiResponse"
import { clearRoomSessionCookie } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const response = NextResponse.json(successResponse({ ok: true }))
  clearRoomSessionCookie(response)
  return response
}
