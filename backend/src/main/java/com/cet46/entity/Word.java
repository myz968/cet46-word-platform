package com.cet46.entity;

import lombok.Data;

/**
 * 词库单词。对应表 t_word。
 */
@Data
public class Word {

    private Long id;

    /** 单词本身，如 abandon */
    private String word;

    /** 音标，如 əˈbændən */
    private String phonetic;

    /** 中文释义（含词性），如 "v. 放弃；抛弃" */
    private String meaning;

    /** 英文例句 */
    private String example;

    /** 难度分级：1=高频简单 2=中频 3=低频难词 */
    private Integer freqLevel;

    /** 同级别内排序号，从 1 开始，越小越先学 */
    private Integer seq;
}
