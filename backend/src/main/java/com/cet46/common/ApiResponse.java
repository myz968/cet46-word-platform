package com.cet46.common;

import lombok.Data;

/**
 * 统一响应体。前端只需判断 code == 0 表示成功。
 *
 * <pre>
 * { "code": 0, "message": "ok", "data": {...} }
 * </pre>
 */
@Data
public class ApiResponse<T> {

    /** 0=成功；401=未登录/登录失效；500=服务器异常；1001 起为业务提示 */
    private int code;
    private String message;
    private T data;

    public static <T> ApiResponse<T> ok(T data) {
        ApiResponse<T> r = new ApiResponse<>();
        r.code = 0;
        r.message = "ok";
        r.data = data;
        return r;
    }

    public static <T> ApiResponse<T> ok() {
        return ok(null);
    }

    public static <T> ApiResponse<T> fail(int code, String message) {
        ApiResponse<T> r = new ApiResponse<>();
        r.code = code;
        r.message = message;
        return r;
    }
}
