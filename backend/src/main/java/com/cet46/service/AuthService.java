package com.cet46.service;

import com.cet46.common.BizException;
import com.cet46.config.AppProperties;
import com.cet46.dto.LoginRequest;
import com.cet46.dto.LoginVO;
import com.cet46.dto.RegisterRequest;
import com.cet46.entity.User;
import com.cet46.mapper.TokenMapper;
import com.cet46.mapper.UserMapper;
import com.cet46.util.PasswordUtil;
import com.cet46.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * 本地用户体系：游客模式 + 账号注册登录。
 *
 * <p>设计要点：
 * <ul>
 *   <li>游客与注册用户同表存储，用 is_guest 区分，后续想加「游客数据升级为账号」很容易</li>
 *   <li>登录成功签发一个随机 token 存 t_token 表，前端放 localStorage，请求带 X-Token 头</li>
 *   <li>游客不做唯一合并：每次「以游客身份开始」都会新建一个本地账号，
 *       前端只要不删 localStorage 里的 token，学习记录就一直延续</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final TokenMapper tokenMapper;
    private final AppProperties props;

    /**
     * 创建游客账号。
     * <p>无密码、昵称默认「游客XXXX」，数据与其他账号完全隔离。
     */
    @Transactional
    public LoginVO createGuest() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        User user = new User();
        user.setUsername("guest_" + suffix);
        user.setPassword("");
        user.setNickname("游客" + suffix.substring(0, 4));
        user.setIsGuest(1);
        user.setCreateTime(TimeUtil.now());
        userMapper.insert(user);
        return issueToken(user);
    }

    /** 注册：用户名查重 -> 加盐哈希 -> 落库 -> 直接返回登录态 */
    @Transactional
    public LoginVO register(RegisterRequest req) {
        if (userMapper.countByUsername(req.getUsername()) > 0) {
            throw new BizException("该用户名已被占用，换一个试试");
        }
        User user = new User();
        user.setUsername(req.getUsername());
        user.setPassword(PasswordUtil.encrypt(req.getPassword()));
        user.setNickname(req.getNickname() == null || req.getNickname().isBlank()
                ? req.getUsername() : req.getNickname());
        user.setIsGuest(0);
        user.setCreateTime(TimeUtil.now());
        userMapper.insert(user);
        return issueToken(user);
    }

    /** 登录：统一提示「用户名或密码错误」，不暴露账号是否存在 */
    @Transactional
    public LoginVO login(LoginRequest req) {
        User user = userMapper.selectByUsername(req.getUsername());
        if (user == null || Integer.valueOf(1).equals(user.getIsGuest())
                || !PasswordUtil.matches(req.getPassword(), user.getPassword())) {
            throw new BizException("用户名或密码错误");
        }
        return issueToken(user);
    }

    /** 退出登录：删掉 token 即失效 */
    public void logout(String token) {
        if (token != null && !token.isBlank()) {
            tokenMapper.deleteByToken(token);
        }
    }

    /** 查询当前用户信息 */
    public User getUser(long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException(401, "用户不存在，请重新登录");
        }
        return user;
    }

    /** 签发 token 并组装返回体 */
    private LoginVO issueToken(User user) {
        String now = TimeUtil.now();
        // 顺手清理过期 token，防止表无限增长
        tokenMapper.deleteExpired(now);

        String token = UUID.randomUUID().toString().replace("-", "");
        tokenMapper.insert(token, user.getId(), now, TimeUtil.plusDays(props.getTokenExpireDays()));

        LoginVO vo = new LoginVO();
        vo.setToken(token);
        vo.setUserId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setIsGuest(user.getIsGuest());
        return vo;
    }
}
