package com.cet46.mapper;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 登录令牌 Mapper。
 * <p>为什么不用 JWT：JWT 需要额外依赖、且签发后无法「立即失效」；单机场景下
 * 一张 token 表 + 过期时间足够，逻辑一眼看懂。
 */
@Mapper
public interface TokenMapper {

    @Insert("INSERT INTO t_token (token, user_id, create_time, expire_time) VALUES (#{token}, #{userId}, #{createTime}, #{expireTime})")
    int insert(@Param("token") String token,
               @Param("userId") long userId,
               @Param("createTime") String createTime,
               @Param("expireTime") String expireTime);

    /** 查有效 token 对应的用户 id，过期或不存在返回 null */
    @Select("SELECT user_id FROM t_token WHERE token = #{token} AND expire_time > #{now}")
    Long selectValidUserId(@Param("token") String token, @Param("now") String now);

    @Delete("DELETE FROM t_token WHERE token = #{token}")
    int deleteByToken(@Param("token") String token);

    /** 登录时顺手清理过期记录，避免表无限增长 */
    @Delete("DELETE FROM t_token WHERE expire_time <= #{now}")
    int deleteExpired(@Param("now") String now);
}
