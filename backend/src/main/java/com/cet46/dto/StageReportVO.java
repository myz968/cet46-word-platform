package com.cet46.dto;

import lombok.Data;

import java.util.List;

/** 闯关结束的学习报告 */
@Data
public class StageReportVO {

    private Integer total;

    private Integer correctCount;

    /** 正确率 0~1 */
    private Double accuracy;

    /** 用时（秒） */
    private Integer durationSec;

    /** 本次新增生词数（此前从未作答过的词） */
    private Integer newWordCount;

    /** 是否通关（正确率 >= 60%） */
    private Boolean passed;

    /** 下一关关卡号，没有下一关时为 null */
    private Integer nextStageNo;

    /** 本次答错的单词，结果页展示「需重点记忆」 */
    private List<WordBriefVO> wrongWords;
}
