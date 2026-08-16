// Returns Google Client ID to the client
// Using GOOGLE_CLIENT_ID (not NEXT_PUBLIC_) because server-side
// API routes read env vars at runtime, but NEXT_PUBLIC_ vars
// get inlined at build time

import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ clientId: "" }, { status: 200 })
  }
  return NextResponse.json({ clientId })
}
