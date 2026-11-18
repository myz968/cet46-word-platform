package com.cet46.extension;

import com.cet46.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 扩展能力的占位入口。
 *
 * <p>作用有两个：
 * <ul>
 *   <li>让前端能明确知道「这个能力存在但本期未开放」，可以据此隐藏或置灰按钮</li>
 *   <li>给后续开发留下固定的 URL 约定，实现时不用改动前端路由</li>
 * </ul>
 * 这里刻意不写任何业务逻辑，符合「只写接口定义」的要求。
 */
@RestController
@RequestMapping("/api/ext")
@RequiredArgsConstructor
public class ExtController {

    /** 双人对战状态：本期固定返回未实现 */
    @GetMapping("/battle/status")
    public ApiResponse<String> battleStatus() {
        return ApiResponse.fail(501, "双人对战为预留能力，本期未实现");
    }

    /** 可用的第三方登录渠道：本期固定返回空列表 */
    @GetMapping("/oauth/providers")
    public ApiResponse<List<String>> oauthProviders() {
        return ApiResponse.ok(List.of());
    }
}
