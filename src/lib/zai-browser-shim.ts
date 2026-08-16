// Browser shim for z-ai-web-dev-sdk
// This module replaces the real SDK in client-side bundles
// The real SDK is only used on the server (Node.js)

export default {
  create: async () => {
    console.warn("ZAI SDK is only available on the server side")
    return null
  },
}

export const create = async () => {
  console.warn("ZAI SDK is only available on the server side")
  return null
}
