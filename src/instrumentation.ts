// ============================================
// Next.js Instrumentation — يعمل مرة واحدة عند بدء السيرفر
// ============================================

export async function register() {
  // لا نستخدم process.on هنا لأنه مش مدعوم بالـ Edge Runtime
  // الـ unhandled rejection اللي كان يطفّي السيرفر تم حله
  // بإضافة try-catch على كل JSON.parse calls
}
