<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStageProgress } from '../core/stats'
import { ensureLevel, isLevelCached, loadCatalog, stageCountOf } from '../core/wordBank'
import { LEVEL_DESCS, LEVEL_NAMES, LEVEL_SIZE, PASS_ACCURACY } from '../core/constants'
import StatusBlock from '../components/StatusBlock.vue'

/**
 * 关卡列表：一个难度下的所有关卡。
 *
 * 和桌面端一致：不锁关，任何一关都能直接点进去（背单词不需要"先过前一关"的门槛，
 * 有人就是想先挑后面难的看看）。
 */
const route = useRoute()
const router = useRouter()
const freqLevel = computed(() => Number(route.params.freqLevel) || 1)

const loading = ref(true)
const info = ref(null)
const progressMap = ref(new Map())
const mode = ref('EN2CN')
const cached = ref(false)

/** 关卡列表：每关 20 词，最后一关按剩余词数算 */
const stages = computed(() => {
  if (!info.value) return []
  const total = info.value.count
  const count = stageCountOf(total)
  const list = []
  for (let no = 1; no <= count; no++) {
    const wordCount = Math.min(LEVEL_SIZE, total - (no - 1) * LEVEL_SIZE)
    const p = progressMap.value.get(no)
    list.push({
      stageNo: no,
      wordCount,
      playCount: p ? p.playCount : 0,
      bestAccuracy: p ? p.bestAccuracy : 0,
      passed: p ? p.passed : false
    })
  }
  return list
})

async function load() {
  loading.value = true
  try {
    const catalog = await loadCatalog()
    const found = catalog.levels.find((l) => l.level === freqLevel.value)
    info.value = {
      ...found,
      levelName: LEVEL_NAMES[freqLevel.value] || found.levelName,
      description: LEVEL_DESCS[freqLevel.value] || found.description
    }
    progressMap.value = await getStageProgress(freqLevel.value)
    cached.value = await isLevelCached(freqLevel.value)

    // 后台悄悄把这一级的词库下好，等用户点进关卡时就不用再等
    if (!cached.value) {
      ensureLevel(freqLevel.value).then(() => {
        cached.value = true
      })
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(freqLevel, load)

/** 进入答题页。stageCount 一起带过去，交卷时才知道有没有下一关 */
function startStage(stageNo) {
  router.push({
    path: '/quiz',
    query: {
      type: 'stage',
      level: freqLevel.value,
      stageNo,
      mode: mode.value,
      stageCount: stages.value.length
    }
  })
}
</script>

<template>
  <div class="page">
    <div class="nav-bar">
      <button class="nav-back" type="button" @click="router.back()">‹</button>
      <span class="nav-title">闯关</span>
    </div>

    <StatusBlock v-if="loading" type="loading" loading-text="加载关卡…" />

    <template v-else-if="info">
      <div class="page-head">
        <div>
          <h1 class="page-title">{{ info.levelName }}</h1>
          <p class="page-sub">
            共 {{ info.count }} 词 / {{ stages.length }} 关，每关 {{ LEVEL_SIZE }} 个单词；正确率达到
            {{ Math.round(PASS_ACCURACY * 100) }}% 即视为通关。
          </p>
        </div>
      </div>

      <!-- 答题模式：分段选择器，比一堆单选框好点 -->
      <div class="mode-card">
        <div class="mode-label">答题模式</div>
        <div class="segment">
          <button
            type="button"
            class="segment-item"
            :class="{ active: mode === 'EN2CN' }"
            @click="mode = 'EN2CN'"
          >
            英译汉
          </button>
          <button
            type="button"
            class="segment-item"
            :class="{ active: mode === 'CN2EN' }"
            @click="mode = 'CN2EN'"
          >
            汉译英
          </button>
        </div>
        <p class="mode-tip">
          {{
            mode === 'EN2CN'
              ? '看单词选中文意思，节奏快，适合第一遍过词'
              : '看中文敲英文拼写，记得更牢，适合第二遍巩固'
          }}
        </p>
      </div>

      <div class="stage-grid">
        <div
          v-for="st in stages"
          :key="st.stageNo"
          class="stage-card"
          :class="{ passed: st.passed }"
          @click="startStage(st.stageNo)"
        >
          <div class="stage-no">{{ st.stageNo }}</div>
          <div class="stage-words">{{ st.wordCount }} 词</div>
          <div v-if="st.passed" class="stage-state ok">已通关 {{ Math.round(st.bestAccuracy * 100) }}%</div>
          <div v-else-if="st.playCount > 0" class="stage-state">
            最高 {{ Math.round(st.bestAccuracy * 100) }}%
          </div>
          <div v-else class="stage-state muted">未挑战</div>
        </div>
      </div>

      <p class="cache-note">
        {{ cached ? '✓ 本级词库已保存在手机上，离线也能做' : '正在后台缓存本级词库…' }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.mode-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: var(--shadow);
  margin-bottom: 14px;
}

.mode-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 10px;
}

/* 分段选择器：两个按钮拼成一条，当前模式高亮 */
.segment {
  display: flex;
  background: #f2f3f5;
  border-radius: 10px;
  padding: 3px;
}

.segment-item {
  flex: 1;
  height: 38px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.segment-item.active {
  background: #fff;
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.mode-tip {
  font-size: 12px;
  color: var(--muted);
  margin: 10px 2px 0;
  line-height: 1.5;
}

/* 关卡网格：手机上一行 3 个，拇指点得到 */
.stage-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stage-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 8px;
  text-align: center;
  cursor: pointer;
}

.stage-card:active {
  background: #fafcff;
}

.stage-card.passed {
  border-color: #c2e7b0;
  background: #f7fdf3;
}

.stage-no {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}

.stage-card.passed .stage-no {
  color: var(--success);
}

.stage-words {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.stage-state {
  font-size: 11px;
  color: var(--warning);
  margin-top: 6px;
}

.stage-state.ok {
  color: var(--success);
}

.stage-state.muted {
  color: var(--placeholder);
}

.cache-note {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  margin: 18px 0 0;
}
</style>
