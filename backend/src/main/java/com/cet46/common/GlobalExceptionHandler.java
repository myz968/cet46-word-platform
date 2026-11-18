package com.cet46.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理：把各类异常统一转换成 { code, message, data } 结构，
 * 前端不必为不同错误写不同解析逻辑。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 业务异常：属于「用户可理解」的提示，用 info 级别，不打印堆栈 */
    @ExceptionHandler(BizException.class)
    public ApiResponse<Void> handleBiz(BizException e) {
        log.info("业务异常: {}", e.getMessage());
        return ApiResponse.fail(e.getCode(), e.getMessage());
    }

    /** @Valid 校验失败：取第一条错误信息返回，前端直接 toast */
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public ApiResponse<Void> handleValid(BindException e) {
        FieldError first = e.getBindingResult().getFieldError();
        String msg = first == null ? "参数不合法" : first.getDefaultMessage();
        return ApiResponse.fail(1002, msg);
    }

    /** 兜底：未预料的异常，打印完整堆栈方便排查，但只给前端一句通用提示 */
    @ExceptionHandler(Exception.class)
    public ApiResponse<Void> handleOther(Exception e) {
        log.error("系统异常", e);
        return ApiResponse.fail(500, "服务器开小差了：" + e.getClass().getSimpleName());
    }
}
