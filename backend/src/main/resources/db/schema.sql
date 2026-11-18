-- =====================================================================
-- 四六级单词闯关背诵平台 —— SQLite 建表脚本
-- 位置：backend/src/main/resources/db/schema.sql
-- 说明：
--   1. 全部使用 IF NOT EXISTS，可重复执行（SpringBoot 每次启动都会跑一遍）
--   2. SQLite 无日期类型，时间统一存 'yyyy-MM-dd HH:mm:ss' 文本，可直接字符串比较
--   3. 布尔值用 INTEGER 0/1 表示
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 用户表：游客与本地注册账号共用一张表，用 is_guest 区分
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_user (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,          -- 登录名；游客为随机生成的 guest_xxxxxx
    password    TEXT    NOT NULL DEFAULT '',      -- 加盐 SHA-256，游客为空串
    nickname    TEXT,                             -- 昵称
    is_guest    INTEGER NOT NULL DEFAULT 0,       -- 1=游客 0=注册用户
    create_time TEXT    NOT NULL
);

-- ---------------------------------------------------------------------
-- 2. 词库表：freq_level 决定难度分级，seq 决定同级别内的闯关先后顺序
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_word (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    word       TEXT    NOT NULL UNIQUE,           -- 单词（唯一，便于导入去重）
    phonetic   TEXT,                              -- 音标，如 əˈbændən
    meaning    TEXT    NOT NULL,                  -- 中文释义，含词性，如 "v. 放弃；抛弃"
    example    TEXT,                              -- 英文例句
    freq_level INTEGER NOT NULL,                  -- 1=高频简单 2=中频 3=低频难词
    seq        INTEGER NOT NULL DEFAULT 0         -- 同级别内排序序号（1 开始，越小越简单）
);

CREATE INDEX IF NOT EXISTS idx_word_level_seq ON t_word (freq_level, seq);

-- ---------------------------------------------------------------------
-- 3. 作答记录表：每次答题都落一条，是「学习报告」和「新增生词统计」的数据源
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_answer_record (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    word_id     INTEGER NOT NULL,
    mode        TEXT    NOT NULL,                 -- EN2CN=英译汉  CN2EN=汉译英
    correct     INTEGER NOT NULL,                 -- 1=答对 0=答错
    freq_level  INTEGER,                          -- 冗余存难度，统计时免联表
    stage_no    INTEGER,                          -- 冗余存关卡号
    create_time TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answer_user ON t_answer_record (user_id, create_time);
CREATE INDEX IF NOT EXISTS idx_answer_user_word ON t_answer_record (user_id, word_id);

-- ---------------------------------------------------------------------
-- 4. 错题本：同一用户同一单词只保留一条，错一次累加次数
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_wrong_word (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    word_id         INTEGER NOT NULL,
    wrong_count     INTEGER NOT NULL DEFAULT 1,   -- 累计答错次数
    mastered        INTEGER NOT NULL DEFAULT 0,   -- 1=已掌握（错题重练答对后置 1）
    last_wrong_time TEXT    NOT NULL,
    create_time     TEXT    NOT NULL,
    UNIQUE (user_id, word_id)                     -- 联合唯一，配合 upsert 使用
);

-- ---------------------------------------------------------------------
-- 5. 艾宾浩斯复习任务：答错即建任务，答对则推进到下一个记忆阶段
--    stage=1..5，对应间隔 0/1/2/4/7 天（可在 application.yml 调整）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_review_task (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    word_id     INTEGER NOT NULL,
    stage       INTEGER NOT NULL DEFAULT 1,       -- 当前记忆阶段
    due_time    TEXT    NOT NULL,                 -- 到期时间，<= 当前时间即为「待复习」
    finished    INTEGER NOT NULL DEFAULT 0,       -- 1=已完成全部 5 轮，不再推送
    create_time TEXT    NOT NULL,
    update_time TEXT    NOT NULL,
    UNIQUE (user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_review_due ON t_review_task (user_id, finished, due_time);

-- ---------------------------------------------------------------------
-- 6. 闯关记录表：每次闯关结束写一条，用于查看历史与学习报告
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_stage_record (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    freq_level    INTEGER NOT NULL,
    stage_no      INTEGER NOT NULL,
    mode          TEXT    NOT NULL,
    total         INTEGER NOT NULL,               -- 本关题目总数
    correct_count INTEGER NOT NULL,
    accuracy      REAL    NOT NULL,               -- 正确率 0~1
    duration_sec  INTEGER NOT NULL,               -- 用时（秒）
    new_word_count INTEGER NOT NULL DEFAULT 0,    -- 本次新增生词数（此前从未作答过的词）
    create_time   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stage_record_user ON t_stage_record (user_id, create_time);

-- ---------------------------------------------------------------------
-- 7. 关卡通关状态：记录每关最好成绩，用于关卡列表显示「已通关/未解锁」
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_user_stage (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    freq_level    INTEGER NOT NULL,
    stage_no      INTEGER NOT NULL,
    best_accuracy REAL    NOT NULL DEFAULT 0,     -- 历史最好正确率
    play_count    INTEGER NOT NULL DEFAULT 0,     -- 挑战次数
    last_time     TEXT    NOT NULL,
    UNIQUE (user_id, freq_level, stage_no)
);

-- ---------------------------------------------------------------------
-- 8. 登录令牌表：极简 token 方案（不引入 JWT 依赖），登录时签发，退出/过期即失效
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_token (
    token       TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    create_time TEXT    NOT NULL,
    expire_time TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_user ON t_token (user_id);
