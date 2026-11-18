package com.cet46.controller;

import com.cet46.common.ApiResponse;
import com.cet46.service.WordAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 词库维护接口（设置页使用）。
 *
 * <p>只有本机单机应用，没有管理员体系，登录用户即可调用；
 * 真正的保护放在前端：必须经过两次确认才会发出重置请求。
 */
@RestController
@RequestMapping("/api/admin/word")
@RequiredArgsConstructor
public class WordAdminController {

    private final WordAdminService wordAdminService;

    /** 查看当前词库规模（设置页展示 + 校验补词结果） */
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats() {
        return ApiResponse.ok(wordAdminService.stats());
    }

    /** 重置词库：清空词库与全部学习数据后重新导入内置词库（危险操作） */
    @PostMapping("/reset")
    public ApiResponse<Map<String, Object>> reset() {
        return ApiResponse.ok(wordAdminService.reset());
    }
}
