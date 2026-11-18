package com.cet46.extension;

import com.cet46.dto.LoginVO;

/**
 * 【预留扩展接口】QQ / 微信 第三方登录。
 *
 * <p>本期不实现，只定义契约。要做的时候按下面步骤补：
 * <ol>
 *   <li>在 QQ 互联 / 微信开放平台申请应用，拿到 appId 与 appSecret</li>
 *   <li>配置回调地址（桌面端可监听本地端口，或走一个固定的中转页）</li>
 *   <li>写实现类：先拼授权地址给前端跳转，回调拿 code 换 access_token，
 *       再取 openid/昵称，最后在本项目 t_user 表里按 openid 建/查用户并签发本地 token</li>
 * </ol>
 *
 * <p>说明：第三方登录必须联网，而本项目的定位是「单机可用的桌面背诵工具」，
 * 因此只预留接口，保证没网也能正常使用。
 */
public interface OAuthService {

    /**
     * 生成第三方授权页地址。
     *
     * @param provider QQ / WECHAT
     * @param state    防 CSRF 的随机串，回调时需原样带回
     */
    String buildAuthorizeUrl(String provider, String state);

    /**
     * 处理授权回调：用 code 换取第三方用户信息，并落地成本地账号，返回本项目的登录态。
     *
     * @param provider QQ / WECHAT
     * @param code     第三方回传的授权码
     */
    LoginVO handleCallback(String provider, String code);
}
