// =====================================================================
// Electron 主进程
// 职责只有三件事：
//   1. 启动内置的 SpringBoot jar（对方电脑不需要装 Java，用的是随包携带的精简 JRE）
//   2. 等后端健康检查通过后再打开窗口，避免出现白屏 / 请求失败
//   3. 退出时把后端进程一起收掉，不留后台僵尸进程
// 不需要 preload 脚本：页面通过 HTTP 接口取数据，主进程不向渲染进程暴露任何 Node 能力。
// =====================================================================

const { app, BrowserWindow, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { spawn } = require('child_process')

/** 后端固定端口，与 application.yml 以及前端 .env.production 保持一致 */
const PORT = 8080
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`

let mainWindow = null
let javaProcess = null

const isDev = () => !app.isPackaged

/**
 * 程序"真实所在目录"。
 *
 * <p>坑：electron-builder 的便携版（portable）单文件 exe 运行时会把自己解压到
 * %TEMP% 下的一个临时目录再启动，此时 app.getPath('exe') 返回的是**临时目录**。
 * 如果照它取路径写数据库，用户每关一次程序记录就全没了。
 * 便携版会把真实位置放在 PORTABLE_EXECUTABLE_DIR 环境变量里，优先用它。
 */
function realAppDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR
  return path.dirname(app.getPath('exe'))
}

/**
 * 启动日志文件位置。
 * 打包后 Electron 没有控制台，出问题时学生看不到任何信息，所以统一写进 exe 同目录的 app.log。
 * 写不进去（比如装在 Program Files）就退回用户数据目录。
 */
function resolveLogPath() {
  const candidates = isDev()
    ? [path.join(__dirname, 'app.log')]
    : [path.join(realAppDir(), 'app.log'), path.join(app.getPath('userData'), 'app.log')]
  for (const file of candidates) {
    try {
      fs.appendFileSync(file, '')
      return file
    } catch (e) {
      // 换下一个候选位置
    }
  }
  return null
}

let LOG_FILE = null

/** 带时间戳写一行日志，同时尽量输出到控制台（开发模式可见） */
function log(...args) {
  const line = `[${new Date().toLocaleString('zh-CN')}] ${args.join(' ')}`
  try {
    if (LOG_FILE) fs.appendFileSync(LOG_FILE, line + '\r\n')
  } catch (e) {
    // 日志失败不影响主流程
  }
  console.log(line)
}

/**
 * 打包后 resources 目录下资源的绝对路径。
 *
 * 只能用 process.resourcesPath —— 不能用 app.getPath('exe') 或 realAppDir()：
 * 便携版 exe 会先解压到 %TEMP% 再启动，真实目录（PORTABLE_EXECUTABLE_DIR）里
 * 并没有随包资源，jar / JRE / 前端都只在解压出来的 resources 目录里。
 */
function resourcePath(...parts) {
  return path.join(process.resourcesPath, ...parts)
}

/** 后端 jar 位置：打包后在 resources/backend，开发时直接用 mvn 的产物 */
function resolveJarPath() {
  return isDev()
    ? path.join(__dirname, '..', 'backend', 'target', 'cet46-word-platform.jar')
    : resourcePath('backend', 'cet46-word-platform.jar')
}

/** 前端页面位置：打包后在 resources/frontend，开发时用 vite 构建产物 */
function resolveIndexHtml() {
  return isDev()
    ? path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
    : resourcePath('frontend', 'index.html')
}

/** 找 java 可执行文件：优先环境变量，其次随包 JRE，最后退回系统 java */
function resolveJavaBinary() {
  if (process.env.CET46_JAVA) return process.env.CET46_JAVA
  const bundled = resourcePath('jre', 'bin', 'javaw.exe')
  if (fs.existsSync(bundled)) return bundled
  return 'java'
}

/**
 * 数据库位置：
 *   开发时 -> D:/projects/cet46-word-platform/data/cet46.db
 *   打包后 -> 优先放在程序同级 data 目录（绿色版，换电脑拷贝文件夹即可带走记录）
 *             如果该目录不可写（例如装在 Program Files），退回用户数据目录
 */
function resolveDbPath() {
  if (process.env.CET46_DB_PATH) return process.env.CET46_DB_PATH
  if (isDev()) return path.join(__dirname, '..', 'data', 'cet46.db')

  const dir = realAppDir()
  try {
    fs.accessSync(dir, fs.constants.W_OK)
    return path.join(dir, 'data', 'cet46.db')
  } catch (e) {
    return path.join(app.getPath('userData'), 'cet46.db')
  }
}

/** 启动后端 jar */
function startBackend() {
  const jarPath = resolveJarPath()
  if (!fs.existsSync(jarPath)) {
    throw new Error(`找不到后端程序：${jarPath}\n请先在 backend 目录执行 mvn package，并确认已把 jar 打进 resources/backend`)
  }

  const dbPath = resolveDbPath()
  const javaBin = resolveJavaBinary()

  // SQLite 只会建数据库文件，不会自己建父目录；父目录不存在时启动会直接失败
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  } catch (e) {
    log('[app] 创建数据目录失败：', e.message)
  }

  log('[app] java =', javaBin)
  log('[app] jar  =', jarPath)
  log('[app] 数据库 =', dbPath)

  javaProcess = spawn(
    javaBin,
    [
      '-jar',
      jarPath,
      `--server.port=${PORT}`,
      `--app.db-path=${dbPath}`,
      '--spring.main.banner-mode=off',
      // 关闭彩色日志，避免打包后日志文件里出现乱码
      '--spring.output.ansi.enabled=never'
    ],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
  )

  javaProcess.stdout.on('data', (data) => log('[backend]', String(data).trim()))
  javaProcess.stderr.on('data', (data) => log('[backend]', String(data).trim()))
  javaProcess.on('error', (err) => log('[app] 后端进程启动失败：', err.message))
  javaProcess.on('exit', (code) => {
    log('[app] 后端进程退出，code =', code)
    javaProcess = null
  })
}

/** 关掉后端进程 */
function stopBackend() {
  if (javaProcess && !javaProcess.killed) {
    try {
      javaProcess.kill()
    } catch (e) {
      log('[app] 关闭后端失败：', e.message)
    }
    javaProcess = null
  }
}

/**
 * 单次健康检查，返回解析后的 data（失败返回 null）。
 *
 * <p>为什么不是"状态码 200 就算好"：SpringBoot 的 Tomcat 在容器刷新阶段就起来了，
 * 而词库导入挂在 ApplicationRunner 上、在 Tomcat 起来之后才跑。
 * 实测全新数据库首启动时，/api/health 在 6.5 秒就返回 200，但 wordCount 只有 2811（导入到一半），
 * 直到 8.2 秒才补齐 5547。如果只认 200，窗口会在这个空档打开，
 * 前端拿到的分级词数是错的（关卡数会按半套词库算出来）。所以这里要连 wordCount 一起看。
 */
function pingBackend() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 1500 }, (res) => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => (raw += chunk))
      res.on('end', () => {
        if (res.statusCode !== 200) return resolve(null)
        try {
          const body = JSON.parse(raw)
          resolve(body && body.data ? body.data : null)
        } catch (e) {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
  })
}

/**
 * 轮询等待后端真正就绪（首次启动要建库 + 导入 5547 词，给 90 秒余量）。
 *
 * 判定条件：wordCount > 0 且连续两次读数一致。
 * "连续两次一致"用来躲开导入仍在进行中的中间态，代价只是多等一个 600ms 周期。
 */
async function waitForBackend(timeoutMs = 90000) {
  const start = Date.now()
  let lastCount = -1
  let stableRounds = 0
  let lastSeen = 0

  while (Date.now() - start < timeoutMs) {
    const data = await pingBackend()
    if (data) {
      const count = Number(data.wordCount) || 0
      lastSeen = count
      if (count > 0 && count === lastCount) {
        stableRounds += 1
        if (stableRounds >= 2) {
          log('[app] 后端就绪，词库', count, '词，累计耗时', ((Date.now() - start) / 1000).toFixed(1) + 's')
          return true
        }
      } else {
        stableRounds = 0
      }
      lastCount = count
    } else {
      stableRounds = 0
      lastCount = -1
    }
    await new Promise((r) => setTimeout(r, 600))
  }

  log('[app] 等待超时，最后一次看到的词数是', lastSeen)
  return false
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 800,
    minWidth: 920,
    minHeight: 640,
    backgroundColor: '#f5f7fa',
    autoHideMenuBar: true,
    title: '四六级单词闯关',
    webPreferences: {
      // 页面只需要发 HTTP 请求，不需要任何 Node 能力，保持最小权限
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const indexHtml = resolveIndexHtml()
  log('[app] 加载页面 =', indexHtml)
  mainWindow.loadFile(indexHtml)

  // 页面里的外链一律用系统浏览器打开，不在应用内跳转
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 主进程任何未捕获异常都写进日志并弹框，避免"双击没反应"却查不到原因
process.on('uncaughtException', (err) => {
  log('[app] 未捕获异常：', err && err.stack ? err.stack : String(err))
  dialog.showErrorBox('程序异常', String((err && err.message) || err))
  app.quit()
})

// 只允许开一个实例，避免两个后端抢 8080 端口
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    LOG_FILE = resolveLogPath()
    log('========== 应用启动 ==========')
    log('[app] 版本 =', app.getVersion(), ' 打包态 =', app.isPackaged)
    log('[app] 日志文件 =', LOG_FILE)

    try {
      startBackend()
    } catch (e) {
      log('[app] 启动后端失败：', e.message)
      dialog.showErrorBox('启动失败', String(e.message || e))
      app.quit()
      return
    }

    log('[app] 等待后端就绪 ...')
    const ready = await waitForBackend()
    if (!ready) {
      log('[app] 后端 90 秒内未就绪，退出')
      dialog.showErrorBox(
        '后端启动超时',
        `本地服务未能在 90 秒内就绪。\n\n常见原因：\n1. 8080 端口被其他程序占用（比如旧的本程序没关干净）；\n2. 安装目录没有写入权限，数据库建不出来；\n3. 杀毒软件拦截了程序自带的 Java。\n\n详细信息见安装目录下的 app.log。`
      )
      stopBackend()
      app.quit()
      return
    }

    log('[app] 后端就绪，创建窗口')
    createWindow()
  })

  app.on('window-all-closed', () => {
    stopBackend()
    app.quit()
  })

  app.on('before-quit', stopBackend)
}
