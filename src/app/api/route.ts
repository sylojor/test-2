import { NextResponse } from "next/server";
import { isLLMConnected, getLLMStatus } from "@/lib/llm-service";

export async function GET() {
  try {
    const llmStatus = getLLMStatus();
    return NextResponse.json({
      status: "ok",
      service: "One Employer Company",
      llm: {
        provider: llmStatus.provider,
        connected: llmStatus.connected,
        label: llmStatus.providerLabel,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: "degraded",
      service: "One Employer Company",
      error: "Health check partial failure",
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }
}