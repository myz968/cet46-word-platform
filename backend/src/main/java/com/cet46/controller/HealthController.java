package com.cet46.controller;

import com.cet46.common.ApiResponse;
import com.cet46.mapper.WordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * 健康检查接口（无需登录）。
 * <p>Electron 主进程启动后会轮询这个接口，确认内置后端已经就绪再展示窗口，
 * 避免出现「白屏 + 请求失败」的启动体验。
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {

    private final WordMapper wordMapper;

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        Map<String, Object> data = new HashMap<>();
        data.put("status", "UP");
        data.put("wordCount", wordMapper.countAll());
        data.put("version", "1.0.0");
        return ApiResponse.ok(data);
    }
}
