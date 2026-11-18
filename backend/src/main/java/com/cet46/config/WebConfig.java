package com.cet46.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web 配置：注册登录拦截器 + 跨域规则。
 *
 * <p>跨域说明：本项目采用前后端分离（前端 5173 / Electron file:// 协议，后端 8080）。
 * Electron 用 file:// 加载页面时浏览器发出的 Origin 是 "null"，因此这里用
 * allowedOriginPatterns("*") 放开来源、但不允许携带 Cookie（本项目用 token 头，不需要 Cookie）。
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                // 登录相关接口与健康检查不需要 token
                .excludePathPatterns(
                        "/api/health",
                        "/api/auth/guest",
                        "/api/auth/register",
                        "/api/auth/login"
                );
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
