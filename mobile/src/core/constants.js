/**
 * 全局常量 —— 全部与桌面端（SpringBoot 后端）保持一致。
 *
 * 改这里的值时请同步改后端 application.yml / Constants.java，
 * 否则两个版本会出现「同一关不同关卡数」「同一次答对复习间隔不一样」这类怪问题。
 */

/** 答题模式：英译汉（看单词选释义） */
export const MODE_EN2CN = 'EN2CN'

/** 答题模式：汉译英（看释义敲拼写） */
export const MODE_CN2EN = 'CN2EN'

/** 正确率达到多少算通关（后端 Constants.PASS_ACCURACY = 0.6） */
export const PASS_ACCURACY = 0.6

/** 每关单词数量（后端 application.yml 的 app.level-size） */
export const LEVEL_SIZE = 20

/** 艾宾浩斯复习间隔（天），依次对应第 1~5 次复习；0 表示当天就要复习 */
export const REVIEW_INTERVALS = [0, 1, 2, 4, 7]

/** 难度名称，下标 = freqLevel，与后端 Constants.LEVEL_NAMES 一致 */
export const LEVEL_NAMES = { 1: '高频基础', 2: '中频进阶', 3: '低频冲刺' }

/** 难度说明 */
export const LEVEL_DESCS = {
  1: '最常用的核心词汇，先把地基打牢',
  2: '四六级常考的重点词，拉开分差的地方',
  3: '低频难词，冲刺高分用'
}

/** 单机版只有一个人用，固定 userId = 1，等价于桌面端的「当前登录用户」 */
export const USER_ID = 1

/** 本地昵称（不需要注册登录，进入即可用） */
export const LOCAL_NICKNAME = '同学'
