package com.cet46.entity;

import lombok.Data;

/**
 * 作答记录。对应表 t_answer_record。
 */
@Data
public class AnswerRecord {

    private Long id;

    private Long userId;

    private Long wordId;

    /** 答题模式：EN2CN=英译汉，CN2EN=汉译英 */
    private String mode;

    /** 1=答对 0=答错 */
    private Integer correct;

    private Integer freqLevel;

    private Integer stageNo;

    private String createTime;
}
