package com.cet46.service;

import com.cet46.dto.ProfileOverviewVO;
import com.cet46.entity.User;
import com.cet46.mapper.*;
import com.cet46.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 「我的」页面数据汇总。
 */
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final AuthService authService;
    private final AnswerRecordMapper answerRecordMapper;
    private final WrongWordMapper wrongWordMapper;
    private final UserStageMapper userStageMapper;
    private final StageRecordMapper stageRecordMapper;
    private final ReviewService reviewService;

    public ProfileOverviewVO overview(long userId) {
        User user = authService.getUser(userId);

        int totalAnswers = answerRecordMapper.countByUser(userId);
        int correctAnswers = answerRecordMapper.countCorrectByUser(userId);

        ProfileOverviewVO vo = new ProfileOverviewVO();
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setIsGuest(user.getIsGuest());
        vo.setLearnedWords(answerRecordMapper.countDistinctLearnedWords(userId));
        vo.setTotalAnswers(totalAnswers);
        vo.setAccuracy(totalAnswers == 0 ? 0.0
                : Math.round(correctAnswers * 100.0 / totalAnswers) / 100.0);
        vo.setWrongCount(wrongWordMapper.countUnmastered(userId));
        vo.setPendingReview(reviewService.countPending(userId));
        vo.setPassedStages(userStageMapper.countPassed(userId));
        vo.setRecentRecords(stageRecordMapper.selectRecent(userId, 5));
        return vo;
    }

    /** 首页概况：今天要复习多少、当前时间等（前端也可自行计算，这里给出服务端时间以免依赖本机时钟） */
    public String serverTime() {
        return TimeUtil.now();
    }
}
