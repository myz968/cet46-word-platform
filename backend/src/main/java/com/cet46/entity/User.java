package com.cet46.entity;

import lombok.Data;

/**
 * 用户（含游客）。对应表 t_user。
 */
@Data
public class User {

    private Long id;

    /** 登录名，游客为 guest_xxxxxx */
    private String username;

    /** 加盐 SHA-256 密文，游客为空串 */
    private String password;

    private String nickname;

    /** 1=游客 0=注册用户（SQLite 无 boolean，用 Integer） */
    private Integer isGuest;

    private String createTime;
}
