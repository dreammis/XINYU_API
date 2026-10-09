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
      nav: [{ text: 'API 手册', link: '/zh/', activeMatch: '^/zh/(?:$|capabilities|api-reference|guides)' }, { text: '模型中心', link: '/zh/models', activeMatch: '^/zh/models' }, { text: '接入指南', link: '/zh/integration', activeMatch: '^/zh/(?:integration|quickstart|authentication|billing)' }, { text: '常见问题', link: '/zh/faq', activeMatch: '^/zh/(?:faq|errors)' }, { text: '控制台 ↗', link: 'https://openai.2yanx.dpdns.org' }],
      outlineTitle: '本页内容',
      docFooter: { prev: '上一篇', next: '下一篇' },
      lastUpdated: { text: '最后更新' },
      sidebarMenuLabel: '目录',
      returnToTopLabel: '回到顶部',
    } },
    en: { label: 'English', lang: 'en', themeConfig: {
      nav: [{ text: 'API manual', link: '/en/', activeMatch: '^/en/(?:$|capabilities|api-reference|guides)' }, { text: 'Models', link: '/en/models', activeMatch: '^/en/models' }, { text: 'Integration', link: '/en/integration', activeMatch: '^/en/(?:integration|quickstart|authentication|billing)' }, { text: 'FAQ', link: '/en/faq', activeMatch: '^/en/(?:faq|errors)' }, { text: 'Console ↗', link: 'https://openai.2yanx.dpdns.org' }],
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
