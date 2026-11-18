package com.cet46.dto;

import lombok.Data;

/** 单词精简信息（结果页、错题列表展示用） */
@Data
public class WordBriefVO {

    private Long wordId;

    private String word;

    private String phonetic;

    private String meaning;

    public static WordBriefVO of(Long wordId, String word, String phonetic, String meaning) {
        WordBriefVO vo = new WordBriefVO();
        vo.wordId = wordId;
        vo.word = word;
        vo.phonetic = phonetic;
        vo.meaning = meaning;
        return vo;
    }
}
