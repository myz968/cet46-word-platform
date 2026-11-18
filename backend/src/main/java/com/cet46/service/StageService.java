package com.cet46.service;

import com.cet46.common.BizException;
import com.cet46.common.Constants;
import com.cet46.config.AppProperties;
import com.cet46.dto.*;
import com.cet46.entity.AnswerRecord;
import com.cet46.entity.StageRecord;
import com.cet46.entity.UserStage;
import com.cet46.entity.Word;
import com.cet46.mapper.*;
import com.cet46.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * 闯关核心业务：关卡计算、出题、交卷判分、生成学习报告。
 *
 * <p>关卡与单词的映射不用单独建表：某难度的单词按 seq 排序后，
 * 第 n 关 = 第 (n-1)*levelSize 条开始的 levelSize 条（SQL LIMIT/OFFSET）。
 * 好处是改 app.level-size 后关卡数自动重算，不需要洗数据。
 */
@Service
@RequiredArgsConstructor
public class StageService {

    private final WordMapper wordMapper;
    private final UserStageMapper userStageMapper;
    private final StageRecordMapper stageRecordMapper;
    private final AnswerRecordMapper answerRecordMapper;
    private final WrongWordMapper wrongWordMapper;
    private final ReviewService reviewService;
    private final QuestionBuilder questionBuilder;
    private final AppProperties props;

    /** 首页：三个难度各自的总词数、关卡数、已通关数 */
    public List<LevelInfoVO> listLevels(long userId) {
        List<LevelInfoVO> list = new ArrayList<>(3);
        for (int level = 1; level <= 3; level++) {
            int total = wordMapper.countByLevel(level);
            LevelInfoVO vo = new LevelInfoVO();
            vo.setFreqLevel(level);
            vo.setLevelName(Constants.levelName(level));
            vo.setDescription(Constants.levelDesc(level));
            vo.setTotalWords(total);
            vo.setLevelSize(props.getLevelSize());
            vo.setStageCount(stageCount(total));
            vo.setPassedCount((int) userStageMapper.selectByLevel(userId, level).stream()
                    .filter(s -> s.getBestAccuracy() != null && s.getBestAccuracy() >= Constants.PASS_ACCURACY)
                    .count());
            list.add(vo);
        }
        return list;
    }

    /** 关卡列表：显示每关词数、是否通关、最好正确率 */
    public LevelDetailVO levelDetail(long userId, int freqLevel) {
        checkLevel(freqLevel);
        int total = wordMapper.countByLevel(freqLevel);
        int size = props.getLevelSize();
        int stageCount = stageCount(total);

        // 已挑战过的关卡：key = stageNo
        Map<Integer, UserStage> played = new HashMap<>();
        for (UserStage us : userStageMapper.selectByLevel(userId, freqLevel)) {
            played.put(us.getStageNo(), us);
        }

        List<StageItemVO> stages = new ArrayList<>(stageCount);
        for (int no = 1; no <= stageCount; no++) {
            StageItemVO item = new StageItemVO();
            item.setStageNo(no);
            // 最后一关可能不满 size 个词
            item.setWordCount(Math.min(size, total - (no - 1) * size));
            UserStage us = played.get(no);
            item.setPlayCount(us == null ? 0 : us.getPlayCount());
            item.setBestAccuracy(us == null ? 0.0 : us.getBestAccuracy());
            item.setPassed(us != null && us.getBestAccuracy() != null
                    && us.getBestAccuracy() >= Constants.PASS_ACCURACY);
            stages.add(item);
        }

        LevelDetailVO vo = new LevelDetailVO();
        vo.setFreqLevel(freqLevel);
        vo.setLevelName(Constants.levelName(freqLevel));
        vo.setLevelSize(size);
        vo.setStageCount(stageCount);
        vo.setStages(stages);
        return vo;
    }

    /** 取某一关的题目 */
    public List<QuestionVO> questions(int freqLevel, int stageNo, String mode) {
        checkLevel(freqLevel);
        if (!Constants.isValidMode(mode)) {
            throw new BizException("答题模式只能是 EN2CN 或 CN2EN");
        }
        int total = wordMapper.countByLevel(freqLevel);
        int size = props.getLevelSize();
        if (stageNo < 1 || stageNo > stageCount(total)) {
            throw new BizException("关卡号超出范围");
        }
        List<Word> words = wordMapper.selectByLevelPage(freqLevel, size, (stageNo - 1) * size);
        if (words.isEmpty()) {
            throw new BizException("这一关还没有单词，请先导入词库");
        }
        return questionBuilder.build(words, mode);
    }

    /**
     * 交卷：写作答记录、更新错题本与复习队列、记录关卡成绩、生成学习报告。
     * <p>整段在一个事务里，避免「作答记录写了一半点中途失败」造成数据不一致。
     */
    @Transactional
    public StageReportVO submit(long userId, StageSubmitRequest req) {
        if (!Constants.isValidMode(req.getMode())) {
            throw new BizException("答题模式只能是 EN2CN 或 CN2EN");
        }
        if (req.getFreqLevel() == null || req.getStageNo() == null) {
            throw new BizException("关卡参数缺失");
        }
        checkLevel(req.getFreqLevel());

        List<AnswerItem> answers = req.getAnswers();
        List<Long> wordIds = answers.stream()
                .map(AnswerItem::getWordId).filter(Objects::nonNull).distinct().toList();
        if (wordIds.isEmpty()) {
            throw new BizException("作答记录不能为空");
        }

        // 新增生词 = 本次出现的不同单词数 - 之前已经作答过的单词数
        // 必须在写入本次记录「之前」统计，否则刚写的记录也会被算成已学过
        int answeredBefore = answerRecordMapper.countAnsweredWordIds(userId, wordIds);
        int newWordCount = Math.max(0, wordIds.size() - answeredBefore);

        String now = TimeUtil.now();
        int correctCount = 0;
        List<AnswerRecord> records = new ArrayList<>(answers.size());
        LinkedHashSet<Long> wrongIds = new LinkedHashSet<>();

        for (AnswerItem item : answers) {
            if (item.getWordId() == null) {
                continue;
            }
            boolean correct = Boolean.TRUE.equals(item.getCorrect());
            if (correct) {
                correctCount++;
                // 答对：若在复习队列里则推进阶段
                reviewService.onCorrectAnswer(userId, item.getWordId());
            } else {
                // 答错：进错题本 + 复习队列重置到第 1 阶段
                wrongIds.add(item.getWordId());
                wrongWordMapper.upsertWrong(userId, item.getWordId(), now);
                reviewService.onWrongAnswer(userId, item.getWordId());
            }

            AnswerRecord r = new AnswerRecord();
            r.setUserId(userId);
            r.setWordId(item.getWordId());
            r.setMode(req.getMode());
            r.setCorrect(correct ? 1 : 0);
            r.setFreqLevel(req.getFreqLevel());
            r.setStageNo(req.getStageNo());
            r.setCreateTime(now);
            records.add(r);
        }

        answerRecordMapper.insertBatch(records);

        int total = records.size();
        double accuracy = total == 0 ? 0 : round(correctCount * 1.0 / total);

        // 关卡成绩（只升不降）
        userStageMapper.upsert(userId, req.getFreqLevel(), req.getStageNo(), accuracy, now);

        // 闯关记录（学习报告落库，便于「我的」页面回看）
        StageRecord record = new StageRecord();
        record.setUserId(userId);
        record.setFreqLevel(req.getFreqLevel());
        record.setStageNo(req.getStageNo());
        record.setMode(req.getMode());
        record.setTotal(total);
        record.setCorrectCount(correctCount);
        record.setAccuracy(accuracy);
        record.setDurationSec(req.getDurationSec() == null ? 0 : req.getDurationSec());
        record.setNewWordCount(newWordCount);
        record.setCreateTime(now);
        stageRecordMapper.insert(record);

        // 组装报告
        StageReportVO report = new StageReportVO();
        report.setTotal(total);
        report.setCorrectCount(correctCount);
        report.setAccuracy(accuracy);
        report.setDurationSec(record.getDurationSec());
        report.setNewWordCount(newWordCount);
        report.setPassed(accuracy >= Constants.PASS_ACCURACY);

        int stageCount = stageCount(wordMapper.countByLevel(req.getFreqLevel()));
        report.setNextStageNo(req.getStageNo() < stageCount ? req.getStageNo() + 1 : null);

        List<WordBriefVO> wrongWords = new ArrayList<>();
        if (!wrongIds.isEmpty()) {
            Map<Long, Word> map = new HashMap<>();
            for (Word w : wordMapper.selectByIds(new ArrayList<>(wrongIds))) {
                map.put(w.getId(), w);
            }
            for (Long id : wrongIds) {
                Word w = map.get(id);
                if (w != null) {
                    wrongWords.add(WordBriefVO.of(w.getId(), w.getWord(), w.getPhonetic(), w.getMeaning()));
                }
            }
        }
        report.setWrongWords(wrongWords);
        return report;
    }

    // ===== 内部工具 =====

    /** 关卡数 = 向上取整(总词数 / 每关词数) */
    private int stageCount(int totalWords) {
        int size = props.getLevelSize();
        return totalWords == 0 ? 0 : (totalWords + size - 1) / size;
    }

    private void checkLevel(int freqLevel) {
        if (freqLevel < 1 || freqLevel > 3) {
            throw new BizException("难度只能是 1(高频)、2(中频)、3(低频)");
        }
    }

    /** 正确率保留两位小数 */
    private double round(double v) {
        return Math.round(v * 100) / 100.0;
    }
}
