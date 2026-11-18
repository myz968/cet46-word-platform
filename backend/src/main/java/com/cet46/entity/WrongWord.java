package com.cet46.entity;

import lombok.Data;

/**
 * 错题本条目。对应表 t_wrong_word。
 * <p>查询列表时会额外带出单词信息（word/meaning/phonetic），所以这里加了几个非表字段。
 */
@Data
public class WrongWord {

    private Long id;

    private Long userId;

    private Long wordId;

    /** 累计答错次数 */
    private Integer wrongCount;

    /** 1=已掌握 0=未掌握 */
    private Integer mastered;

    private String lastWrongTime;

    private String createTime;

    // ===== 联表查询带出的单词信息（不参与插入） =====
    private String word;
    private String phonetic;
    private String meaning;
    private String example;
    private Integer freqLevel;
}
