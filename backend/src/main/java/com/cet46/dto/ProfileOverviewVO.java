package com.cet46.dto;

import com.cet46.entity.StageRecord;
import lombok.Data;

import java.util.List;

/** 「我的」页面数据概览 */
@Data
public class ProfileOverviewVO {

    private String username;

    private String nickname;

    private Integer isGuest;

    /** 学过的不同单词数 */
    private Integer learnedWords;

    /** 累计作答次数 */
    private Integer totalAnswers;

    /** 累计正确率 0~1 */
    private Double accuracy;

    /** 错题本剩余数量 */
    private Integer wrongCount;

    /** 待复习数量（未完成全部轮次的） */
    private Integer pendingReview;

    /** 已通关关卡数 */
    private Integer passedStages;

    /** 最近 5 次闯关记录 */
    private List<StageRecord> recentRecords;
}
