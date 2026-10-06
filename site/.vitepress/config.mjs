import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitepress';

const sidebar = JSON.parse(readFileSync(new URL('./sidebar.json', import.meta.url), 'utf8'));

export default defineConfig({
  title: 'XY API',
  description: '统一入口，调用图片、视频与更多服务。',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }]],
  locales: {
    zh: { label: '中文', lang: 'zh-CN', title: 'XY API', themeConfig: {
      nav: [{ text: '使用指南', link: '/zh/' }, { text: 'API Reference', link: '/zh/api-reference/media-image/generate-image' }, { text: '控制台 ↗', link: 'https://openai.2yanx.dpdns.org' }],
      outlineTitle: '本页内容',
      docFooter: { prev: '上一篇', next: '下一篇' },
      lastUpdated: { text: '最后更新' },
      sidebarMenuLabel: '目录',
      returnToTopLabel: '回到顶部',
    } },
    en: { label: 'English', lang: 'en', themeConfig: {
      nav: [{ text: 'Guides', link: '/en/' }, { text: 'API Reference', link: '/en/api-reference/media-image/generate-image' }, { text: 'Console ↗', link: 'https://openai.2yanx.dpdns.org' }],
    } },
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'XY API',
    sidebar,
    outline: [2, 3],
    search: { provider: 'local', options: { locales: { zh: { translations: { button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' }, modal: { noResultsText: '未找到结果', resetButtonTitle: '清除搜索', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } } } } } } },
    darkModeSwitchLabel: '切换主题',
  },
});
