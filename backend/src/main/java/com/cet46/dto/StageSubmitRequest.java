package com.cet46.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/** 提交一关的作答结果 */
@Data
public class StageSubmitRequest {

    private Integer freqLevel;

    private Integer stageNo;

    /** EN2CN / CN2EN */
    @NotBlank(message = "答题模式不能为空")
    private String mode;

    /** 用时（秒），由前端计时 */
    private Integer durationSec;

    @NotEmpty(message = "作答记录不能为空")
    private List<AnswerItem> answers;
}
