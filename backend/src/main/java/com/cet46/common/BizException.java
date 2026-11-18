package com.cet46.common;

import lombok.Getter;

/**
 * 业务异常。业务代码里直接 throw，由 GlobalExceptionHandler 统一转成 JSON。
 * <p>用它替代返回 null / false，能让 Service 层逻辑更直观。
 */
@Getter
public class BizException extends RuntimeException {

    private final int code;

    public BizException(String message) {
        this(1001, message);
    }

    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }
}
