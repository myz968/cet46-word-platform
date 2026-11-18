package com.cet46;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 四六级单词闯关背诵平台 —— 后端启动类。
 *
 * <p>启动方式：
 * <pre>
 *   java -jar cet46-word-platform.jar
 *   java -jar cet46-word-platform.jar --app.db-path=D:/xxx/cet46.db --server.port=8080
 * </pre>
 *
 * <p>注意：SQLite 只会创建数据库文件，不会创建目录。若目录不存在会在建连时报错，
 * 因此这里在 Spring 启动前先把数据库所在目录建好。
 */
@SpringBootApplication
@MapperScan("com.cet46.mapper")
public class WordPlatformApplication {

    /** 与 application.yml 中 app.db-path 的默认值保持一致 */
    private static final String DEFAULT_DB_PATH = "./data/cet46.db";

    public static void main(String[] args) {
        prepareDbDirectory(args);
        SpringApplication.run(WordPlatformApplication.class, args);
    }

    /**
     * 解析命令行中的 --app.db-path=xxx，提前创建其父目录。
     * <p>同时写入系统属性，这样 Spring 的占位符 ${app.db-path} 也能读到命令行覆盖值
     * （命令行参数本身优先级更高，两者是一致的，此处只是为了建目录时能拿到路径）。
     */
    private static void prepareDbDirectory(String[] args) {
        String dbPath = DEFAULT_DB_PATH;
        for (String arg : args) {
            if (arg.startsWith("--app.db-path=")) {
                dbPath = arg.substring("--app.db-path=".length());
                System.setProperty("app.db-path", dbPath);
            }
        }
        try {
            Path parent = Paths.get(dbPath).toAbsolutePath().getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
        } catch (IOException e) {
            // 目录创建失败不阻塞启动，让后续数据库连接抛出更明确的异常
            System.err.println("[启动警告] 无法创建数据库目录：" + e.getMessage());
        }
    }
}
