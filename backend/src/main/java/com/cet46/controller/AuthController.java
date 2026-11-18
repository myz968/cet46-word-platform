package com.cet46.controller;

import com.cet46.common.ApiResponse;
import com.cet46.common.UserContext;
import com.cet46.config.AuthInterceptor;
import com.cet46.dto.LoginRequest;
import com.cet46.dto.LoginVO;
import com.cet46.dto.RegisterRequest;
import com.cet46.entity.User;
import com.cet46.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 认证接口。
 * <p>所有接口统一返回 {@link ApiResponse}，前端只看 code 与 data。
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** 以游客身份开始：创建一个本地游客账号并返回 token */
    @PostMapping("/guest")
    public ApiResponse<LoginVO> guest() {
        return ApiResponse.ok(authService.createGuest());
    }

    /** 注册并直接登录 */
    @PostMapping("/register")
    public ApiResponse<LoginVO> register(@Valid @RequestBody RegisterRequest req) {
        return ApiResponse.ok(authService.register(req));
    }

    /** 账号登录 */
    @PostMapping("/login")
    public ApiResponse<LoginVO> login(@Valid @RequestBody LoginRequest req) {
        return ApiResponse.ok(authService.login(req));
    }

    /** 退出登录：让当前 token 立即失效 */
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestHeader(value = AuthInterceptor.TOKEN_HEADER, required = false) String token) {
        authService.logout(token);
        return ApiResponse.ok();
    }

    /** 查询当前登录用户（前端刷新页面时校验登录态是否有效） */
    @GetMapping("/me")
    public ApiResponse<User> me() {
        User user = authService.getUser(UserContext.requireUserId());
        // 不要把密码哈希返回给前端
        user.setPassword(null);
        return ApiResponse.ok(user);
    }
}
