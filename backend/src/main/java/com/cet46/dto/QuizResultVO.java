package com.cet46.dto;

import lombok.Data;

/** 复习 / 错题重练的结果（比闯关报告简单，不需要关卡与解锁信息） */
@Data
public class QuizResultVO {

    private Integer total;

    private Integer correctCount;

    private Double accuracy;

    private Integer durationSec;

    /** 本次答对、被移出错题本的单词数 */
    private Integer masteredCount;

    /** 仍留在错题本里的数量 */
    private Integer remainWrong;
}
