<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ensureLevel, loadCatalog } from '../core/wordBank'
import { LEVEL_DESCS, LEVEL_NAMES } from '../core/constants'
import StatusBlock from '../components/StatusBlock.vue'

/**
 * 词库分级展示。
 *
 * 手机上不做"一屏刷完 5547 词"（既卡又没意义），而是：
 *   选难度 → 搜索 / 往下翻 → 每次只渲染 60 条 → 点「加载更多」再续。
 * 这样低端机也不会因为 DOM 太多而卡顿。
 */
const router = useRouter()

const loading = ref(true)
const loadingText = ref('加载词库…')
const error = ref('')
const catalog = ref(null)
const level = ref(1)
const words = ref([])
const keyword = ref('')
const shown = ref(60)

const PAGE = 60

const info = computed(() => catalog.value?.levels.find((l) => l.level === level.value) || null)
const level0Name = computed(() => (info.value ? info.value.levelName : '本级'))

/** 搜索结果：匹配单词或中文释义都算 */
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return words.value
  return words.value.filter(
    (w) => w.word.toLowerCase().includes(kw) || (w.meaning || '').includes(kw)
  )
})

const visible = computed(() => filtered.value.slice(0, shown.value))
const hasMore = computed(() => shown.value < filtered.value.length)

async function loadCatalogOnly() {
  loading.value = true
  error.value = ''
  try {
    catalog.value = await loadCatalog()
  } catch (e) {
    error.value = e.message || '词库目录加载失败'
  } finally {
    loading.value = false
  }
}

/** 切换难度 / 首次进入时加载该级词库（已缓存的直接读 IndexedDB，很快） */
async function loadLevel() {
  loading.value = true
  loadingText.value = '加载词库…'
  error.value = ''
  shown.value = PAGE
  try {
    words.value = await ensureLevel(level.value, (t) => {
      loadingText.value = t
    })
  } catch (e) {
    error.value = e.message || '词库加载失败'
    words.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCatalogOnly()
  if (!error.value) await loadLevel()
})

/**
 * 手动切换难度：清空搜索词再加载。
 * 用函数而不是 watch(level) 的原因：「本级搜不到 → 去其他难度搜」时要保留关键词，
 * 这种程序化切换不能把用户刚输入的词清掉。
 */
function pickLevel(lv) {
  if (lv === level.value) return
  level.value = lv
  keyword.value = ''
  loadLevel()
}

/** 在本级搜不到时，带着关键词去另一个难度继续搜 */
function searchInLevel(lv) {
  if (lv === level.value) return
  level.value = lv
  loadLevel()
}

watch(keyword, () => {
  shown.value = PAGE
})

/** 其他难度（用于"本级没搜到"时给一键跳转） */
const otherLevels = computed(() =>
  (catalog.value?.levels || []).filter((l) => l.level !== level.value)
)

function loadMore() {
  shown.value += PAGE
}

/** 点击某个词直接进该词所在的关卡练一遍 */
function practiceWord(word) {
  const stageNo = Math.ceil(word.seq / 20)
  router.push({
    path: '/quiz',
    query: { type: 'stage', level: level.value, stageNo, mode: 'EN2CN' }
  })
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">词库</h1>
        <p class="page-sub">
          共 {{ catalog ? catalog.total : '—' }} 词，按考频分成三档；点任意单词可直接去练它所在的那一关。
        </p>
      </div>
    </div>

    <StatusBlock v-if="!catalog && loading" type="loading" :loading-text="loadingText" />
    <StatusBlock v-else-if="error" icon="⚠️" title="加载失败" :sub="error">
      <button class="btn btn-primary btn-sm" @click="loadLevel">重试</button>
    </StatusBlock>

    <template v-else>
      <!-- 三档切换 -->
      <div class="segment">
        <button
          v-for="lv in catalog.levels"
          :key="lv.level"
          type="button"
          class="segment-item"
          :class="{ active: level === lv.level }"
          @click="pickLevel(lv.level)"
        >
          {{ lv.levelName }}
          <span class="seg-count">{{ lv.count }}</span>
        </button>
      </div>

      <p class="level-desc">{{ LEVEL_DESCS[level] }}</p>

      <!-- 搜索 -->
      <div class="search-box">
        <input
          v-model="keyword"
          class="input search-input"
          type="search"
          placeholder="搜单词或中文意思"
        />
      </div>

      <StatusBlock v-if="loading" type="loading" :loading-text="loadingText" />

      <template v-else>
        <div class="list-head">
          <span>{{ keyword ? `找到 ${filtered.length} 个` : `本级 ${words.length} 词` }}</span>
          <span class="muted">按难度从易到难排序</span>
        </div>

        <div v-if="!visible.length" class="empty">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">「{{ level0Name }}」里没有找到「{{ keyword.trim() }}」</div>
          <div class="empty-sub">
            换个关键词试试（中文释义也能搜），或者去其他难度里找找：
          </div>
          <div class="jump-row">
            <button
              v-for="lv in otherLevels"
              :key="lv.level"
              class="btn btn-plain btn-sm"
              type="button"
              @click="searchInLevel(lv.level)"
            >
              去「{{ lv.levelName }}」搜（{{ lv.count }} 词）
            </button>
          </div>
        </div>

        <div v-else class="word-list">
          <div v-for="w in visible" :key="w.id" class="word-row" @click="practiceWord(w)">
            <div class="word-main">
              <div class="word-title">
                {{ w.word }}
                <span class="word-phonetic">{{ w.phonetic }}</span>
              </div>
              <div class="word-meaning">{{ w.meaning }}</div>
            </div>
            <span class="word-seq">#{{ w.seq }}</span>
          </div>
        </div>

        <button v-if="hasMore" class="btn btn-ghost btn-block more-btn" type="button" @click="loadMore">
          加载更多（还有 {{ filtered.length - shown }} 个）
        </button>
      </template>
    </template>
  </div>
</template>

<style scoped>
.segment {
  display: flex;
  background: #f2f3f5;
  border-radius: 10px;
  padding: 3px;
}

.segment-item {
  flex: 1;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.segment-item.active {
  background: #fff;
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.seg-count {
  font-size: 11px;
  opacity: 0.7;
}

.level-desc {
  font-size: 12px;
  color: var(--muted);
  margin: 10px 2px 12px;
}

.search-box {
  margin-bottom: 12px;
}

.search-input {
  height: 42px;
  border-radius: 10px;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-2);
  margin: 4px 2px 8px;
}

.word-list {
  background: #fff;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.word-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid #f5f7fa;
}

.word-row:last-child {
  border-bottom: none;
}

.word-row:active {
  background: #fafcff;
}

.word-main {
  flex: 1;
  min-width: 0;
}

.word-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
}

.word-phonetic {
  font-size: 11px;
  color: var(--muted);
  font-weight: 400;
  margin-left: 6px;
}

.word-meaning {
  font-size: 13px;
  color: var(--text-2);
  margin-top: 2px;
  line-height: 1.45;
}

.word-seq {
  flex: none;
  font-size: 11px;
  color: var(--placeholder);
  font-variant-numeric: tabular-nums;
}

.more-btn {
  margin-top: 14px;
}

.jump-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
