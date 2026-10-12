<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import UiIcon from './UiIcon.vue';
const props = defineProps({ locale: {type: String, default: 'zh'}, model: {type: String, default: 'vox-1'} });
const emit = defineEmits(['select']);
const voices = ref([]);
const search = ref('');
const language = ref(props.locale === 'zh' ? 'zh' : 'en');
const selected = ref('');
const playing = ref('');
const previewVoice = ref('');
const error = ref('');
const limit = ref(8);
const audio = ref(null);
const zh = computed(() => props.locale === 'zh');
const modelVoices = computed(() => voices.value.filter(voice => voice.models.includes(props.model)));
const languageNames = computed(() => new Intl.DisplayNames([props.locale], {type: 'language'}));
// 上游的 zhYue 不是标准 BCP 47 标签；普通话和粤语必须分开，不能都显示为“中文”。
function languageLabel(code) {
  if (code === 'zh') return zh.value ? '中文 · 普通话' : 'Chinese · Mandarin';
  if (code === 'zhYue') return zh.value ? '中文 · 粤语' : 'Chinese · Cantonese';
  return languageNames.value.of(code);
}
const languages = computed(() => [...new Set(modelVoices.value.map(voice => voice.language))].map(code => ({code, label: languageLabel(code), count: modelVoices.value.filter(voice => voice.language === code).length})).sort((a, b) => a.label.localeCompare(b.label, props.locale)));
const quickLanguages = computed(() => ['zh', 'zhYue', 'en', 'ja', 'ko'].map(code => languages.value.find(item => item.code === code)).filter(Boolean));
const filtered = computed(() => modelVoices.value.filter(voice => (!language.value || voice.language === language.value) && `${voice.name} ${voice.description} ${voice.id} ${voice.language} ${languageLabel(voice.language)}`.toLowerCase().includes(search.value.trim().toLowerCase())));
watch([search, language, () => props.model], () => {limit.value = 8;});
onMounted(async () => {
  try {
    const response = await fetch('/assets/media-tts/voices.json');
    if (!response.ok) throw new Error('catalog unavailable');
    const catalog = await response.json();
    voices.value = catalog.voices;
  } catch { error.value = zh.value ? '音色目录暂时无法加载。' : 'The voice catalog could not be loaded.'; }
});
onBeforeUnmount(() => audio.value?.pause());
async function play(voice) {
  if (previewVoice.value === voice.id && !audio.value.paused) {audio.value.pause(); return;}
  audio.value.pause();
  // 同一音色暂停后继续播放；按钮状态以播放器真实事件为准，控制条暂停也会同步。
  if (previewVoice.value !== voice.id) audio.value.src = voice.preview_url;
  previewVoice.value = voice.id;
  error.value = '';
  try {await audio.value.play();} catch (failure) {
    if (failure.name === 'AbortError') return; // 换音色或暂停会中断上一段尚未完成的播放请求。
    playing.value = ''; error.value = zh.value ? '此试听暂时无法播放。' : 'This sample cannot be played right now.';
  }
}
function select(voice) {
  selected.value = voice.id;
  emit('select', voice);
}
</script>

<template>
  <section class="voice-browser" :aria-label="zh ? '音色试听与选择' : 'Voice samples and selection'">
    <div class="voice-heading"><div><span class="voice-eyebrow">VOX / {{ zh ? '音色库' : 'VOICE LIBRARY' }}</span><h2>{{ zh ? '先听，再选择你的声音' : 'Listen. Find your voice.' }}</h2></div><span class="voice-free">{{ zh ? '样本试听免费 · 无需 Key' : 'Free samples · No API key' }}</span></div>
    <p class="voice-intro">{{ zh ? '选择音色后，请求示例与调试参数同步更新。输入自己的文本生成音频，按正常规则收费。' : 'Choose a voice to update the request example and playground. Synthesizing your own text uses normal generation billing.' }}</p>
    <div class="voice-locales" :aria-label="zh ? '常用语言' : 'Popular languages'">
      <button :aria-pressed="language === ''" @click="language = ''">{{ zh ? '全部语言' : 'All languages' }}<span>{{ modelVoices.length }}</span></button>
      <button v-for="item in quickLanguages" :key="item.code" :aria-pressed="language === item.code" @click="language = item.code">{{ item.label }}<span>{{ item.count }}</span></button>
    </div>
    <div class="voice-filters"><label>{{ zh ? `全部 ${languages.length} 种语言` : `All ${languages.length} languages` }}<select v-model="language"><option value="">{{ zh ? '全部语言' : 'All languages' }} ({{ modelVoices.length }})</option><option v-for="item in languages" :key="item.code" :value="item.code">{{ item.label }} ({{ item.count }})</option></select></label><label class="voice-search">{{ zh ? '搜索音色' : 'Search voices' }}<input v-model="search" type="search" :placeholder="zh ? '名称、描述、语言或音色 ID' : 'Name, description, language or voice ID'" /></label></div>
    <p class="voice-results" role="status">{{ language ? languageLabel(language) : (zh ? '全部语言' : 'All languages') }}<span>{{ filtered.length }} {{ zh ? '个音色' : 'voices' }}</span></p>
    <audio ref="audio" v-show="previewVoice" controls preload="none" class="voice-player" @play="playing = previewVoice" @pause="playing = ''" @ended="playing = ''" @error="playing = ''; error = zh ? '此试听暂时无法播放。' : 'This sample cannot be played right now.'" />
    <p v-if="error" role="alert">{{ error }}</p>
    <div class="voice-grid"><article v-for="voice in filtered.slice(0, limit)" :key="voice.id" :class="['voice-card', {selected: selected === voice.id}]">
      <div class="voice-card-top"><span class="voice-avatar" aria-hidden="true"><img v-if="voice.avatar_url" :src="voice.avatar_url" alt="" loading="lazy" width="44" height="44" /><UiIcon v-else name="audio" /></span><div class="voice-identity"><h3>{{ voice.name }}</h3><span class="voice-language">{{ languageLabel(voice.language) }}</span></div><button class="voice-play" :disabled="!voice.preview_url" :aria-label="`${playing === voice.id ? (zh ? '暂停' : 'Pause') : (zh ? '试听' : 'Play')} ${voice.name}`" @click="play(voice)"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path v-if="playing === voice.id" d="M7 5h4v14H7zm6 0h4v14h-4z"/><path v-else d="m8 5 11 7-11 7z"/></svg><span>{{ !voice.preview_url ? (zh ? '无试听' : 'No sample') : playing === voice.id ? (zh ? '暂停' : 'Pause') : (zh ? '试听' : 'Play') }}</span></button></div>
      <p>{{ voice.description }}</p><code>{{ voice.id }}</code><button class="voice-select" :aria-pressed="selected === voice.id" @click="select(voice)">{{ selected === voice.id ? (zh ? '已选择 ✓' : 'Selected ✓') : (zh ? '使用此音色 →' : 'Use this voice →') }}</button>
    </article></div>
    <p v-if="!filtered.length && voices.length">{{ zh ? '没有匹配的音色。' : 'No voices match your filters.' }}</p>
    <button v-if="filtered.length > limit" class="voice-more" @click="limit += 16">{{ zh ? '显示更多音色' : 'Show more voices' }}</button>
    <p v-if="selected" class="voice-selection" role="status">{{ zh ? '当前请求音色：' : 'Voice in your request: ' }}<code>{{ selected }}</code></p>
  </section>
</template>

<style scoped>
.voice-browser{margin:28px 0;padding:24px;border:1px solid var(--vp-c-divider);border-radius:12px;background:var(--vp-c-bg-soft)}
.voice-heading{display:flex;justify-content:space-between;gap:20px;align-items:center}.voice-eyebrow{font-size:11px;letter-spacing:.16em;font-weight:600;color:var(--vp-c-text-2)}
.voice-heading h2{margin:8px 0 0;padding:0;border:0;font-size:24px;line-height:1.4}.voice-free{font-size:12px;white-space:nowrap;color:var(--vp-c-brand-1)}.voice-intro{font-size:13px;color:var(--vp-c-text-2)}
.voice-filters{display:flex;gap:14px;align-items:end;margin:20px 0}.voice-filters label{display:grid;gap:6px;font-size:12px;font-weight:600}.voice-filters input,.voice-filters select{border:1px solid var(--vp-c-divider);background:var(--vp-c-bg);border-radius:6px;padding:8px 10px;color:var(--vp-c-text-1);font-weight:400}.voice-search{flex:1}.voice-count{font-size:12px;color:var(--vp-c-text-2);padding-bottom:8px}
.voice-player{width:100%;height:36px;margin-bottom:18px}.voice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.voice-card{display:flex;flex-direction:column;min-width:0;padding:16px;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg)}.voice-card.selected{border-color:var(--vp-c-brand-1)}.voice-card-top{display:flex;justify-content:space-between;align-items:center}.voice-language{font:11px var(--vp-font-family-mono);text-transform:uppercase;color:var(--vp-c-text-2)}.voice-card button{font-size:12px;color:var(--vp-c-brand-1);cursor:pointer}.voice-card button:disabled{color:var(--vp-c-text-3);cursor:default}.voice-card h3{margin:12px 0 4px;font-size:16px}.voice-card p{margin:0 0 12px;font-size:12px;line-height:1.7;color:var(--vp-c-text-2);flex:1}.voice-card code{font-size:10px;word-break:break-all;align-self:start}.voice-select{margin-top:14px;text-align:left;padding-top:12px;border-top:1px solid var(--vp-c-divider);width:100%}.voice-more{margin:20px auto 0;display:block;padding:8px 16px;border:1px solid var(--vp-c-divider);border-radius:6px;font-size:13px}.voice-selection{font-size:12px;margin-bottom:0}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--vp-c-brand-1);outline-offset:3px}
.voice-locales{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}.voice-locales button{display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--vp-c-divider);border-radius:7px;background:var(--vp-c-bg);font-size:12px;cursor:pointer}.voice-locales button[aria-pressed=true]{border-color:var(--vp-c-brand-1);color:var(--vp-c-brand-1);background:var(--vp-c-brand-soft)}.voice-locales span{font-size:10px;color:var(--vp-c-text-2)}
.voice-results{display:flex;align-items:center;gap:10px;margin:0 0 12px;font-size:13px;font-weight:600}.voice-results span{font-size:12px;font-weight:400;color:var(--vp-c-text-2)}
.voice-card-top{gap:10px;margin-bottom:14px}.voice-avatar{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:50%;overflow:hidden;background:var(--vp-c-brand-soft);color:var(--vp-c-brand-1)}.voice-avatar img{width:44px;height:44px;object-fit:cover}.voice-avatar :deep(svg){width:25px;height:25px}.voice-identity{flex:1;min-width:0}.voice-identity h3{margin:0 0 3px;line-height:1.4;overflow-wrap:anywhere}.voice-language{font:11px var(--vp-font-family-base);text-transform:none}.voice-play{display:flex;align-items:center;flex-direction:column;gap:2px;flex-shrink:0;min-width:44px;min-height:44px;border-radius:6px}.voice-play:hover:not(:disabled){background:var(--vp-c-brand-soft)}.voice-play svg{width:20px;height:20px}
.voice-browser{container-type:inline-size}.voice-filters label{min-width:0}.voice-filters input,.voice-filters select{min-width:0;max-width:100%}
/* API 页正文与右侧示例共享宽度，按音色库实际宽度切换，避免桌面窄栏也挤成两列。 */
@container(max-width:500px){.voice-grid{grid-template-columns:1fr}.voice-heading{align-items:start;flex-direction:column;gap:8px}.voice-filters{flex-wrap:wrap}.voice-search{flex-basis:180px}}
@media(max-width:640px){.voice-browser{padding:16px}.voice-heading{align-items:start;flex-direction:column;gap:8px}.voice-heading h2{font-size:21px}.voice-filters{flex-wrap:wrap}.voice-search{min-width:180px}.voice-grid{grid-template-columns:1fr}.voice-count{width:100%;padding:0}}
</style>
