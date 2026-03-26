import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 读取全部环境变量（包含非 VITE_ 前缀），用于服务端代理注入密钥
  const env = loadEnv(mode, process.cwd(), '')
  const aiProxyTarget = env.AI_PROXY_TARGET || 'https://toapis.com'
  const aiProxyToken = env.AI_PROXY_TOKEN
  const proxy = {
    '/api': {
      target: env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
      changeOrigin: true,
      secure: false
    },
    // 前端统一请求同源 /ai-proxy，由开发服务器转发到真实 AI 服务
    '/ai-proxy': {
      target: aiProxyTarget,
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/ai-proxy/, ''),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          // 强制使用服务端环境变量中的 token，避免前端明文携带
          proxyReq.removeHeader('authorization')
          if (aiProxyToken) {
            proxyReq.setHeader('Authorization', `Bearer ${aiProxyToken}`)
          }
        })
      }
    }
  }
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    // Electron 打包需要使用相对路径
    base: './',
    server: {
      port: 3004,
      host: '0.0.0.0',
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
