// ============================================
// API: Logout — Clear HttpOnly cookie
// POST /api/auth/logout
//
// Clears the oec_token HttpOnly cookie and
// signals the client to clear local state.
// ============================================

import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true, message: "تم تسجيل الخروج" })

  // Clear the HttpOnly JWT cookie
  response.cookies.set("oec_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // Immediately expire
    path: "/",
  })

  return response
}
