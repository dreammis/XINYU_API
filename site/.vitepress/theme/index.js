import DefaultTheme from 'vitepress/theme';
import ApiPlayground from './ApiPlayground.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ApiPlayground', ApiPlayground);
  },
};
