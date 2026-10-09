let highlighter;

// 所有代码块共享一个按需加载的高亮器，只打包本站实际使用的语言。
export async function highlightCode(code, language) {
  highlighter ??= Promise.all([
    import('shiki/core'), import('shiki/engine/oniguruma'), import('shiki/wasm'),
    import('shiki/langs/bash.mjs'), import('shiki/langs/python.mjs'),
    import('shiki/langs/javascript.mjs'), import('shiki/langs/json.mjs'),
    import('shiki/themes/github-dark.mjs'),
  ]).then(([core, engine, wasm, ...modules]) => core.createHighlighterCore({
    engine: engine.createOnigurumaEngine(wasm.default),
    langs: modules.slice(0, 4).map(module => module.default),
    themes: [modules[4].default],
  }));
  return (await highlighter).codeToHtml(code, { lang: language === 'curl' ? 'bash' : language, theme: 'github-dark' });
}
