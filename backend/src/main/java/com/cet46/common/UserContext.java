package com.cet46.common;

/**
 * 当前登录用户上下文。
 * <p>由 AuthInterceptor 在请求进入时写入、请求结束时清除，Service 层直接取用，
 * 避免每个方法都传 userId 参数。
 * <p>注意：Tomcat 用线程池复用线程，所以必须在 finally 里 remove，否则会造成用户串号。
 */
public final class UserContext {

    private static final ThreadLocal<Long> USER_ID = new ThreadLocal<>();

    private UserContext() {
    }

    public static void set(Long userId) {
        USER_ID.set(userId);
    }

    /** 取当前用户 id，未登录时抛异常（正常情况下拦截器已挡住，这里只是双保险） */
    public static Long requireUserId() {
        Long id = USER_ID.get();
        if (id == null) {
            throw new BizException(401, "登录状态已失效，请重新登录");
        }
        return id;
    }

    public static void clear() {
        USER_ID.remove();
    }
}
