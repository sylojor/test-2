"use client"

import { useEffect } from "react"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[GLOBAL_ERROR]", error)
  }, [error])

  return (
    <html lang="ar" dir="ltr">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "24rem" }}>
          <div style={{ fontSize: "3rem", fontWeight: 700, color: "#ef4444", opacity: 0.8 }}>!</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "1.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#888", marginTop: "1rem", fontSize: "0.875rem", lineHeight: "1.5" }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              backgroundColor: "#0d9488",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              minHeight: "44px",
            }}
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  )
}
