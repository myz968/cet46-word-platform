package com.cet46.entity;

import lombok.Data;

/**
 * 艾宾浩斯复习任务。对应表 t_review_task。
 */
@Data
public class ReviewTask {

    private Long id;

    private Long userId;

    private Long wordId;

    /** 记忆阶段 1~5，对应复习间隔 0/1/2/4/7 天 */
    private Integer stage;

    /** 到期时间，<= now 即为待复习 */
    private String dueTime;

    /** 1=已完成全部轮次 */
    private Integer finished;

    private String createTime;

    private String updateTime;

    // ===== 联表带出的单词信息 =====
    private String word;
    private String phonetic;
    private String meaning;
    private String example;
    private Integer freqLevel;
}
