#!/usr/bin/env python3
"""Create API routes for employee access tokens"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()

# Create the tokens API route
tokens_route_path = "/home/ubuntu/blivoai-demo/src/app/api/employees/[id]/tokens/route.ts"
tokens_content = '''// ============================================
// API: Employee Access Tokens
// GET  — List tokens for an employee
// POST — Add a new token
// PATCH — Update a token
// DELETE — Remove a token
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const tokens = await db.employeeAccessToken.findMany({
      where: { employeeId: id },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    })
    
    // Mask access tokens for security (show last 4 chars)
    const masked = tokens.map(t => ({
      ...t,
      accessToken: t.accessToken.length > 8 
        ? "****" + t.accessToken.slice(-4)
        : "****",
    }))
    
    return NextResponse.json({ tokens: masked })
  } catch (error) {
    console.error("[GET_EMPLOYEE_TOKENS_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء جلب التوكنات" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const body = await request.json()
    const { platform, accessToken, refreshToken, scopes, platformUserId, platformName, metadata } = body
    
    if (!platform || !accessToken) {
      return NextResponse.json({ error: "المنصة والتوكن مطلوبين" }, { status: 400 })
    }
    
    // Check if employee exists
    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }
    
    // Create or update token (unique per employee+platform)
    const token = await db.employeeAccessToken.upsert({
      where: { employeeId_platform: { employeeId: id, platform } },
      create: {
        employeeId: id,
        platform,
        accessToken,
        refreshToken: refreshToken || null,
        scopes: scopes ? JSON.stringify(scopes) : null,
        platformUserId: platformUserId || null,
        platformName: platformName || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        isActive: true,
      },
      update: {
        accessToken,
        refreshToken: refreshToken || null,
        scopes: scopes ? JSON.stringify(scopes) : null,
        platformUserId: platformUserId || null,
        platformName: platformName || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        isActive: true,
      },
    })
    
    return NextResponse.json({ 
      token: { ...token, accessToken: "****" + token.accessToken.slice(-4) },
      message: "تم إضافة التوكن بنجاح" 
    })
  } catch (error) {
    console.error("[ADD_EMPLOYEE_TOKEN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة التوكن" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const body = await request.json()
    const { tokenId, isActive, scopes, metadata, refreshToken } = body
    
    if (!tokenId) {
      return NextResponse.json({ error: "معرف التوكن مطلوب" }, { status: 400 })
    }
    
    const updates: Record<string, unknown> = {}
    if (isActive !== undefined) updates.isActive = isActive
    if (scopes) updates.scopes = JSON.stringify(scopes)
    if (metadata) updates.metadata = JSON.stringify(metadata)
    if (refreshToken) updates.refreshToken = refreshToken
    
    const token = await db.employeeAccessToken.update({
      where: { id: tokenId },
      data: updates,
    })
    
    return NextResponse.json({ 
      token: { ...token, accessToken: "****" + token.accessToken.slice(-4) },
      message: "تم تحديث التوكن" 
    })
  } catch (error) {
    console.error("[UPDATE_EMPLOYEE_TOKEN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث التوكن" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get("tokenId")
    
    if (!tokenId) {
      return NextResponse.json({ error: "معرف التوكن مطلوب" }, { status: 400 })
    }
    
    await db.employeeAccessToken.delete({ where: { id: tokenId } })
    return NextResponse.json({ message: "تم حذف التوكن" })
  } catch (error) {
    console.error("[DELETE_EMPLOYEE_TOKEN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء حذف التوكن" }, { status: 500 })
  }
}
'''

# Create directory structure
client.exec_command("mkdir -p /home/ubuntu/blivoai-demo/src/app/api/employees/[id]/tokens")
client.exec_command("mkdir -p /home/ubuntu/blivoai-demo/src/app/api/employees/[id]/model-routing")

with sftp.open(tokens_route_path, "w") as f:
    f.write(tokens_content.encode())
print("tokens/route.ts created!")

# Create model routing API route
routing_route_path = "/home/ubuntu/blivoai-demo/src/app/api/employees/[id]/model-routing/route.ts"
routing_content = '''// ============================================
// API: Employee Model Routing
// GET  — List model routings for an employee
// POST — Add/Update a model routing for a task type
// DELETE — Remove a model routing
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const routings = await db.employeeModelRouting.findMany({
      where: { employeeId: id },
      include: { llmModel: true },
      orderBy: [{ priority: "asc" }],
    })
    
    return NextResponse.json({ routings })
  } catch (error) {
    console.error("[GET_MODEL_ROUTINGS_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const body = await request.json()
    const { taskType, llmModelId, priority } = body
    
    if (!taskType) {
      return NextResponse.json({ error: "نوع المهمة مطلوب" }, { status: 400 })
    }
    
    // Upsert: one routing per employee per task type
    const routing = await db.employeeModelRouting.upsert({
      where: { employeeId_taskType: { employeeId: id, taskType } },
      create: {
        employeeId: id,
        taskType,
        llmModelId: llmModelId || null,
        priority: priority || 5,
        isActive: true,
      },
      update: {
        llmModelId: llmModelId || null,
        priority: priority || 5,
        isActive: true,
      },
    })
    
    return NextResponse.json({ routing, message: "تم تحديث توجيه الموديل" })
  } catch (error) {
    console.error("[ADD_MODEL_ROUTING_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const { searchParams } = new URL(request.url)
    const routingId = searchParams.get("routingId")
    
    if (!routingId) {
      return NextResponse.json({ error: "معرف التوجيه مطلوب" }, { status: 400 })
    }
    
    await db.employeeModelRouting.delete({ where: { id: routingId } })
    return NextResponse.json({ message: "تم حذف توجيه الموديل" })
  } catch (error) {
    console.error("[DELETE_MODEL_ROUTING_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
'''

with sftp.open(routing_route_path, "w") as f:
    f.write(routing_content.encode())
print("model-routing/route.ts created!")

# Create token inheritance utility
inheritance_path = "/home/ubuntu/blivoai-demo/src/lib/token-inheritance.ts"
inheritance_content = '''// ============================================
// Token Inheritance — data preservation on employee changes
// لو الموظف حذف/استبدل → التوكنات تنتقل للموظف الجديد
// ============================================

import { db } from "@/lib/db"

export async function inheritTokensToReplacement(
  oldEmployeeId: string,
  newEmployeeId: string
): Promise<number> {
  // 1. Find all active tokens for old employee
  const tokens = await db.employeeAccessToken.findMany({
    where: { employeeId: oldEmployeeId, isActive: true }
  })
  
  // 2. Deactivate old employee tokens (keep them for reference)
  await db.employeeAccessToken.updateMany({
    where: { employeeId: oldEmployeeId, isActive: true },
    data: { isActive: false },
  })
  
  // 3. Create new tokens for replacement employee (inherited)
  let count = 0
  for (const token of tokens) {
    try {
      await db.employeeAccessToken.create({
        data: {
          employeeId: newEmployeeId,
          platform: token.platform,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          tokenExpiresAt: token.tokenExpiresAt,
          scopes: token.scopes,
          platformUserId: token.platformUserId,
          platformName: token.platformName,
          platformAvatar: token.platformAvatar,
          isActive: true,
          inheritedFromEmployeeId: oldEmployeeId,
          inheritedAt: new Date(),
          metadata: token.metadata,
        },
      })
      count++
    } catch {
      // Skip if already exists (upsert alternative)
      await db.employeeAccessToken.upsert({
        where: { employeeId_platform: { employeeId: newEmployeeId, platform: token.platform } },
        create: {
          employeeId: newEmployeeId,
          platform: token.platform,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          tokenExpiresAt: token.tokenExpiresAt,
          scopes: token.scopes,
          platformUserId: token.platformUserId,
          platformName: token.platformName,
          inheritedFromEmployeeId: oldEmployeeId,
          inheritedAt: new Date(),
          metadata: token.metadata,
          isActive: true,
        },
        update: {
          accessToken: token.accessToken,
          inheritedFromEmployeeId: oldEmployeeId,
          inheritedAt: new Date(),
          isActive: true,
        },
      })
      count++
    }
  }
  
  return count
}

// Mark old employee as replaced
export async function replaceEmployee(
  oldEmployeeId: string,
  newEmployeeId: string
): Promise<void> {
  // Update old employee status
  await db.employee.update({
    where: { id: oldEmployeeId },
    data: {
      status: "REPLACED",
      replacedByEmployeeId: newEmployeeId,
      replacedAt: new Date(),
    },
  })
  
  // Inherit tokens
  const tokenCount = await inheritTokensToReplacement(oldEmployeeId, newEmployeeId)
  console.log(`[TOKEN_INHERITANCE] ${tokenCount} tokens inherited from ${oldEmployeeId} to ${newEmployeeId}`)
}
'''

with sftp.open(inheritance_path, "w") as f:
    f.write(inheritance_content.encode())
print("token-inheritance.ts created!")

sftp.close()
client.close()
