<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, register } from '../store/user'

/**
 * 本地账号登录 / 注册。
 * 说明：账号只存在于本机 SQLite，不联网、不上传；忘记密码只能重建账号。
 */
const router = useRouter()
const tab = ref('login')
const loading = ref(false)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', password: '', confirm: '', nickname: '' })

async function doLogin() {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await login(loginForm.username.trim(), loginForm.password)
    ElMessage.success('登录成功')
    router.push('/profile')
  } finally {
    loading.value = false
  }
}

async function doRegister() {
  const username = registerForm.username.trim()
  if (username.length < 3) {
    ElMessage.warning('用户名至少 3 个字符')
    return
  }
  if (registerForm.password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  if (registerForm.password !== registerForm.confirm) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await register(username, registerForm.password, registerForm.nickname.trim())
    ElMessage.success('注册成功，已自动登录')
    router.push('/profile')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <span class="logo">CET</span>
        <span class="brand-text">四六级单词闯关</span>
      </div>

      <el-tabs v-model="tab" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="用户名">
              <el-input v-model="loginForm.username" placeholder="请输入用户名" @keyup.enter="doLogin" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="loginForm.password"
                type="password"
                show-password
                placeholder="请输入密码"
                @keyup.enter="doLogin"
              />
            </el-form-item>
            <el-button type="primary" :loading="loading" style="width: 100%" @click="doLogin">
              登录
            </el-button>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="用户名">
              <el-input v-model="registerForm.username" placeholder="3~20 个字符，仅本机有效" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="registerForm.password" type="password" show-password placeholder="至少 6 位" />
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input v-model="registerForm.confirm" type="password" show-password placeholder="再输入一次" />
            </el-form-item>
            <el-form-item label="昵称（可选）">
              <el-input v-model="registerForm.nickname" placeholder="不填则用用户名" />
            </el-form-item>
            <el-button type="primary" :loading="loading" style="width: 100%" @click="doRegister">
              注册并登录
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="tips">
        <span>账号只保存在本机数据库，不会上传</span>
        <el-button text type="primary" size="small" @click="router.push('/')">先以游客身份使用</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(140deg, #eef5ff, #f7fbff 60%, #fdf7ef);
  padding: 20px;
}

.login-card {
  width: 380px;
  max-width: 100%;
  background: #fff;
  border-radius: 14px;
  padding: 26px 24px 18px;
  box-shadow: 0 10px 40px rgba(64, 158, 255, 0.12);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin-bottom: 18px;
}

.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #409eff;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.brand-text {
  font-size: 16px;
  font-weight: 600;
}

.tips {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}
</style>
