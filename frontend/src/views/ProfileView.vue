<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiOverview, apiWordStats, apiWordReset } from '../api'
import { logout, userState } from '../store/user'

/**
 * 我的：学习数据概览 + 最近闯关记录 + 账号操作 + 词库维护。
 * 「学习报告」的核心数据都在这里汇总（正确率、新增生词、用时都在闯关记录表里）。
 */
const router = useRouter()
const data = ref(null)
const loading = ref(true)
const wordStats = ref(null)
const resetting = ref(false)

async function load() {
  loading.value = true
  try {
    data.value = await apiOverview()
    userState.nickname = data.value.nickname
    userState.isGuest = data.value.isGuest
  } finally {
    loading.value = false
  }
}

/** 词库规模（总词数 + 三个难度分布） */
async function loadWordStats() {
  wordStats.value = await apiWordStats()
}

onMounted(() => {
  load()
  loadWordStats()
})

function percent(v) {
  return Math.round((v || 0) * 100) + '%'
}

function modeText(mode) {
  return mode === 'CN2EN' ? '汉译英' : '英译汉'
}

function levelText(level) {
  return { 1: '高频', 2: '中频', 3: '低频' }[level] || '-'
}

/** 退出登录后会自动切回一个新的游客身份 */
async function doLogout() {
  try {
    await ElMessageBox.confirm('退出后当前账号的学习记录仍保留在本地，可再次登录查看。', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消'
    })
  } catch (e) {
    return
  }
  await logout()
  ElMessage.success('已退出，当前为游客身份')
  load()
}

/**
 * 重置词库：两步确认。
 * 第一步讲清后果，第二步再确认一次，两次都点「继续」才真的发请求，
 * 避免用户顺手连点导致学习记录被清空。
 */
async function doResetWords() {
  try {
    await ElMessageBox.confirm(
      '重置会清空全部单词学习记录、错题本、复习计划与关卡进度，且无法恢复。只建议在词库严重错乱时使用。',
      '危险操作：重置词库',
      { confirmButtonText: '我了解风险，继续', cancelButtonText: '取消', type: 'warning' }
    )
    await ElMessageBox.confirm(
      '最后确认一次：学习数据删除后不可恢复（如需保留请先备份 data 目录下的 cet46.db 文件）。',
      '再次确认',
      { confirmButtonText: '确定重置', cancelButtonText: '放弃', type: 'error' }
    )
  } catch (e) {
    return
  }

  resetting.value = true
  try {
    const res = await apiWordReset()
    ElMessage.success(`词库已重置：${res.before} 词 → ${res.after} 词`)
    await Promise.all([load(), loadWordStats()])
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="page" v-loading="loading">
    <h1 class="page-title">我的</h1>
    <p class="page-sub">所有学习记录都保存在本地 SQLite 数据库里，换电脑时拷贝 data 目录即可。</p>

    <div v-if="data">
      <!-- 数据概览 -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">{{ data.learnedWords }}</div>
          <div class="stat-label">学过的单词</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ data.totalAnswers }}</div>
          <div class="stat-label">累计作答</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ percent(data.accuracy) }}</div>
          <div class="stat-label">累计正确率</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ data.passedStages }}</div>
          <div class="stat-label">通关关卡</div>
        </div>
        <div class="stat-card">
          <div class="stat-value orange">{{ data.wrongCount }}</div>
          <div class="stat-label">错题本</div>
        </div>
        <div class="stat-card">
          <div class="stat-value blue">{{ data.pendingReview }}</div>
          <div class="stat-label">复习计划中</div>
        </div>
      </div>

      <!-- 账号 -->
      <div class="card account">
        <div>
          <div class="acc-name">
            {{ data.nickname }}
            <el-tag v-if="data.isGuest" size="small" type="warning" effect="plain">游客</el-tag>
            <el-tag v-else size="small" type="success" effect="plain">本地账号</el-tag>
          </div>
          <div class="muted" style="margin-top: 4px">账号：{{ data.username }}</div>
        </div>
        <div class="row">
          <el-button v-if="data.isGuest" type="primary" @click="router.push('/login')">
            登录 / 注册
          </el-button>
          <el-button v-else @click="doLogout">退出登录</el-button>
        </div>
      </div>

      <!-- 最近闯关记录 -->
      <div class="card" style="margin-top: 14px">
        <div class="section-title">最近闯关记录</div>
        <el-table v-if="data.recentRecords.length" :data="data.recentRecords" size="small" style="width: 100%">
          <el-table-column label="关卡" width="140">
            <template #default="{ row }">{{ levelText(row.freqLevel) }} · 第 {{ row.stageNo }} 关</template>
          </el-table-column>
          <el-table-column label="模式" width="90">
            <template #default="{ row }">{{ modeText(row.mode) }}</template>
          </el-table-column>
          <el-table-column label="正确率" width="90">
            <template #default="{ row }">{{ percent(row.accuracy) }}</template>
          </el-table-column>
          <el-table-column label="答对 / 总数" width="110">
            <template #default="{ row }">{{ row.correctCount }} / {{ row.total }}</template>
          </el-table-column>
          <el-table-column label="用时" width="80">
            <template #default="{ row }">{{ row.durationSec }}s</template>
          </el-table-column>
          <el-table-column prop="newWordCount" label="新增生词" width="90" />
          <el-table-column prop="createTime" label="时间" min-width="140" />
        </el-table>
        <el-empty v-else description="还没有闯关记录" :image-size="80" />
      </div>

      <!-- 词库维护：日常不需要动，只在词库异常时使用 -->
      <div class="card" style="margin-top: 14px">
        <div class="section-title">词库维护</div>
        <div class="word-stats" v-if="wordStats">
          <span class="muted">当前词库共</span>
          <span class="word-total">{{ wordStats.total }}</span>
          <span class="muted">词（高频 {{ wordStats.level1 }} / 中频 {{ wordStats.level2 }} / 低频 {{ wordStats.level3 }}）</span>
        </div>
        <div class="danger-zone">
          <div>
            <div class="danger-title">重置词库</div>
            <div class="muted danger-hint">
              清空单词学习记录、错题本、复习计划与关卡进度，并按内置词库全量重新导入。数据不可恢复，请谨慎操作。
            </div>
          </div>
          <el-button type="danger" plain :loading="resetting" @click="doResetWords">重置词库</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
}

.stat-value.orange {
  color: #e6a23c;
}

.stat-value.blue {
  color: #409eff;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.account {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.acc-name {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.word-stats {
  font-size: 13px;
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 14px;
}

.word-total {
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
}

.danger-zone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid #fde2e2;
  background: #fef6f6;
  border-radius: 8px;
}

.danger-title {
  font-size: 13px;
  font-weight: 600;
  color: #f56c6c;
}

.danger-hint {
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.6;
}
</style>
