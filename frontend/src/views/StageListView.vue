<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiLevelDetail } from '../api'

const route = useRoute()
const router = useRouter()

const freqLevel = Number(route.params.freqLevel)
const detail = ref(null)
const loading = ref(true)
/** 答题模式：EN2CN 英译汉（选释义） / CN2EN 汉译英（手敲拼写） */
const mode = ref('EN2CN')

async function load() {
  loading.value = true
  try {
    detail.value = await apiLevelDetail(freqLevel)
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** 进入某一关答题 */
function startStage(stageNo) {
  router.push({
    path: '/quiz',
    query: { type: 'stage', level: freqLevel, stageNo, mode: mode.value }
  })
}
</script>

<template>
  <div class="page">
    <div class="row" style="margin-bottom: 12px">
      <el-button text @click="router.push('/')">← 返回</el-button>
    </div>

    <div v-loading="loading">
      <div v-if="detail">
        <h1 class="page-title">{{ detail.levelName }}</h1>
        <p class="page-sub">
          共 {{ detail.stageCount }} 关，每关 {{ detail.levelSize }} 个单词；正确率达到 60% 即视为通关。
        </p>

        <div class="card mode-box">
          <span class="mode-label">答题模式</span>
          <el-radio-group v-model="mode">
            <el-radio-button value="EN2CN">英译汉（选中文释义）</el-radio-button>
            <el-radio-button value="CN2EN">汉译英（手敲拼写）</el-radio-button>
          </el-radio-group>
          <span class="muted">
            {{ mode === 'EN2CN' ? '看单词选意思，节奏快，适合第一遍过词' : '看中文敲拼写，记得更牢，适合复习巩固' }}
          </span>
        </div>

        <div class="stage-grid">
          <div
            v-for="st in detail.stages"
            :key="st.stageNo"
            class="stage-card"
            :class="{ passed: st.passed }"
            @click="startStage(st.stageNo)"
          >
            <div class="stage-no">第 {{ st.stageNo }} 关</div>
            <div class="stage-words">{{ st.wordCount }} 词</div>
            <div v-if="st.passed" class="stage-state passed-text">
              已通关 {{ Math.round(st.bestAccuracy * 100) }}%
            </div>
            <div v-else-if="st.playCount > 0" class="stage-state">
              最高 {{ Math.round(st.bestAccuracy * 100) }}%
            </div>
            <div v-else class="stage-state muted">未挑战</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mode-box {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.mode-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.stage-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  border: 1px solid #ebeef5;
  transition: all 0.15s;
}

.stage-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.15);
  transform: translateY(-1px);
}

.stage-card.passed {
  background: #f0f9eb;
  border-color: #c2e7b0;
}

.stage-no {
  font-size: 15px;
  font-weight: 600;
}

.stage-words {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.stage-state {
  font-size: 12px;
  color: #e6a23c;
  margin-top: 10px;
}

.passed-text {
  color: #67c23a;
}
</style>
