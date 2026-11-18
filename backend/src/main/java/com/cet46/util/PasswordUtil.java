package com.cet46.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

/**
 * 密码工具：加盐 SHA-256 摘要。
 *
 * <p>为什么不用明文 / 不加盐 MD5：数据库文件就躺在用户电脑上，明文等于没加密，
 * 不加盐则同样的密码会得到同样的哈希（彩虹表可反查）。
 *
 * <p>存储格式：{@code salt$hash}，salt 为 16 字节随机数（十六进制 32 位）。
 * <p>说明：生产环境建议改用 BCrypt（自带慢哈希，抗暴力破解），
 * 本项目为「依赖最小化」用 JDK 自带能力实现，不引入 spring-security-crypto。
 */
public final class PasswordUtil {

    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordUtil() {
    }

    /** 生成盐并返回可直接入库的密文，形如 "a1b2...$9f8e..." */
    public static String encrypt(String rawPassword) {
        byte[] saltBytes = new byte[16];
        RANDOM.nextBytes(saltBytes);
        String salt = toHex(saltBytes);
        return salt + "$" + sha256(salt + rawPassword);
    }

    /** 校验明文密码是否与库中密文匹配 */
    public static boolean matches(String rawPassword, String stored) {
        if (rawPassword == null || stored == null) {
            return false;
        }
        int idx = stored.indexOf('$');
        if (idx <= 0) {
            return false;
        }
        String salt = stored.substring(0, idx);
        String expect = stored.substring(idx + 1);
        return sha256(salt + rawPassword).equals(expect);
    }

    private static String sha256(String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return toHex(md.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("JDK 缺少 SHA-256 算法", e);
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}
