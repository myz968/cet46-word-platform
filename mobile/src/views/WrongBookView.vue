<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getWrongPage, removeWrongWord } from '../core/stats'
import { fromNow } from '../core/time'
import { MODE_EN2CN } from '../core/constants'
import StatusBlock from '../components/StatusBlock.vue'

/**
 * 错题本。
 *
 * 逻辑与桌面端一致：只列"未掌握"的错题，同一单词只出现一条（错误次数累加）。
 * 重练时答对即视为掌握、自动移出；也可以手动点「移除」。
 */
const router = useRouter()

const loading = ref(true)
const list = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = 10
const mode = ref(MODE_EN2CN)

const hasMore = computed(() => list.value.length < total.value)

async function load(reset = false) {
  if (reset) {
    pageNo.value = 1
    loading.value = true
  }
  const data = await getWrongPage(pageNo.value, pageSize)
  total.value = data.total
  list.value = reset ? data.list : [...list.value, ...data.list]
  loading.value = false
}

onMounted(() => load(true))

function loadMore() {
  pageNo.value += 1
  load(false)
}

/** 开始错题重练：一次最多 20 个，太多手机上做不完会很烦 */
function startPractice() {
  if (!total.value) return
  router.push({
    path: '/quiz',
    query: { type: 'wrong', mode: mode.value, limit: Math.min(total.value, 20) }
  })
}

async function removeOne(item) {
  if (!window.confirm(`把「${item.word}」从错题本移除？`)) return
  await removeWrongWord(item.wordId)
  await load(true)
}

function goStage() {
  router.push('/stage/1')
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">错题本</h1>
        <p class="page-sub">
          答错的单词会自动收进来，同一个词反复错只记一条、累加错误次数。重练时答对就移出。
        </p>
      </div>
    </div>

    <StatusBlock v-if="loading && !list.length" type="loading" loading-text="读取错题…" />

    <template v-else>
      <!-- 顶部操作卡 -->
      <div class="card action-card">
        <div class="row-between">
          <div>
            <div class="action-num">{{ total }}</div>
            <div class="muted">个单词待掌握</div>
          </div>
          <button class="btn btn-primary" type="button" :disabled="!total" @click="startPractice">
            开始重练
          </button>
        </div>

        <div class="divider"></div>

        <div class="row-between">
          <span class="mode-label">重练模式</span>
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
        </div>
      </div>

      <!-- 空状态 -->
      <StatusBlock
        v-if="!total"
        icon="🎉"
        title="错题本是空的"
        sub="要么你还没开始闯关，要么答过的全对了 —— 都挺好"
      >
        <button class="btn btn-primary btn-sm" type="button" @click="goStage">去闯关</button>
      </StatusBlock>

      <!-- 错题列表 -->
      <template v-else>
        <div v-for="item in list" :key="item.wordId" class="wrong-card">
          <div class="row-between">
            <div class="wrong-head">
              <span class="wrong-word">{{ item.word }}</span>
              <span class="wrong-phonetic">{{ item.phonetic }}</span>
            </div>
            <span class="tag tag-danger">错 {{ item.wrongCount }} 次</span>
          </div>

          <div class="wrong-meaning">{{ item.meaning }}</div>
          <div v-if="item.example" class="wrong-example">{{ item.example }}</div>

          <div class="wrong-foot">
            <span class="muted">最近答错：{{ fromNow(item.lastWrongTime) }}</span>
            <button class="btn btn-sm btn-ghost" type="button" @click="removeOne(item)">移除</button>
          </div>
        </div>

        <button v-if="hasMore" class="btn btn-ghost btn-block more-btn" type="button" @click="loadMore">
          加载更多（还有 {{ total - list.length }} 个）
        </button>
      </template>
    </template>
  </div>
</template>

<style scoped>
.action-card {
  margin-bottom: 14px;
}

.action-num {
  font-size: 26px;
  font-weight: 700;
  color: var(--danger);
  line-height: 1.15;
}

.mode-label {
  font-size: 13px;
  color: var(--text-2);
}

.segment {
  display: flex;
  background: #f2f3f5;
  border-radius: 9px;
  padding: 3px;
}

.segment-item {
  min-width: 68px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-2);
  cursor: pointer;
}

.segment-item.active {
  background: #fff;
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.wrong-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: var(--shadow);
  border-left: 3px solid var(--danger);
  margin-bottom: 10px;
}

.wrong-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.wrong-word {
  font-size: 18px;
  font-weight: 600;
  word-break: break-word;
}

.wrong-phonetic {
  font-size: 11px;
  color: var(--muted);
}

.wrong-meaning {
  font-size: 14px;
  color: var(--text-2);
  margin-top: 4px;
  line-height: 1.5;
}

.wrong-example {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.6;
}

.wrong-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f5f7fa;
}

.more-btn {
  margin-top: 6px;
}
</style>
