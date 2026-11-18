package com.cet46.controller;

import com.cet46.common.ApiResponse;
import com.cet46.common.UserContext;
import com.cet46.dto.ProfileOverviewVO;
import com.cet46.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 「我的」页接口。
 */
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    /** 学习数据概览 */
    @GetMapping("/overview")
    public ApiResponse<ProfileOverviewVO> overview() {
        return ApiResponse.ok(profileService.overview(UserContext.requireUserId()));
    }
}
