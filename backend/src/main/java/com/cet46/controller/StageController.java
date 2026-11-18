package com.cet46.controller;

import com.cet46.common.ApiResponse;
import com.cet46.common.UserContext;
import com.cet46.dto.*;
import com.cet46.service.StageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 闯关接口。
 */
@RestController
@RequestMapping("/api/stage")
@RequiredArgsConstructor
public class StageController {

    private final StageService stageService;

    /** 首页：三个难度概览 */
    @GetMapping("/levels")
    public ApiResponse<List<LevelInfoVO>> levels() {
        return ApiResponse.ok(stageService.listLevels(UserContext.requireUserId()));
    }

    /** 某难度下的关卡列表 */
    @GetMapping("/{freqLevel}/detail")
    public ApiResponse<LevelDetailVO> detail(@PathVariable int freqLevel) {
        return ApiResponse.ok(stageService.levelDetail(UserContext.requireUserId(), freqLevel));
    }

    /**
     * 取某一关的题目。
     *
     * @param mode EN2CN=英译汉   CN2EN=汉译英
     */
    @GetMapping("/{freqLevel}/{stageNo}/questions")
    public ApiResponse<List<QuestionVO>> questions(@PathVariable int freqLevel,
                                                   @PathVariable int stageNo,
                                                   @RequestParam(defaultValue = "EN2CN") String mode) {
        return ApiResponse.ok(stageService.questions(freqLevel, stageNo, mode));
    }

    /** 交卷，返回本次学习报告 */
    @PostMapping("/submit")
    public ApiResponse<StageReportVO> submit(@Valid @RequestBody StageSubmitRequest req) {
        return ApiResponse.ok(stageService.submit(UserContext.requireUserId(), req));
    }
}
