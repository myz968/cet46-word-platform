package com.cet46.service;

import com.cet46.common.BizException;
import com.cet46.common.Constants;
import com.cet46.config.AppProperties;
import com.cet46.dto.AnswerItem;
import com.cet46.dto.QuestionVO;
import com.cet46.dto.QuizResultVO;
import com.cet46.dto.QuizSubmitRequest;
import com.cet46.entity.ReviewTask;
import com.cet46.entity.Word;
import com.cet46.mapper.ReviewTaskMapper;
import com.cet46.mapper.WrongWordMapper;
import com.cet46.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 简易艾宾浩斯复习逻辑 + 复习出题/提交。
 *
 * <p>核心规则（需求里说的「根据用户作答记录安排单词复习推送」）：
 * <ol>
 *   <li>单词答错 -> 进入复习队列，重置到第 1 阶段，当天即可复习（intervals[0]=0 天）</li>
 *   <li>复习时答对 -> 进入下一阶段，间隔依次拉长为 1天 / 2天 / 4天 / 7天</li>
 *   <li>第 5 阶段也答对 -> finished=1，不再推送（视为形成长期记忆）</li>
 *   <li>任何阶段答错 -> 直接打回第 1 阶段重新来</li>
 * </ol>
 * 间隔天数可在 application.yml 的 app.review-intervals 调整。
 * 只有「出过错」的单词才会进入复习队列，避免刚学的词挤爆复习列表。
 */
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewTaskMapper reviewTaskMapper;
    private final WrongWordMapper wrongWordMapper;
    private final QuestionBuilder questionBuilder;
    private final AppProperties props;

    // ==================== 记忆阶段推进（供闯关/错题本/复习共用） ====================

    /** 答错时的处理：新建或重置复习任务 */
    public void onWrongAnswer(long userId, long wordId) {
        int[] intervals = props.intervalArray();
        reviewTaskMapper.resetToFirstStage(userId, wordId,
                TimeUtil.plusDays(intervals[0]), TimeUtil.now());
    }

    /**
     * 答对时的处理：推进记忆阶段。
     * <p>若该词本来就不在复习队列里（一次就答对的新词），什么也不做。
     */
    public void onCorrectAnswer(long userId, long wordId) {
        ReviewTask task = reviewTaskMapper.selectByUserAndWord(userId, wordId);
        if (task == null || Integer.valueOf(1).equals(task.getFinished())) {
            return;
        }
        int[] intervals = props.intervalArray();
        int maxStage = intervals.length;
        int current = task.getStage() == null ? 1 : task.getStage();

        if (current >= maxStage) {
            // 完整走完所有轮次，标记结束
            reviewTaskMapper.updateStage(task.getId(), maxStage, task.getDueTime(), 1, TimeUtil.now());
            return;
        }
        int nextStage = current + 1;
        reviewTaskMapper.updateStage(task.getId(), nextStage,
                TimeUtil.plusDays(intervals[nextStage - 1]), 0, TimeUtil.now());
    }

    // ==================== 复习列表 / 出题 / 提交 ====================

    /** 今日（含逾期）待复习列表 */
    public List<ReviewTask> todayList(long userId, int limit) {
        return reviewTaskMapper.selectDue(userId, TimeUtil.now(), Math.min(Math.max(limit, 1), 50));
    }

    /** 已到期的待复习数量 */
    public int countDue(long userId) {
        return reviewTaskMapper.countDue(userId, TimeUtil.now());
    }

    /** 所有未完成轮次的数量（含未到期） */
    public int countPending(long userId) {
        return reviewTaskMapper.countPending(userId);
    }

    /** 把待复习单词直接变成题目 */
    public List<QuestionVO> todayQuestions(long userId, String mode, int limit) {
        if (!Constants.isValidMode(mode)) {
            throw new BizException("答题模式只能是 EN2CN 或 CN2EN");
        }
        List<ReviewTask> tasks = todayList(userId, limit);
        if (tasks.isEmpty()) {
            throw new BizException("今天没有需要复习的单词，去闯关学新词吧");
        }
        List<Word> words = new ArrayList<>(tasks.size());
        for (ReviewTask t : tasks) {
            Word w = new Word();
            w.setId(t.getWordId());
            w.setWord(t.getWord());
            w.setPhonetic(t.getPhonetic());
            w.setMeaning(t.getMeaning());
            w.setExample(t.getExample());
            w.setFreqLevel(t.getFreqLevel());
            words.add(w);
        }
        return questionBuilder.build(words, mode);
    }

    /** 提交复习结果：答对推进阶段，答错打回第 1 阶段并记入错题本 */
    @Transactional
    public QuizResultVO submit(long userId, QuizSubmitRequest req) {
        List<AnswerItem> answers = req.getAnswers();
        int correctCount = 0;
        for (AnswerItem item : answers) {
            if (item.getWordId() == null) {
                continue;
            }
            if (Boolean.TRUE.equals(item.getCorrect())) {
                correctCount++;
                onCorrectAnswer(userId, item.getWordId());
            } else {
                onWrongAnswer(userId, item.getWordId());
                wrongWordMapper.upsertWrong(userId, item.getWordId(), TimeUtil.now());
            }
        }
        int total = answers.size();
        double accuracy = total == 0 ? 0 : Math.round(correctCount * 100.0 / total) / 100.0;

        QuizResultVO vo = new QuizResultVO();
        vo.setTotal(total);
        vo.setCorrectCount(correctCount);
        vo.setAccuracy(accuracy);
        vo.setDurationSec(req.getDurationSec() == null ? 0 : req.getDurationSec());
        vo.setMasteredCount(0);
        vo.setRemainWrong(wrongWordMapper.countUnmastered(userId));
        return vo;
    }
}
