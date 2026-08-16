// ============================================
// API Client — مع إعادة المحاولة التلقائية
//
// كل طلبات API بتمر من هون
// - Retry تلقائي عند فشل الاتصال
// - التعامل مع أخطاء sandbox inactive
// - Timeout مناسب
// ============================================

interface FetchOptions extends RequestInit {
  retries?: number
  retryDelay?: number
  timeout?: number
}

interface ApiError {
  error: string
  retryAfter?: number
}

// ============================================
// الدالة الرئيسية: fetch مع retry
// ============================================
export async function apiFetch<T = any>(
  url: string,
  options: FetchOptions = {},
): Promise<{ data: T | null; error: string | null; status: number }> {
  const {
    retries = 2,
    retryDelay = 1500,
    timeout = 30000,
    ...fetchOptions
  } = options

  let lastError: string = ""

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Timeout controller
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // لو الـ response موافق
      if (response.ok) {
        const data = await response.json()
        return { data, error: null, status: response.status }
      }

      // خطأ من السيرفر
      let errorBody: ApiError | null = null
      try {
        errorBody = await response.json()
      } catch {
        // لو ما قدرنا نقرأ JSON
      }

      const errorMessage = errorBody?.error || `خطأ HTTP ${response.status}`
      lastError = errorMessage

      // لو 429 (rate limit) — ما نعيد المحاولة
      if (response.status === 429) {
        return { data: null, error: errorMessage, status: response.status }
      }

      // لو 401 أو 403 — ما نعيد المحاولة
      if (response.status === 401 || response.status === 403) {
        return { data: null, error: errorMessage, status: response.status }
      }

      // لو 404 — ما نعيد المحاولة
      if (response.status === 404) {
        return { data: null, error: errorMessage, status: response.status }
      }

      // لو 500+ — نعيد المحاولة
      if (response.status >= 500 && attempt < retries) {
        console.warn(`[API] ${url} failed (${response.status}), retry ${attempt + 1}/${retries}...`)
        await sleep(retryDelay * (attempt + 1))
        continue
      }

      return { data: null, error: errorMessage, status: response.status }
    } catch (error) {
      // خطأ شبكة (اتصال مقطوع، timeout، إلخ)
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = "انتهت مهلة الطلب — حاول مرة أخرى"
      } else if (error instanceof TypeError && error.message.includes("fetch")) {
        lastError = "فشل الاتصال بالسيرفر — تأكد من اتصالك"
      } else {
        lastError = error instanceof Error ? error.message : "خطأ غير معروف"
      }

      // لو في محاولات متبقية — نعيد
      if (attempt < retries) {
        console.warn(`[API] ${url} network error, retry ${attempt + 1}/${retries}...`, lastError)
        await sleep(retryDelay * (attempt + 1))
        continue
      }
    }
  }

  return { data: null, error: lastError, status: 0 }
}

// ============================================
// Helper functions
// ============================================
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================
// Shortcuts للعمليات الشائعة
// ============================================
export async function apiPost<T = any>(
  url: string,
  body: any,
  options?: FetchOptions,
): Promise<{ data: T | null; error: string | null; status: number }> {
  return apiFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...options,
  })
}

export async function apiGet<T = any>(
  url: string,
  options?: FetchOptions,
): Promise<{ data: T | null; error: string | null; status: number }> {
  return apiFetch<T>(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    ...options,
  })
}

export async function apiPatch<T = any>(
  url: string,
  body: any,
  options?: FetchOptions,
): Promise<{ data: T | null; error: string | null; status: number }> {
  return apiFetch<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...options,
  })
}

export async function apiDelete<T = any>(
  url: string,
  options?: FetchOptions,
): Promise<{ data: T | null; error: string | null; status: number }> {
  return apiFetch<T>(url, {
    method: "DELETE",
    ...options,
  })
}
