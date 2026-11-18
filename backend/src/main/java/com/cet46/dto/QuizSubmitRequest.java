package com.cet46.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/** 复习/错题重练的提交体 */
@Data
public class QuizSubmitRequest {

    /** EN2CN / CN2EN */
    private String mode;

    private Integer durationSec;

    @NotEmpty(message = "作答记录不能为空")
    private List<AnswerItem> answers;
}
