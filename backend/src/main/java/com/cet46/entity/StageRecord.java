package com.cet46.entity;

import lombok.Data;

/**
 * 闯关记录 / 学习报告。对应表 t_stage_record。
 */
@Data
public class StageRecord {

    private Long id;

    private Long userId;

    private Integer freqLevel;

    private Integer stageNo;

    private String mode;

    private Integer total;

    private Integer correctCount;

    /** 正确率 0~1 */
    private Double accuracy;

    /** 用时（秒） */
    private Integer durationSec;

    /** 本次新增生词数 */
    private Integer newWordCount;

    private String createTime;
}
