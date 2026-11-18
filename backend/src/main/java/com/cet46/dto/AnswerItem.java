package com.cet46.dto;

import lombok.Data;

/** 单题作答结果（前端本地判分后回传） */
@Data
public class AnswerItem {

    private Long wordId;

    /** true=答对 false=答错 */
    private Boolean correct;
}
