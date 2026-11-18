package com.cet46.dto;

import lombok.Data;

/** 登录/游客模式的返回结果，前端把 token 存本地，后续请求放在 X-Token 头里 */
@Data
public class LoginVO {

    private String token;

    private Long userId;

    private String username;

    private String nickname;

    /** 1=游客 0=注册用户 */
    private Integer isGuest;
}
