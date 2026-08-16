// ============================================
// Next.js Instrumentation — يشتغل مرة واحدة عند بدء السيرفر
// منع الـ unhandledRejection من تعطيل العملية
// ============================================

export async function register() {
  // هاد بيشتغل بالـ Node.js runtime فقط
  if (typeof process !== 'undefined' && process.on) {
    process.on('unhandledRejection', (reason) => {
      console.warn('[UNHANDLED_REJECTION_CAUGHT]', String(reason))
    })
  }
}
