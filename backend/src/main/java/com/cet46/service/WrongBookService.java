package com.cet46.service;

import com.cet46.common.BizException;
import com.cet46.common.Constants;
import com.cet46.dto.*;
import com.cet46.entity.Word;
import com.cet46.entity.WrongWord;
import com.cet46.mapper.WordMapper;
import com.cet46.mapper.WrongWordMapper;
import com.cet46.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 错题本业务：查看错题、错题重练、移出错题本。
 */
@Service
@RequiredArgsConstructor
public class WrongBookService {

    private final WrongWordMapper wrongWordMapper;
    private final WordMapper wordMapper;
    private final ReviewService reviewService;
    private final QuestionBuilder questionBuilder;

    /** 分页查错题（只显示未掌握的） */
    public PageVO<WrongWord> page(long userId, int pageNo, int pageSize) {
        int pn = Math.max(pageNo, 1);
        int ps = Math.min(Math.max(pageSize, 1), 100);
        int total = wrongWordMapper.countUnmastered(userId);
        List<WrongWord> list = wrongWordMapper.selectPage(userId, ps, (pn - 1) * ps);
        return PageVO.of(total, pn, ps, list);
    }

    /** 错题重练：随机抽一批错题出题，避免每次顺序都一样 */
    public List<QuestionVO> questions(long userId, String mode, int limit) {
        if (!Constants.isValidMode(mode)) {
            throw new BizException("答题模式只能是 EN2CN 或 CN2EN");
        }
        List<WrongWord> wrongs = wrongWordMapper.selectRandomForReview(userId, Math.min(Math.max(limit, 1), 50));
        if (wrongs.isEmpty()) {
            throw new BizException("错题本还是空的，先去闯关吧");
        }
        List<Word> words = new ArrayList<>(wrongs.size());
        for (WrongWord w : wrongs) {
            words.add(toWord(w));
        }
        return questionBuilder.build(words, mode);
    }

    /**
     * 提交错题重练结果。
     * <p>规则：答对即视为掌握，移出错题本；答错则错误次数 +1 并重新排复习。
     * （MVP 用「一次答对即掌握」，因为错题本身已经是第二遍以上接触了）
     */
    @Transactional
    public QuizResultVO submit(long userId, QuizSubmitRequest req) {
        List<AnswerItem> answers = req.getAnswers();
        String now = TimeUtil.now();
        int correctCount = 0;
        int mastered = 0;

        for (AnswerItem item : answers) {
            if (item.getWordId() == null) {
                continue;
            }
            if (Boolean.TRUE.equals(item.getCorrect())) {
                correctCount++;
                mastered += wrongWordMapper.markMasteredByWordId(userId, item.getWordId());
                reviewService.onCorrectAnswer(userId, item.getWordId());
            } else {
                wrongWordMapper.upsertWrong(userId, item.getWordId(), now);
                reviewService.onWrongAnswer(userId, item.getWordId());
            }
        }

        int total = answers.size();
        double accuracy = total == 0 ? 0 : Math.round(correctCount * 100.0 / total) / 100.0;

        QuizResultVO vo = new QuizResultVO();
        vo.setTotal(total);
        vo.setCorrectCount(correctCount);
        vo.setAccuracy(accuracy);
        vo.setDurationSec(req.getDurationSec() == null ? 0 : req.getDurationSec());
        vo.setMasteredCount(mastered);
        vo.setRemainWrong(wrongWordMapper.countUnmastered(userId));
        return vo;
    }

    /** 手动移出错题本 */
    public void remove(long userId, long id) {
        int rows = wrongWordMapper.deleteById(id, userId);
        if (rows == 0) {
            throw new BizException("错题不存在或已删除");
        }
    }

    /** 错题记录（联表结果）转成 Word，供出题组件复用 */
    private Word toWord(WrongWord w) {
        Word word = new Word();
        word.setId(w.getWordId());
        word.setWord(w.getWord());
        word.setPhonetic(w.getPhonetic());
        word.setMeaning(w.getMeaning());
        word.setExample(w.getExample());
        word.setFreqLevel(w.getFreqLevel());
        return word;
    }
}
