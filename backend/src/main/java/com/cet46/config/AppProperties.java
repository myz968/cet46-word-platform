package com.cet46.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 业务配置绑定（对应 application.yml 里的 app.*）。
 * <p>用配置类而不是到处 @Value，好处是改配置只需改 yml，代码里读取处统一且带默认值。
 */
@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    /** SQLite 数据库文件绝对路径 */
    private String dbPath = "./data/cet46.db";

    /** 每关单词数量（改这里即可整体调整关卡粒度） */
    private int levelSize = 20;

    /** 登录令牌有效天数 */
    private int tokenExpireDays = 7;

    /** 艾宾浩斯复习间隔（天），逗号分隔，依次对应第 1~5 次复习 */
    private String reviewIntervals = "0,1,2,4,7";

    /** 把 "1,2,4,7,15" 解析成 int 数组，供复习逻辑使用 */
    public int[] intervalArray() {
        String[] parts = reviewIntervals.split(",");
        int[] arr = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            arr[i] = Integer.parseInt(parts[i].trim());
        }
        return arr;
    }
}
