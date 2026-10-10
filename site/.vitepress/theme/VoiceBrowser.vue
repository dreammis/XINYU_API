<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
const props = defineProps({ locale: {type: String, default: 'zh'}, model: {type: String, default: 'vox-1'} });
const emit = defineEmits(['select']);
const voices = ref([]);
const search = ref('');
const language = ref('zh');
const selected = ref('');
const playing = ref('');
const error = ref('');
const limit = ref(8);
const audio = ref(null);
const zh = computed(() => props.locale === 'zh');
const languages = computed(() => [...new Set(voices.value.flatMap(voice => voice.models.includes(props.model) ? [voice.language] : []))].sort());
const filtered = computed(() => voices.value.filter(voice => voice.models.includes(props.model) && (!language.value || voice.language === language.value) && `${voice.name} ${voice.description} ${voice.id}`.toLowerCase().includes(search.value.toLowerCase())));
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
  if (playing.value === voice.id && !audio.value.paused) {audio.value.pause(); playing.value = ''; return;}
  audio.value.pause();
  audio.value.src = voice.preview_url;
  playing.value = voice.id;
  error.value = '';
  try {await audio.value.play();} catch {playing.value = ''; error.value = zh.value ? '此试听暂时无法播放。' : 'This sample cannot be played right now.';}
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
    <div class="voice-filters"><label>{{ zh ? '语言' : 'Language' }}<select v-model="language"><option value="">{{ zh ? '全部语言' : 'All languages' }}</option><option v-for="value in languages" :key="value" :value="value">{{ value }}</option></select></label><label class="voice-search">{{ zh ? '搜索音色' : 'Search voices' }}<input v-model="search" type="search" :placeholder="zh ? '名称、描述或音色 ID' : 'Name, description or voice ID'" /></label><span class="voice-count">{{ filtered.length }} {{ zh ? '个音色' : 'voices' }}</span></div>
    <audio ref="audio" v-show="playing" controls preload="none" class="voice-player" @ended="playing = ''" @error="playing = ''; error = zh ? '此试听暂时无法播放。' : 'This sample cannot be played right now.'" />
    <p v-if="error" role="alert">{{ error }}</p>
    <div class="voice-grid"><article v-for="voice in filtered.slice(0, limit)" :key="voice.id" :class="['voice-card', {selected: selected === voice.id}]">
      <div class="voice-card-top"><span class="voice-language">{{ voice.language }}</span><button :disabled="!voice.preview_url" :aria-label="`${playing === voice.id ? (zh ? '暂停' : 'Pause') : (zh ? '试听' : 'Play')} ${voice.name}`" @click="play(voice)">{{ !voice.preview_url ? (zh ? '暂无试听' : 'No sample') : playing === voice.id ? (zh ? '暂停' : 'Pause') : (zh ? '试听 ▶' : 'Play ▶') }}</button></div>
      <h3>{{ voice.name }}</h3><p>{{ voice.description }}</p><code>{{ voice.id }}</code><button class="voice-select" :aria-pressed="selected === voice.id" @click="select(voice)">{{ selected === voice.id ? (zh ? '已选择 ✓' : 'Selected ✓') : (zh ? '使用此音色 →' : 'Use this voice →') }}</button>
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
@media(max-width:640px){.voice-browser{padding:16px}.voice-heading{align-items:start;flex-direction:column;gap:8px}.voice-heading h2{font-size:21px}.voice-filters{flex-wrap:wrap}.voice-search{min-width:180px}.voice-grid{grid-template-columns:1fr}.voice-count{width:100%;padding:0}}
</style>
