# 接口文档（MVP 版）

- 基础地址：`http://127.0.0.1:8080`
- 统一返回：`{ "code": 0, "message": "ok", "data": ... }`，`code != 0` 即失败（`message` 是可读的中文原因）
- 鉴权：除 `/api/health`、`/api/auth/guest`、`/api/auth/register`、`/api/auth/login` 外，**所有接口都要带请求头 `X-Token: <token>`**
- 分页参数：`pageNo` 从 1 开始，`pageSize` 默认 20
- 题型 `mode`：`EN2CN` 英译汉（给单词选释义）/ `CN2EN` 汉译英（给释义敲单词）

---

## 1. 认证 `/api/auth`

### POST /api/auth/guest — 游客登录

无参数。服务端自动创建一个游客账号并返回 token。

```json
{ "code": 0, "data": { "token": "a1b2c3...", "userId": 1, "username": "游客8823", "nickname": "游客", "isGuest": 1 } }
```

> 游客记录同样保存在 SQLite 里，删库才会清空。不同次游客登录会创建不同用户，所以想保留记录建议注册账号。

### POST /api/auth/register — 注册

```json
{ "username": "tom", "password": "123456", "nickname": "汤姆" }
```
`username` 3~20 字符且唯一，`password` 6~20 字符，`nickname` 可省略。返回结构同游客登录，`isGuest = 0`。

### POST /api/auth/login — 登录

```json
{ "username": "tom", "password": "123456" }
```
返回同游客登录。

### POST /api/auth/logout — 退出

带 token 调用，服务端删除该 token 记录。

### GET /api/auth/me — 当前用户

返回当前 token 对应的用户信息。

---

## 2. 闯关 `/api/stage`

### GET /api/stage/levels — 三个级别的进度

```json
[{
  "freqLevel": 1,
  "levelName": "高频简单词",
  "description": "四六级最常考的基础词，先从这里突破",
  "totalWords": 297,
  "stageCount": 15,
  "levelSize": 20,
  "passedCount": 3
}]
```

### GET /api/stage/{freqLevel}/detail — 某级别下的关卡列表

```json
{
  "freqLevel": 1,
  "levelName": "高频简单词",
  "levelSize": 20,
  "stages": [
    { "stageNo": 1, "wordCount": 20, "passed": true, "bestAccuracy": 0.95, "playCount": 2 },
    { "stageNo": 2, "wordCount": 20, "passed": false, "bestAccuracy": 0.6, "playCount": 1 }
  ]
}
```

> 关卡解锁规则：第 1 关永远可玩；已通过的关卡可重刷；未通关的下一关也允许尝试（降低挫败感），再后面的关卡前端置灰。

### GET /api/stage/{freqLevel}/{stageNo}/questions?mode=EN2CN — 取本关题目

返回该关的题目数组。**答案由服务端生成并随题目下发**（单机 MVP，不做防作弊）。

```json
[{
  "index": 1,
  "wordId": 12,
  "word": "abandon",
  "phonetic": "/əˈbændən/",
  "meaning": "v. 放弃；抛弃",
  "example": "He abandoned the plan.",
  "options": ["v. 放弃；抛弃", "n. 能力", "v. 吸收", "adj. 抽象的"],
  "answer": "v. 放弃；抛弃"
}]
```

- `EN2CN`：题干是 `word`，`options` 是四个中文释义
- `CN2EN`：题干是 `meaning`，`options` 是四个英文单词，`answer` 是那个单词

### POST /api/stage/submit — 交卷

```json
{
  "freqLevel": 1,
  "stageNo": 1,
  "mode": "EN2CN",
  "durationSec": 95,
  "answers": [
    { "wordId": 12, "correct": true },
    { "wordId": 15, "correct": false }
  ]
}
```

返回本次学习报告：

```json
{
  "total": 20,
  "correctCount": 16,
  "accuracy": 0.8,
  "durationSec": 95,
  "newWordCount": 17,
  "passed": true,
  "nextStageNo": 2,
  "wrongWords": [{ "wordId": 15, "word": "absorb", "phonetic": "/əbˈsɔːb/", "meaning": "v. 吸收" }]
}
```

- `newWordCount`：本次答对、且此前从未答对过的单词数（= 新增生词）
- `passed`：正确率 ≥ 80% 视为通过（阈值在 `StageService` 里，可按需调整）
- 答错的词会**同时**做三件事：写 `t_wrong_word`、写 `t_review_task`（当天到期）、写 `t_answer_record`

---

## 3. 错题本 `/api/wrong-book`

### GET /api/wrong-book?pageNo=1&pageSize=20 — 分页查看

```json
{
  "total": 12, "pageNo": 1, "pageSize": 20,
  "list": [{
    "id": 5, "wordId": 15, "word": "absorb", "phonetic": "/əbˈsɔːb/",
    "meaning": "v. 吸收", "example": "...", "wrongCount": 2,
    "lastWrongTime": "2026-11-10 00:40:00"
  }]
}
```

### GET /api/wrong-book/questions?mode=CN2EN&limit=20 — 错题重练出题

返回结构同闯关出题（`QuestionVO` 数组）。

### POST /api/wrong-book/submit — 提交错题重练

```json
{ "mode": "CN2EN", "durationSec": 40, "answers": [{ "wordId": 15, "correct": true }] }
```

```json
{ "total": 3, "correctCount": 3, "accuracy": 1.0, "durationSec": 40, "masteredCount": 3, "remainWrong": 9 }
```

> `masteredCount`：本次答对并从错题本移除的条数；答错的会累加 `wrongCount` 且继续留在错题本。

### DELETE /api/wrong-book/{id} — 手动移除

`id` 是错题记录主键（不是 wordId）。

---

## 4. 艾宾浩斯复习 `/api/review`

### GET /api/review/today?limit=50 — 今日复习

```json
{
  "total": 5,     // 今天到期待复习数量
  "pending": 18,  // 复习队列里的总任务数
  "list": [{ "id": 3, "wordId": 15, "word": "absorb", "meaning": "v. 吸收", "stage": 1, "dueTime": "2026-11-10" }]
}
```

间隔规则（`application.yml` 的 `app.review-intervals`，默认 `0,1,2,4,7` 天）：

| 记忆阶段 | 答对后下次复习 |
| --- | --- |
| 1 | 当天 |
| 2 | 1 天后 |
| 3 | 2 天后 |
| 4 | 4 天后 |
| 5 | 7 天后 |
| 5 再答对 | 标记为已掌握，不再推送 |

答错则直接退回阶段 1，当天重新进队列。

### GET /api/review/questions?mode=EN2CN&limit=20 — 复习出题

把今日到期任务转成题目，结构同 `QuestionVO`。

### POST /api/review/submit — 提交复习

请求体同错题重练 `QuizSubmitRequest`。答对推进阶段，答错回退阶段。

---

## 5. 学习报告 `/api/profile/overview`

```json
{
  "username": "tom", "nickname": "汤姆", "isGuest": 0,
  "learnedWords": 168,      // 累计答对过的不同单词数
  "totalAnswers": 420,      // 累计作答次数
  "accuracy": 0.82,         // 累计正确率
  "wrongCount": 12,         // 错题本剩余条数
  "pendingReview": 18,      // 待复习任务数
  "passedStages": 8,        // 已通过关卡数
  "recentRecords": [{ "freqLevel": 1, "stageNo": 8, "accuracy": 0.9, "durationSec": 120, "createTime": "2026-11-10 00:30:00" }]
}
```

---

## 6. 扩展占位 `/api/ext`

这两个接口**本期只返回未实现提示**，用于后续扩展：

### GET /api/ext/battle/status

```json
{ "code": 0, "data": { "enabled": false, "message": "双人对战功能未实现，接口已预留" } }
```

### GET /api/ext/oauth/providers

```json
{ "code": 0, "data": { "providers": [{ "code": "QQ", "enabled": false }, { "code": "WECHAT", "enabled": false }] } }
```

后续实现时改 `extension/BattleService.java`、`extension/OAuthService.java` 即可，Controller 不用动。

---

## 7. 错误码

| code | 含义 |
| --- | --- |
| 0 | 成功 |
| 401 | 未登录 / token 失效，前端会自动清本地 token 并跳登录页 |
| 400 | 参数校验失败（`message` 里是具体字段原因） |
| 500 | 服务端异常（详见后端控制台日志） |
