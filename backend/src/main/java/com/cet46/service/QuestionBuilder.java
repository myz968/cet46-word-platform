package com.cet46.service;

import com.cet46.common.Constants;
import com.cet46.dto.QuestionVO;
import com.cet46.entity.Word;
import com.cet46.mapper.WordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;

/**
 * 题目构造器：把「单词列表 + 答题模式」变成可以直接渲染的题目列表。
 *
 * <p>三种场景（闯关 / 错题重练 / 艾宾浩斯复习）出题逻辑完全一致，只是单词来源不同，
 * 所以抽成一个组件复用，避免三处重复写选项生成代码。
 */
@Component
@RequiredArgsConstructor
public class QuestionBuilder {

    private final WordMapper wordMapper;
    private final Random random = new Random();

    /**
     * @param words 本次要考的单词（顺序即出题顺序）
     * @param mode  EN2CN 英译汉 / CN2EN 汉译英
     */
    public List<QuestionVO> build(List<Word> words, String mode) {
        List<QuestionVO> list = new ArrayList<>(words.size());
        int index = 1;
        for (Word w : words) {
            QuestionVO q = new QuestionVO();
            q.setIndex(index++);
            q.setWordId(w.getId());
            q.setExample(w.getExample());

            if (Constants.MODE_EN2CN.equals(mode)) {
                // 英译汉：题干是单词+音标，选项是 4 个中文释义
                q.setWord(w.getWord());
                q.setPhonetic(w.getPhonetic());
                q.setMeaning(null);
                q.setAnswer(w.getMeaning());
                q.setOptions(buildMeaningOptions(w));
            } else {
                // 汉译英：题干是中文释义，用户手敲拼写，不需要选项
                q.setWord(null);
                q.setPhonetic(null);
                q.setMeaning(w.getMeaning());
                q.setAnswer(w.getWord());
                q.setOptions(Collections.emptyList());
            }
            list.add(q);
        }
        return list;
    }

    /**
     * 生成 4 个中文释义选项：正确项 + 3 个同难度随机干扰项，最后打乱顺序。
     * <p>用 LinkedHashSet 去重，防止释义文本重复导致出现两个一样的选项。
     */
    private List<String> buildMeaningOptions(Word word) {
        LinkedHashSet<String> options = new LinkedHashSet<>();
        options.add(word.getMeaning());

        List<Word> distractors = wordMapper.selectRandomSameLevel(
                word.getFreqLevel(), word.getId(), 3);
        for (Word d : distractors) {
            options.add(d.getMeaning());
            if (options.size() >= 4) {
                break;
            }
        }

        List<String> result = new ArrayList<>(options);
        Collections.shuffle(result, random);
        return result;
    }
}
