package com.cet46.controller;

import com.cet46.common.ApiResponse;
import com.cet46.common.UserContext;
import com.cet46.dto.QuestionVO;
import com.cet46.dto.QuizResultVO;
import com.cet46.dto.QuizSubmitRequest;
import com.cet46.entity.ReviewTask;
import com.cet46.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 艾宾浩斯复习接口。
 */
@RestController
@RequestMapping("/api/review")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    /** 今日待复习列表 + 数量（首页与复习页共用） */
    @GetMapping("/today")
    public ApiResponse<Map<String, Object>> today(@RequestParam(defaultValue = "50") int limit) {
        long userId = UserContext.requireUserId();
        List<ReviewTask> list = reviewService.todayList(userId, limit);

        Map<String, Object> data = new HashMap<>();
        data.put("total", reviewService.countDue(userId));
        data.put("pending", reviewService.countPending(userId));
        data.put("list", list);
        return ApiResponse.ok(data);
    }

    /** 把待复习单词变成题目，前端直接进入答题页 */
    @GetMapping("/questions")
    public ApiResponse<List<QuestionVO>> questions(@RequestParam(defaultValue = "EN2CN") String mode,
                                                   @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.ok(reviewService.todayQuestions(UserContext.requireUserId(), mode, limit));
    }

    /** 提交复习结果 */
    @PostMapping("/submit")
    public ApiResponse<QuizResultVO> submit(@Valid @RequestBody QuizSubmitRequest req) {
        return ApiResponse.ok(reviewService.submit(UserContext.requireUserId(), req));
    }
}
