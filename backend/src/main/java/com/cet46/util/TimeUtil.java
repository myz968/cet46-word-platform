package com.cet46.util;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 时间工具。
 * <p>SQLite 没有原生日期类型，统一以 "yyyy-MM-dd HH:mm:ss" 文本存储：
 * 既直观、又可直接用字符串比较大小（格式固定时字典序等价于时间序）。
 */
public final class TimeUtil {

    public static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private TimeUtil() {
    }

    /** 当前时间字符串 */
    public static String now() {
        return LocalDateTime.now().format(FMT);
    }

    /** 当前时间 + n 天 */
    public static String plusDays(int days) {
        return LocalDateTime.now().plusDays(days).format(FMT);
    }

    /** 当前时间 + n 小时 */
    public static String plusHours(int hours) {
        return LocalDateTime.now().plusHours(hours).format(FMT);
    }
}
