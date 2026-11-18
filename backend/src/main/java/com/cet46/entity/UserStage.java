package com.cet46.entity;

import lombok.Data;

/**
 * 关卡通关状态。对应表 t_user_stage。
 */
@Data
public class UserStage {

    private Long id;

    private Long userId;

    private Integer freqLevel;

    private Integer stageNo;

    /** 历史最好正确率，>=0.6 视为通关 */
    private Double bestAccuracy;

    private Integer playCount;

    private String lastTime;
}
