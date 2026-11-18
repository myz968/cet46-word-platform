package com.cet46.common;

/**
 * 全局常量。集中管理字符串魔法值，避免各处手写导致拼写不一致。
 */
public final class Constants {

    private Constants() {
    }

    /** 答题模式：英译汉（看单词选释义） */
    public static final String MODE_EN2CN = "EN2CN";

    /** 答题模式：汉译英（看释义敲拼写） */
    public static final String MODE_CN2EN = "CN2EN";

    /** 正确率达到多少算通关 */
    public static final double PASS_ACCURACY = 0.6;

    /** 难度名称，下标 = freqLevel */
    private static final String[] LEVEL_NAMES = {"", "高频基础", "中频进阶", "低频冲刺"};

    private static final String[] LEVEL_DESC = {
            "",
            "最常用的核心词汇，先把地基打牢",
            "四六级常考的重点词，拉开分差的地方",
            "低频难词，冲刺高分用"
    };

    public static String levelName(int freqLevel) {
        return (freqLevel >= 1 && freqLevel <= 3) ? LEVEL_NAMES[freqLevel] : "未知难度";
    }

    public static String levelDesc(int freqLevel) {
        return (freqLevel >= 1 && freqLevel <= 3) ? LEVEL_DESC[freqLevel] : "";
    }

    /** 校验模式参数，只允许两种值，防止脏数据写库 */
    public static boolean isValidMode(String mode) {
        return MODE_EN2CN.equals(mode) || MODE_CN2EN.equals(mode);
    }
}
