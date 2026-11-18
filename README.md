# 四六级单词闯关背诵平台

一个完全离线的四六级背词项目。核心玩法是把词库切成「关卡」：答对推进关卡，答错进入复习队列，按艾宾浩斯间隔（0 / 1 / 2 / 4 / 7 天）安排复习。

在同一份 SpringBoot 代码上做了两套部署形态：

| | 桌面版 | 手机版（H5） |
| --- | --- | --- |
| 技术栈 | SpringBoot + MyBatis + SQLite + Vue3 + Element Plus + Electron | 纯前端 Vue3 + IndexedDB |
| 形态 | Windows `.exe`，双击即用，自带 Java 运行时 | 手机浏览器打开网址，可「添加到主屏幕」 |
| 数据 | 本地 SQLite 单文件 | 浏览器 IndexedDB |
| 联网 | 完全离线 | 首次加载词库后可离线 |

**5547 词 / 3 个难度 / 29 个词库文件 / 279 关。**

## 快速开始

### 只跑手机版（不需要 Java，最省事）

```bash
cd mobile
npm install
npm run dev        # http://localhost:5174
```

### 跑桌面版（需要 JDK 17 + Node 18+）

```bash
# 0) 先建数据库目录（后端启动时会在这里建库并导入词库）
mkdir data

# 1) 后端（JAVA_HOME 必须是 JDK 17；Lombok 在 JDK 21+ 会编译失败）
cd backend
mvn package

# 2) 前端
cd ../frontend
npm install && npm run build

# 3) 起后端（默认 127.0.0.1:8080，数据库 ./data/cet46.db）
java -jar ../backend/target/cet46-word-platform.jar

# 4) 桌面壳
cd ../desktop
npm install && npm start
```

Windows 下 `scripts/` 里有现成脚本：`dev-start.bat`（后端+前端一键起）、`build-exe.bat`（打包 exe）。
脚本里的路径全部按「脚本所在目录」推算，换机器不用改。

## 目录结构

```
backend/          SpringBoot + MyBatis + SQLite，启动时幂等建表并导入词库
  src/main/resources/db/    schema.sql + 29 个分级词库 JSON（共 5547 词）
frontend/         Vue3 + Element Plus（桌面版界面）
desktop/          Electron 壳：拉起后端 jar、加载前端、管理窗口
mobile/           手机版纯前端，词库走 IndexedDB，可离线
deploy-site/      手机版静态站点，可直接丢到任意 HTTPS 托管（含 SW 缓存）
docs/             词库扩充指南、API、H5 部署说明、局域网排查记录
scripts/          启动 / 打包 / 词库去重脚本
```

## 词库说明

词表、释义与例句均为本项目自行整理编写，按词频分成 3 个难度、29 个文件，随程序打包，**不联网拉取、不含真题、不含听力音频**。
仅供学习参考；如权利人认为有不当之处，请提 issue，会立即删除。

## License

MIT
## 两个版本一览（先看这里，别选错）

| 对比项 | 桌面版（Windows exe） | 手机版（H5 网页） |
| --- | --- | --- |
| 目标设备 | Windows 10/11 电脑 | 安卓 / iPhone 手机浏览器 |
| 使用方式 | 双击 exe，独立窗口 | 浏览器打开网址（可「添加到主屏幕」像 App 一样用） |
| 需要装什么 | 什么都不用装（exe 自带 Java 和数据库） | 什么都不用装（不用装 App） |
| 数据存哪 | `data\cet46.db`（SQLite 单文件） | 手机浏览器 IndexedDB（本地数据库） |
| 词库 | 后端启动时导入 SQLite，5547 词 | 内置 3 份 JSON，进哪个难度下哪份，5547 词 |
| 后端依赖 | **需要**本地 SpringBoot（exe 会自动拉起） | **不需要**，纯前端离线运行 |
| 联网要求 | 完全离线 | 首次打开需联网下载约 1.1MB；已缓存的难度之后可离线 |
| 账号体系 | 游客 + 本地账号注册/登录 | 无账号概念，单机一个人用 |
| 数据互通 | 两套数据**互相独立**，本期不做同步 | 同左 |
| 适合场景 | 坐下来一口气过整关、看完整报告 | 通勤排队刷几关、睡前复习 |

> **数据为什么不互通**：本期刻意不做电脑↔手机同步（要加服务器和账号体系，复杂度翻倍）。
> 手机版是「碎片时间刷词」，桌面版是「整块时间过词」，各自独立反而更简单可靠。
> 两边**学习规则完全一致**（每关 20 词、60% 通关、艾宾浩斯 0/1/2/4/7 天、错题累计次数），
> 换设备最多是进度不接着，学习体验不会打架。

> **正式交付看这里**：手机版的正式成品是「部署到 HTTPS 静态托管、手机点链接即用」，
> 完整交付说明见 [`docs\移动端正式版-HTTPS静态托管交付说明.md`](docs/移动端正式版-HTTPS静态托管交付说明.md)。
> 下面的 ③④ 只是**开发者本机调试**，不是给小白用户的交付方式；正式交付不需要局域网地址，也不需要运行防火墙脚本。

**各自怎么启动（开发者本机）**

```bat
:: ① 桌面版（开发模式看效果）
双击 <仓库根>\scripts\dev-start.bat

:: ② 桌面版（直接跑打包好的 exe）
双击 <仓库根>\desktop\release\四六级单词闯关-1.0.0-便携版.exe

:: ③ 手机版（开发模式，电脑上先看效果）
cd /d <仓库根>\mobile
npm install
npm run dev
:: 然后浏览器打开 http://localhost:5174

:: ④ 手机版【仅开发调试】打包 + 起本地 5180 服务，同一 WiFi 真机验证
::    注意：这不是正式交付方式，正式版见上面的 HTTPS 静态托管文档
cd /d <仓库根>\mobile
npm run build
npm run serve
:: 终端会打印局域网地址，仅本机调试用；换 WiFi 后 IP 会变
```

---

## 一、功能清单（两个版本都具备）

| 模块 | 说明 |
| --- | --- |
| 分级词库 | 内置 **5547 词**（高频 1630 / 中频 1488 / 低频 2429），含单词、音标、中文释义、例句；启动时按单词去重**增量补齐**，装到别人电脑上离线可用 |
| 闯关模式 | 每关 20 词，按「高频→中频→低频」由易到难；支持**英译汉四选一**与**汉译英手敲拼写**两种题型 |
| 判题 | 答对自动进入下一题，答错立刻加入错题本并展示正确答案 |
| 错题本 | 分页查看错题、可删除、可单独发起「错题重练」 |
| 艾宾浩斯复习 | 答错当天进复习队列，之后按 0/1/2/4/7 天间隔推送；连续答对 5 次视为掌握，不再推送 |
| 学习报告 | 每次闯关结束输出正确率、用时、答对数、新增生词数 |
| 用户体系 | 游客模式（一键进入）+ 本地账号注册/登录，所有记录按用户隔离存在同一个 SQLite 文件里 |
| 关卡进度 | 每关记录最高正确率与通过状态，列表页直观显示「未解锁 / 已通过 / 满分」 |
| 扩展占位 | `/api/ext/battle/*`（WebSocket 双人对战）、`/api/ext/oauth/*`（QQ/微信登录）只返回"未实现"，业务代码留空 |

**手机版独有的三件事**（桌面版没有）：

| 能力 | 说明 |
| --- | --- |
| 无需后端 | 词库是静态 JSON，学习数据全在浏览器 IndexedDB，**不启动任何服务也能用** |
| 离线优先 | 进过的难度会缓存在手机上，飞行模式下照样闯关、记错题、看报告 |
| 可添加到桌面（PWA） | 安卓 Chrome / iPhone Safari 里「添加到主屏幕」，有自己的图标，打开是全屏无地址栏 |


> 本期**不做**：多人对战真实逻辑、第三方登录真实逻辑、云端同步。这三项都只留了接口定义。

---

## 二、技术栈与选型理由

| 层次 | 选型 | 理由 |
| --- | --- | --- |
| 后端 | SpringBoot 3.2.5 / **JDK 17** | 主流 LTS，生态最新；`pom.xml` 里锁定 `java.version=17` |
| 持久层 | MyBatis（注解式）+ `sqlite-jdbc` | SQL 全部写在代码里可见可改，SQLite 兼容最稳，简历上能体现真实 SQL 能力 |
| 连接池 | HikariCP（SpringBoot 自带） | 零额外依赖；SQLite 单写者，池只开 5 个连接避免 `database is locked` |
| 数据库 | SQLite 单文件 | 免安装、免服务，双击即用，符合"发给同学直接跑"的目标 |
| 前端 | Vue3 + Vite 5 + Element Plus + Pinia + Vue Router | 国内资料最多、组件最全 |
| 桌面壳 | Electron 33 + electron-builder | 打包 Windows nsis 安装包 |
| 内置运行时 | jlink 剪裁 JRE（约 44MB） | 安装包自带 Java，对方无需装 JDK |
| 手机端 | Vue3 + Vite 5 + **IndexedDB**，不引 UI 组件库 | 手机浏览器直接打开，无需装 App；自己写轻量样式，包体只有 100KB（gzip 40KB），弱网也快 |
| 手机端离线 | Service Worker + Manifest | 断网可打开、可添加到桌面（PWA），核心页面和词库都缓存在本地 |

**依赖刻意保持最少**：后端只有 `web / validation / mybatis / sqlite-jdbc / lombok`，前端只有 `vue / vue-router / pinia / element-plus / axios / vite`，没引入任何需要单独安装的中间件。

---

## 三、D 盘目录结构

```
<仓库根>
├── backend\                                  # 后端 SpringBoot 工程
│   ├── pom.xml                               # 依赖配置（JDK17 + SpringBoot 3.2.5 + MyBatis + SQLite）
│   ├── src\main\java\com\cet46\
│   │   ├── WordPlatformApplication.java      # 启动类
│   │   ├── common\                           # 公共组件
│   │   │   ├── ApiResponse.java              # 统一返回结构 {code,message,data}
│   │   │   ├── BizException.java             # 业务异常
│   │   │   ├── GlobalExceptionHandler.java   # 全局异常处理
│   │   │   ├── Constants.java                # 题型/状态等常量
│   │   │   └── UserContext.java              # ThreadLocal 保存当前登录用户
│   │   ├── config\
│   │   │   ├── AppProperties.java            # 自定义配置（库路径/关卡词数/复习间隔）
│   │   │   ├── AuthInterceptor.java          # 登录拦截器（校验 X-Token）
│   │   │   └── WebConfig.java                # 拦截器注册 + 跨域
│   │   ├── controller\                       # 6 个 REST 控制器
│   │   ├── service\                          # 业务逻辑（出题、判分、复习、错题、报告）
│   │   ├── mapper\                           # MyBatis 注解 Mapper（SQL 全在这里）
│   │   ├── entity\                           # 7 张表对应的实体
│   │   ├── dto\                              # 请求/响应对象
│   │   ├── init\WordImportRunner.java        # 启动时导入词库（幂等）
│   │   ├── extension\                        # 扩展接口占位（对战 / OAuth）
│   │   └── util\                             # 时间、密码工具
│   └── src\main\resources\
│       ├── application.yml                   # 全部可调配置
│       └── db\
│           ├── schema.sql                    # 建表语句（IF NOT EXISTS，幂等）
│           └── words-level*.json             # 分级词库源文件（29 个，合计 5547 词）
│
├── frontend\                                 # 前端 Vue3 工程
│   ├── package.json
│   ├── vite.config.js                        # base:'./' + /api 代理
│   ├── .env.development                      # VITE_API_BASE=/api
│   ├── .env.production                       # VITE_API_BASE=http://127.0.0.1:8080/api
│   └── src\
│       ├── main.js / App.vue
│       ├── api\request.js                    # axios 封装（自动带 X-Token、统一错误提示）
│       ├── api\index.js                      # 所有接口函数
│       ├── store\token.js / user.js          # 令牌与用户状态
│       ├── router\index.js
│       ├── assets\style.css
│       └── views\
│           ├── HomeView.vue                  # 首页（今日数据、入口）
│           ├── LoginView.vue                 # 游客/账号登录注册
│           ├── StageListView.vue             # 关卡列表（三个级别 + 题型切换）
│           ├── QuizView.vue                  # 答题页（选择 + 拼写两种模式）
│           ├── WrongBookView.vue             # 错题本
│           ├── ReviewView.vue                # 今日复习
│           └── ProfileView.vue               # 我的（学习报告）
│
├── mobile\                                   # 手机版 H5 工程（纯前端，不依赖后端）
│   ├── package.json                          # 只有 vue / vue-router / vite，没有 UI 组件库
│   ├── vite.config.js                        # base:'./' + 端口 5174（避开桌面端 5173）
│   ├── index.html                            # 入口（含 PWA manifest / 图标 / 状态栏配色）
│   ├── public\
│   │   ├── .nojekyll                        # 禁用 GitHub Pages 的 Jekyll 构建（保住 _ 开头的 chunk）
│   │   ├── data\
│   │   │   ├── index.json                    # 词库目录（总词数、三档分布），首页秒开用
│   │   │   ├── words-level1.json             # 高频 1630 词（进高频时才下载）
│   │   │   ├── words-level2.json             # 中频 1488 词
│   │   │   └── words-level3.json             # 低频 2429 词
│   │   ├── icons\                            # PWA 图标（192/512/maskable/apple-touch）
│   │   ├── manifest.webmanifest              # PWA 配置（名称、图标、全屏启动）
│   │   └── sw.js                             # Service Worker（离线缓存策略）
│   ├── scripts\
│   │   ├── build-words.mjs                   # 从后端词库导出 3 份 JSON（去重 + 固定 id）
│   │   ├── build-icons.mjs                   # 生成 PWA 图标（纯代码绘制，不装图形库）
│   │   ├── check-words.mjs                   # 词库自检（词数 / 重复 / 字段缺失）
│   │   └── serve.mjs                         # 本地静态服务器，打印手机可访问的局域网地址
│   └── src\
│       ├── main.js / App.vue                 # 入口 + 应用外壳（底部导航）
│       ├── router\index.js                   # hash 路由（静态托管不用配 rewrite）
│       ├── styles\app.css                    # 全局样式（配色与桌面端一致，尺寸按手机重做）
│       ├── db\index.js                       # IndexedDB 封装（6 个对象仓 + 事务工具）
│       ├── core\
│       │   ├── constants.js                  # 关卡词数 / 通关线 / 复习间隔（与后端一致）
│       │   ├── wordBank.js                   # 词库懒加载 + 本地缓存
│       │   ├── quiz.js                       # 出题（4 选项生成、拼写判分）
│       │   ├── progress.js                   # 交卷 / 错题 / 复习推进（复刻后端规则）
│       │   ├── stats.js                      # 统计查询（学习报告、错题本、复习列表）
│       │   └── time.js                       # 时间格式化（与后端同格式，便于将来同步）
│       ├── components\
│       │   ├── TabBar.vue                    # 底部导航（内联 SVG 图标）
│       │   └── StatusBlock.vue               # 加载中 / 空状态统一组件
│       └── views\
│           ├── HomeView.vue                  # 首页（三档进度 + 今日复习提醒）
│           ├── StageListView.vue             # 关卡列表（题型切换 + 关卡网格）
│           ├── QuizView.vue                  # 答题页（闯关 / 错题重练 / 复习共用）
│           ├── WrongBookView.vue             # 错题本
│           ├── ReviewView.vue                # 复习计划
│           ├── ReportView.vue                # 学习报告 + 数据管理
│           └── WordsView.vue                 # 词库分级展示（搜索 / 分页）
│
├── desktop\                                  # Electron 桌面壳
│   ├── package.json                          # electron-builder 打包配置
│   ├── main.js                               # 主进程：拉起后端 jar → 等健康检查 → 开窗口
│   └── runtime\jre\                          # jlink 生成的精简 JRE（构建产物，可重新生成）
│
├── scripts\                                  # 一键脚本（双击即可）
│   ├── dev-start.bat                         # 开发模式：同时起后端 8080 + 前端 5173
│   ├── start-backend.bat                     # 只起后端
│   ├── build-jre.bat                         # 生成精简 JRE
│   ├── build-exe.bat                         # 一键打包 exe（后端→前端→JRE→安装包）
│   ├── start-mobile-dev.bat                  # 手机版开发模式（5174，改代码即时生效）
│   ├── start-mobile-web.bat                  # 【仅开发调试】打包 + 起本地 5180 服务
│   └── fix-firewall-5180.bat                 # 【仅开发调试】局域网连不上时放行 5180，正式交付不需要
│
├── data\                                     # SQLite 数据库目录（首次启动自动生成 cet46.db）
└── docs\
    ├── API.md                                # 接口清单
    ├── 词库扩充指南.md                        # 词库结构说明与继续扩词方法
    ├── 移动端正式版-HTTPS静态托管交付说明.md   # 【正式交付】部署/验收/限制/版权/小白说明
    ├── 迭代归档-01-移动端H5.md                # 手机版这次迭代的目标/选型/验证/限制
    └── 排查报告-H5局域网访问.md               # 【仅开发调试】局域网排查记录，非交付内容
```

---

## 四、环境要求

| 工具 | 版本 | 说明 |
| --- | --- | --- |
| JDK | **17**（`C:\Program Files\Java\jdk-17`） | ⚠️ 必须 17。不少机器的默认 `JAVA_HOME` 指向更高版本（如 JDK 25），**Lombok 在 25 下不工作，编译会失败**，所以脚本里都显式指定了 JDK17 |
| Maven | 3.6+ | 已装 3.9.16 |
| Node.js | 18+ | 已装 v22 |
| 操作系统 | Windows 10/11 x64 | 打包目标是 Windows |

---

## 五、本地启动教程（分步，全部 D 盘）

### 第 1 步：编译后端

```bat
cd /d <仓库根>\backend
set JAVA_HOME=C:\Program Files\Java\jdk-17
mvn -DskipTests clean package
```

成功标志：`backend\target\cet46-word-platform.jar`（约 37MB）。
> 注意 `set JAVA_HOME` 这一行必须在同一个命令行窗口里、在 `mvn` 之前执行，否则会用 JDK25 编译而报 Lombok 错误。

### 第 2 步：启动后端

双击 `<仓库根>\scripts\start-backend.bat`
或手敲：

```bat
cd /d <仓库根>\backend
C:\Program Files\Java\jdk-17\bin\java -jar target\cet46-word-platform.jar
```

看到 `Started WordPlatformApplication` 即成功。浏览器访问 <http://127.0.0.1:8080/api/health> 应返回：

```json
{"code":0,"message":"ok","data":{"wordCount":5547,"version":"1.0.0","status":"UP"}}
```

首次启动会自动：① 在 `data\` 下创建 `cet46.db`；② 执行 `schema.sql` 建表；③ 导入 5547 个单词（按单词文本去重，重复启动只补缺不重复插入；中断后重启会自动补齐）。

### 第 3 步：启动前端（开发模式）

```bat
cd /d <仓库根>\frontend
npm install
npm run dev
```

浏览器打开 <http://127.0.0.1:5173>。开发模式下 `/api` 由 Vite 代理到 8080，无跨域问题。

### 第 4 步（可选）：前后端一起起

双击 `<仓库根>\scripts\dev-start.bat`，会开两个窗口分别跑后端和前端。

### 想重置所有学习记录？

关掉后端，删除 `<仓库根>\data\cet46.db`，重新启动即可。

---

## 五之二、手机版（H5）启动教程（开发者本机调试用）

> **正式交付请转**：[`docs\移动端正式版-HTTPS静态托管交付说明.md`](docs/移动端正式版-HTTPS静态托管交付说明.md)。
> 正式版是「`npm run build` → 把 `dist` 传到 HTTPS 静态托管 → 手机点链接」，**不需要局域网、不需要本机 IP、不需要防火墙脚本、不需要电脑开机**。
> 本节保留的是开发者在本机看效果 / 真机调试的步骤，局域网地址不是正式访问地址。

手机版是**独立工程**，不用启动后端也能跑。整个流程只有三条命令。

> **懒人版**：不想敲命令就双击 `<仓库根>\scripts\start-mobile-dev.bat`
> （开发模式）或 `start-mobile-web.bat`（打包后给手机用）。下面是想搞懂原理时的分步说明。

### 第 1 步：装依赖（只需一次）

```bat
cd /d <仓库根>\mobile
npm install
```

> 只有 3 个依赖（vue / vue-router / vite），几十秒装完。如果卡住，加镜像：
> `npm install --registry=https://registry.npmmirror.com`

### 第 2 步：电脑上看效果（开发模式）

```bat
cd /d <仓库根>\mobile
npm run dev
```

浏览器打开 **http://localhost:5174** 。
端口故意和桌面端的 5173 错开，两个项目可以同时开着互不干扰。

### 第 3 步：用手机打开（真机验证）

```bat
cd /d <仓库根>\mobile
npm run build
npm run serve
```

终端会直接打印两个地址，例如：

```
电脑上打开： http://localhost:5180
手机上打开： http://192.168.1.8:5180   （手机需和电脑连同一个 WiFi）
```

**手机连同一个 WiFi，把这个地址输进浏览器就能用了。**
这一步用的是真正打包后的产物，和以后部署到服务器上跑的是同一份文件。

### 第 4 步（可选）：加到手机桌面，像 App 一样用（PWA）

只有走 **https 或 localhost** 时才能装到桌面（浏览器硬性规定）。
局域网 http 地址（`http://192.168.x.x:5180`）功能、数据全都正常，只是不能加桌面。

| 手机 | 操作 |
| --- | --- |
| 安卓 Chrome / Edge | 打开网页 → 右上角「⋮」→ **添加到主屏幕 / 安装应用** → 桌面出现「四六级单词」图标 |
| iPhone Safari | 打开网页 → 底部「分享」按钮 → **添加到主屏幕** → 右上角「添加」 |

装好之后从桌面图标进入，是**全屏无地址栏**的，和真 App 的观感一致。断网也能打开，
已经进过的难度、做过的题、错题本都在手机本地。

> 想真正实现「随时可装」：把 `mobile\dist` 部署到任意 https 静态站点即可（见下一节）。
> 只想在自己电脑上验证 PWA：`npm run serve` 后用电脑浏览器开 <http://localhost:5180> 也可以装。

### 想发给别人用？

`mobile\dist` 就是完整的静态网站（约 1MB，含 5547 词库），
丢到任何静态托管（Nginx、宝塔、GitHub Pages、OSS 都行）即可，**不需要后端**。
唯一要求：想用 PWA「添加到主屏幕」，必须走 **https**（本地 localhost 也行）；用局域网 http 打开时功能和数据全部正常，只是不能装到桌面。

### 手机版的数据在哪，怎么清？

- 数据存在**手机浏览器**的 IndexedDB 里（域名就是隔离边界，换浏览器/换手机就是新的一份）
- 清空：「我的 → 数据管理 → 清空学习记录」（两步确认）
- 也可以直接清浏览器该站点的数据，效果一样

### 改了词库怎么同步到手机版？

手机版的词库是静态 JSON，需要重新导出一遍：

```bat
cd /d <仓库根>\mobile
node scripts\build-words.mjs     :: 从后端词库导出 3 份 JSON（自动去重）
npm run check                    :: 自检：词数是否 5547、有没有重复、字段缺失
npm run build                    :: 重新打包
```

> 注意：改了词库要同时把 `public\sw.js` 里的 `VERSION` 加一，
> 否则手机上会一直用旧缓存。

---

## 六、Electron 打包 exe（完整步骤）

### 原理（先看懂再动手）

```
安装包.exe
└── 用户双击 → Electron 主进程 main.js
      ├─ 启动 resources\jre\bin\javaw.exe -jar resources\backend\cet46-word-platform.jar
      ├─ 轮询 http://127.0.0.1:8080/api/health 直到就绪（最多 90 秒）
      ├─ 打开窗口，加载 resources\frontend\index.html（file:// 协议）
      └─ 关窗时杀掉后端进程，不留僵尸
```

三个关键点：
1. **JRE 内置**：用 `jlink` 只保留 SpringBoot 真正用到的模块，44MB 替掉 200MB+ 的完整 JDK。
2. **数据库位置**：优先放在 exe 同级的 `data\` 目录（绿色版，整个文件夹拷走就带走记录）；若安装目录不可写（如装在 `Program Files`），自动退回 `%APPDATA%`。
3. **单实例锁**：`app.requestSingleInstanceLock()`，防止用户双击两次导致两个后端抢 8080 端口。

### 步骤 1：生成精简 JRE

双击 `<仓库根>\scripts\build-jre.bat`，产物在 `desktop\runtime\jre`（约 44MB，含 `bin\javaw.exe`）。

核心命令（脚本里就是这一条）：

```bat
C:\Program Files\Java\jdk-17\bin\jlink.exe ^
  --add-modules java.base,java.logging,java.naming,java.sql,java.desktop,java.management,java.instrument,java.security.jgss,java.xml,jdk.unsupported ^
  --strip-debug --no-header-files --no-man-pages --compress=2 ^
  --output <仓库根>\desktop\runtime\jre
```

> 这份模块列表已实测能跑通（5547 词导入 + 全接口调用都正常）。如果以后加了新依赖报 `ClassNotFoundException`，把对应模块名加进 `--add-modules` 即可。

### 步骤 2：安装 Electron 打包依赖

```bat
cd /d <仓库根>\desktop
npm install
```

> 国内网络下 electron 二进制可能下载失败（`ECONNRESET`）。此时加镜像：
> ```bat
> set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> npm install
> ```

### 步骤 3：打包安装包

```bat
cd /d <仓库根>\desktop
npm run dist
```

产物：`<仓库根>\desktop\release\四六级单词闯关-1.0.0-安装包.exe`

想让别人「免安装直接跑」，改用便携版：

```bat
npm run pack
```
产物是同目录下的单文件 exe，双击即开，不写注册表。

### 两个版本的区别（发给别人时选错会踩坑）

| | 安装包（nsis） | 便携版（portable） |
| --- | --- | --- |
| 需要安装 | 要，可自选目录、自动建快捷方式 | 不要，双击直接跑 |
| 数据库落在哪 | 安装目录下 `data\cet46.db` | **exe 所在目录**下 `data\cet46.db` |
| 换电脑带记录 | 要手动拷 `data` 目录 | 把 exe + `data` 目录一起拷走即可 |
| 适合 | 长期自己用 | 发给同学、放 U 盘 |

> 便携版有一个坑已经处理掉了：electron-builder 的便携版 exe 运行时会先把自己解压到 `%TEMP%` 再启动，
> 此时 `app.getPath('exe')` 返回的是**临时目录**。main.js 里改用 `PORTABLE_EXECUTABLE_DIR` 取真实路径，
> 否则每关一次程序学习记录就丢一次。

### 首次启动要等 8~10 秒（正常）

后端要在第一次启动时建库并导入 5547 个单词。实测时间线：

```
0.0s  启动 java
6~7s  /api/health 开始返回 200，但 wordCount 还在涨（1300 → 3255 → …，词库只导了一半）
8~9s  词库稳定在 5547，才认为"真正就绪"
9s    窗口打开
```

main.js 的 `waitForBackend()` 会等到 `wordCount > 0` **且连续两次读数一致**才开窗口，
避免前端拿到半套词库、把关卡数算错。第二次以后启动词库已齐备，约 5~6 秒即可。

### 一键全流程（推荐）

```
双击 <仓库根>\scripts\build-exe.bat
```

它会依次执行：后端 `mvn package` → 前端 `npm run build` → 生成 JRE → `npm run dist`，最后打印安装包路径。

### 打包配置在哪

`desktop\package.json` 的 `build` 节点：

- `extraResources`：把 jar / 前端 dist / 精简 JRE 塞进 `resources\`
- `win.target`：`nsis` 安装包（x64）；`npm run pack` 走 `portable`
- `signAndEditExecutable: false`：Windows 下没有签名证书、又缺少创建符号链接的权限时，
  不关掉这一项 `winCodeSign` 解压会失败。代价是 exe 没有签名和自定义图标，杀软可能提示"未知发布者"

---

## 七、常见问题

| 现象 | 原因与解决 |
| --- | --- |
| `mvn package` 报 Lombok 相关错误 | 用了 JDK25。先 `set JAVA_HOME=C:\Program Files\Java\jdk-17` 再执行 mvn |
| 启动报 `Port 8080 was already in use` | 上次后端没退干净。`netstat -ano \| findstr 8080` 找到 PID 后 `taskkill /PID xxx /F` |
| 页面打开空白 / 请求全失败 | 后端没起来。先访问 `/api/health` 确认，再刷新页面 |
| 打包后双击没反应 | 看是否被杀软拦截；安装目录下若有日志先看日志；确认 `resources\jre\bin\javaw.exe` 存在 |
| 弹窗「启动失败 / resourcePath is not defined」 | 这是 **v1.2.0 及更早 exe 的已知缺陷**：主进程 `desktop\main.js` 调用了没定义的 `resourcePath()`，v1.2.1 已修好。重新运行 `desktop\release\四六级单词闯关-1.0.0-安装包.exe` **覆盖安装**即可（不用卸载），或直接用新的便携版 exe |
| 首次双击要等好几秒 | 正常。第一次启动要建库 + 导入 5547 个单词，约 8~10 秒 |
| 便携版关掉再开，记录没了 | 便携版数据在 **exe 同目录的 `data\cet46.db`**。如果 exe 放在只读位置或临时目录里就会丢，请放到普通文件夹 |
| 词数变少了 / 分级乱了 | 我的 → 词库维护 → 重置词库（需两次确认，会清空全部学习记录）。只是缺词的话**不用重置**，重启程序会自动补齐 |
| SQLite `database is locked` | 开了两个后端实例。确认只有一个进程在跑（Electron 单实例锁已防这问题） |
| `npm install` 卡在 electron 下载 | 加 `ELECTRON_MIRROR` 镜像（见上文） |
| **手机版**：手机打不开局域网地址 | **仅开发者本机调试会遇到**。正式交付走 HTTPS 静态托管，不会有这个问题；部署与验收见 `docs\移动端正式版-HTTPS静态托管交付说明.md`。若确实在本机调试：①换 WiFi / 热点后电脑 IP 会变，重新 `ipconfig \| findstr "IPv4"` ②手机和电脑同一 WiFi ③Windows 防火墙可能拦 5180，管理员运行 `scripts\fix-firewall-5180.bat` ④部分公共 WiFi 有 AP 隔离。完整记录见 `docs\排查报告-H5局域网访问.md`（**非交付内容**） |
| **手机版**：提示「当前浏览器不支持本地存储」 | 用了 App 内置浏览器或极简浏览器。换 Chrome / Safari / Edge 打开 |
| **手机版**：添加到桌面后还是普通网页 | PWA 需要 **https** 或 localhost。局域网 http 下只能加书签，功能本身不受影响 |
| **手机版**：手机上数据突然空了 | 清过浏览器数据、换了浏览器、或用了无痕模式（无痕关掉就清空）。正常使用不会丢 |
| **手机版**：改了词库手机还是旧的 | 改 `public\sw.js` 里的 `VERSION`，重新 `npm run build`，手机上把该站点数据清一次 |

---

## 八、二次开发入口（建议按这个顺序读代码）

1. `resources\db\schema.sql` —— 先搞清楚 7 张表怎么设计的
2. `mapper\*.java` —— 每张表的 SQL 都在这里，注解里直接写 SQL
3. `service\StageService.java` —— 闯关主流程：出题 → 判分 → 落库 → 推复习
4. `service\QuestionBuilder.java` —— 两种题型怎么生成选项/干扰项
5. `service\ReviewService.java` —— 艾宾浩斯间隔表怎么推进
6. `controller\*.java` —— 接口层，很薄，只做参数校验和调 service
7. `frontend\src\views\QuizView.vue` —— 答题页，前端最复杂的一个页面
8. `desktop\main.js` —— Electron 怎么拉后端、怎么等就绪

手机版单独看这 5 个文件就够，逻辑是后端那套的「前端复刻版」：

9. `mobile\src\db\index.js` —— IndexedDB 6 个对象仓怎么设计（和 SQLite 的 7 张表一一对应）
10. `mobile\src\core\progress.js` —— **最重要**，交卷/错题/复习推进的全部规则，逐条对齐后端
11. `mobile\src\core\quiz.js` —— 出题与判分（4 选项怎么凑、拼写怎么比）
12. `mobile\src\core\wordBank.js` —— 词库懒加载与本地缓存
13. `mobile\src\views\QuizView.vue` —— 答题页，一个页面同时支撑闯关/错题重练/复习

---

## 九、接口速查

完整说明见 `docs\API.md`。所有接口统一返回 `{code, message, data}`，`code=0` 表示成功；除 `/api/health` 和 `/api/auth/*` 外都需要请求头 `X-Token`。

```
POST   /api/auth/guest                 游客登录（返回 token）
POST   /api/auth/register              注册
POST   /api/auth/login                 登录
POST   /api/auth/logout                退出
GET    /api/auth/me                    当前用户信息

GET    /api/stage/levels               三个级别的进度概览
GET    /api/stage/{level}/detail       某级别下全部关卡状态
GET    /api/stage/{level}/{no}/questions?mode=EN2CN|CN2EN   取本关题目
POST   /api/stage/submit               提交本关作答，返回报告

GET    /api/wrong-book                 错题分页
GET    /api/wrong-book/questions       错题重练出题
POST   /api/wrong-book/submit          提交错题重练结果
DELETE /api/wrong-book/{id}            移除一条错题

GET    /api/review/today               今日复习队列
GET    /api/review/questions           复习出题
POST   /api/review/submit              提交复习结果

GET    /api/profile/overview           学习报告（累计数据）

GET    /api/ext/battle/status          预留：对战状态（未实现）
GET    /api/ext/oauth/providers        预留：第三方登录（未实现）
```

---

## 十、版本记录

| 版本 | 内容 | 说明 |
| --- | --- | --- |
| v1.0.0 | 桌面版 MVP：SpringBoot + Vue3 + SQLite + Electron，打 Windows exe | 内置 888 词起版 |
| v1.1.0 | 词库补齐到 **5547 词**；导入改为「启动增量补齐」；新增「重置词库」兜底；修掉首启动拿到半套词库、便携版记录丢失两个问题 | exe 已重打，见 `desktop\release` |
| v1.2.0 | 新增**手机版 H5**（独立 `mobile\` 工程）：离线可用、PWA 可装桌面、规则与桌面端一致；桌面端代码零改动 | 详见 `docs\迭代归档-01-移动端H5.md` |
| v1.2.1 | 修复桌面 exe 启动弹窗「`resourcePath is not defined`」（`desktop\main.js` 调用了未定义的函数）；补主进程启动链冒烟测试；两个 exe 已重打 | **旧 exe 必须重新覆盖安装**，见下方常见问题 |
| v1.3.0 | 手机版切换为**面向小白的 HTTPS 静态托管正式成品**：新增 `.nojekyll`（修复 GitHub Pages 丢弃 `_` 开头 chunk）、manifest 补 `id`、SW 缓存版本升到 `1.0.1`；重新构建并做根目录/子目录双形态自测；局域网调试与防火墙脚本明确降格为非交付内容 | 详见 `docs\移动端正式版-HTTPS静态托管交付说明.md`；桌面 exe 未改动 |

> 两个版本的版本号各自独立（`frontend\package.json` / `mobile\package.json`），互不影响。
