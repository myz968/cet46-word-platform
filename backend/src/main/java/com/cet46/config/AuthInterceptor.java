package com.cet46.config;

import com.cet46.common.ApiResponse;
import com.cet46.common.UserContext;
import com.cet46.mapper.TokenMapper;
import com.cet46.util.TimeUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;

/**
 * 登录拦截器：校验请求头里的 X-Token，通过后把 userId 放进 UserContext。
 *
 * <p>为什么不用 Spring Security：本项目只有「本地单机登录」这一种诉求，
 * 一个拦截器 + 一张 token 表足够，引入 Spring Security 反而增加理解成本与配置量。
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    public static final String TOKEN_HEADER = "X-Token";

    private final TokenMapper tokenMapper;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        // 浏览器/Electron 的跨域预检请求不带自定义头，必须放行，否则所有请求都会 401
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String token = request.getHeader(TOKEN_HEADER);
        if (token == null || token.isBlank()) {
            writeUnauthorized(response);
            return false;
        }

        Long userId = tokenMapper.selectValidUserId(token, TimeUtil.now());
        if (userId == null) {
            writeUnauthorized(response);
            return false;
        }

        UserContext.set(userId);
        return true;
    }

    /** 请求结束务必清理 ThreadLocal，否则线程复用会导致用户串号 */
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        UserContext.clear();
    }

    /**
     * 直接写 JSON 而不是抛异常：拦截器阶段抛异常虽然也能被全局处理器捕获，
     * 但直接写响应更确定、更好排查。
     */
    private void writeUnauthorized(HttpServletResponse response) throws Exception {
        response.setStatus(HttpServletResponse.SC_OK);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(
                ApiResponse.fail(401, "登录状态已失效，请重新登录")));
    }
}
