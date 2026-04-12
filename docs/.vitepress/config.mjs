import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "心雨 API",
  description: "全聚合模型接口层 · 100+ 热门模型",
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '开发文档', link: '/api/elevenlabs_tts' },
      { text: '管理后台', link: 'https://openai.2yanx.dpdns.org' }
    ],

    sidebar: [
      {
        text: '接口说明',
        items: [
          { text: 'ElevenLabs 语音合成', link: '/api/elevenlabs_tts' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/xyapi_doc' }
    ],
    
    footer: {
      message: '提供极速、稳定、全网统一的 AI 调用网关。',
      copyright: 'Copyright © 2026-present 心雨 API'
    }
  }
})
