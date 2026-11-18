package com.cet46.dto;

import lombok.Data;

/** 关卡列表里的单个关卡 */
@Data
public class StageItemVO {

    private Integer stageNo;

    private Integer wordCount;

    /** 是否已通关（最好正确率 >= 60%） */
    private Boolean passed;

    private Double bestAccuracy;

    private Integer playCount;
}
