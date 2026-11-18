package com.cet46.dto;

import lombok.Data;

import java.util.List;

/** 某难度下的关卡列表 */
@Data
public class LevelDetailVO {

    private Integer freqLevel;

    private String levelName;

    private Integer stageCount;

    private Integer levelSize;

    private List<StageItemVO> stages;
}
