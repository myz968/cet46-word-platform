package com.cet46.dto;

import lombok.Data;

/** 难度分级概览（首页三张卡片的数据） */
@Data
public class LevelInfoVO {

    /** 1=高频简单 2=中频 3=低频难词 */
    private Integer freqLevel;

    private String levelName;

    private String description;

    private Integer totalWords;

    /** 该难度下一共有多少关（按 app.level-size 自动计算） */
    private Integer stageCount;

    /** 每关词数 */
    private Integer levelSize;

    /** 已通关的关卡数 */
    private Integer passedCount;
}
