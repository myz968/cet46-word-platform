package com.cet46.dto;

import lombok.Data;

import java.util.List;

/**
 * 一道题。
 *
 * <p>字段如何被前端使用：
 * <ul>
 *   <li>英译汉(EN2CN)：展示 {@link #word} + {@link #phonetic}，选项为 {@link #options}（中文释义）</li>
 *   <li>汉译英(CN2EN)：展示 {@link #meaning}，用户手敲拼写，{@link #options} 为空</li>
 * </ul>
 *
 * <p>说明：单机版由前端本地判分，所以 {@link #answer} 随题目一起下发；
 * 如果将来做成联网对战/排行榜，应改为逐题提交后端判分（把 answer 从响应里去掉）。
 */
@Data
public class QuestionVO {

    /** 题号，从 1 开始 */
    private Integer index;

    private Long wordId;

    /** 英译汉时展示的题干单词；汉译英时为 null */
    private String word;

    /** 音标，英译汉时展示 */
    private String phonetic;

    /** 中文释义：汉译英时作为题干 */
    private String meaning;

    /** 例句，答错后展示帮助记忆 */
    private String example;

    /** 四选一选项（英译汉模式）；汉译英模式为空 list */
    private List<String> options;

    /** 正确答案：英译汉为中文释义，汉译英为单词 */
    private String answer;
}
