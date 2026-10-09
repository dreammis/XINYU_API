import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import ApiPlayground from './ApiPlayground.vue';
import DocsHome from './DocsHome.vue';
import ModelCatalog from './ModelCatalog.vue';
import ModelDetail from './ModelDetail.vue';
import SeriesOverview from './SeriesOverview.vue';
import CapabilityGrid from './CapabilityGrid.vue';
import DocTrail from './DocTrail.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'doc-before': () => h(DocTrail) }),
  enhanceApp({ app }) {
    app.component('ApiPlayground', ApiPlayground);
    app.component('DocsHome', DocsHome);
    app.component('ModelCatalog', ModelCatalog);
    app.component('ModelDetail', ModelDetail);
    app.component('SeriesOverview', SeriesOverview);
    app.component('CapabilityGrid', CapabilityGrid);
  },
};
