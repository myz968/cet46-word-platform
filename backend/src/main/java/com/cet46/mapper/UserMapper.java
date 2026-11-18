package com.cet46.mapper;

import com.cet46.entity.User;
import org.apache.ibatis.annotations.*;

/**
 * 用户表 Mapper。SQL 全部手写，方便逐行阅读与调整。
 */
@Mapper
public interface UserMapper {

    /** 按登录名查用户（登录/注册查重都用它） */
    @Select("SELECT * FROM t_user WHERE username = #{username}")
    User selectByUsername(String username);

    @Select("SELECT * FROM t_user WHERE id = #{id}")
    User selectById(Long id);

    @Select("SELECT COUNT(1) FROM t_user WHERE username = #{username}")
    int countByUsername(String username);

    /**
     * 新增用户，并把数据库自增主键回填到实体的 id 上。
     * <p>SQLite 驱动支持 RETURN_GENERATED_KEYS（内部实现是 last_insert_rowid()）。
     */
    @Insert("""
            INSERT INTO t_user (username, password, nickname, is_guest, create_time)
            VALUES (#{username}, #{password}, #{nickname}, #{isGuest}, #{createTime})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(User user);

    @Update("UPDATE t_user SET nickname = #{nickname} WHERE id = #{userId}")
    int updateNickname(@Param("userId") Long userId, @Param("nickname") String nickname);
}
