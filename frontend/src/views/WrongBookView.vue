<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiWrongPage, apiWrongRemove } from '../api'

/**
 * 错题本：分页查看答错过的单词，并可进入「错题重练」。
 * 重练时答对一次即视为掌握，自动移出错题本（后端标记 mastered=1）。
 */
const router = useRouter()

const list = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const mode = ref('EN2CN')

async function load() {
  loading.value = true
  try {
    const data = await apiWrongPage(pageNo.value, pageSize.value)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

onMounted(load)

function changePage(p) {
  pageNo.value = p
  load()
}

/** 进入重练：一次性最多拿 20 个错词，超过部分下一轮再来 */
function startRetry() {
  router.push({ path: '/quiz', query: { type: 'wrong', mode: mode.value, limit: 20 } })
}

async function remove(item) {
  try {
    await ElMessageBox.confirm(`确定把「${item.word}」移出错题本吗？`, '提示', {
      confirmButtonText: '移出',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return // 用户点了取消
  }
  await apiWrongRemove(item.id)
  ElMessage.success('已移出错题本')
  // 删掉最后一条时回退一页，避免停在空页
  if (list.value.length === 1 && pageNo.value > 1) {
    pageNo.value -= 1
  }
  load()
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">错题本</h1>
    <p class="page-sub">答错的单词会自动记录在这里，重练答对一次即移出。</p>

    <div class="card toolbar">
      <div class="row">
        <span class="label">答题模式</span>
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="EN2CN">英译汉</el-radio-button>
          <el-radio-button value="CN2EN">汉译英</el-radio-button>
        </el-radio-group>
        <div class="spacer"></div>
        <span class="muted">共 {{ total }} 个待巩固单词</span>
        <el-button type="primary" :disabled="total === 0" @click="startRetry">开始重练</el-button>
      </div>
    </div>

    <div v-loading="loading" class="card" style="margin-top: 14px">
      <el-empty v-if="!loading && list.length === 0" description="还没有错题，去闯关积累一些吧" />

      <template v-else>
        <div class="wrong-row" v-for="item in list" :key="item.id">
          <div class="word-col">
            <div class="word">{{ item.word }}</div>
            <div class="phonetic">{{ item.phonetic }}</div>
          </div>
          <div class="meaning-col">{{ item.meaning }}</div>
          <div class="meta-col">
            <el-tag size="small" type="danger" effect="plain">错 {{ item.wrongCount }} 次</el-tag>
            <span class="muted time">{{ item.lastWrongTime }}</span>
          </div>
          <el-button text type="danger" size="small" @click="remove(item)">移出</el-button>
        </div>

        <div class="pager">
          <el-pagination
            layout="prev, pager, next"
            :current-page="pageNo"
            :page-size="pageSize"
            :total="total"
            @current-change="changePage"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  padding: 14px 18px;
}

.label {
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}

.wrong-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 4px;
  border-bottom: 1px solid #f5f7fa;
}

.word-col {
  min-width: 130px;
}

.word {
  font-size: 16px;
  font-weight: 600;
}

.phonetic {
  font-size: 12px;
  color: #909399;
}

.meaning-col {
  flex: 1;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.meta-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.time {
  font-size: 11px;
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
