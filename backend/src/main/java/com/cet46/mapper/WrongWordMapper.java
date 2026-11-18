package com.cet46.mapper;

import com.cet46.entity.WrongWord;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 错题本 Mapper。
 * <p>「错一次加一，没记录则新建」用 SQLite 的 UPSERT 语法一条 SQL 搞定：
 * {@code ON CONFLICT(user_id, word_id) DO UPDATE ...}（SQLite 3.24+ 支持）。
 */
@Mapper
public interface WrongWordMapper {

    /** 答错时调用：没有记录就插入，有记录就错误次数 +1 并重新标记为未掌握 */
    @Insert("""
            INSERT INTO t_wrong_word (user_id, word_id, wrong_count, mastered, last_wrong_time, create_time)
            VALUES (#{userId}, #{wordId}, 1, 0, #{now}, #{now})
            ON CONFLICT(user_id, word_id) DO UPDATE SET
                wrong_count     = wrong_count + 1,
                mastered        = 0,
                last_wrong_time = #{now}
            """)
    int upsertWrong(@Param("userId") long userId, @Param("wordId") long wordId, @Param("now") String now);

    /** 错题列表（未掌握的），联表带出单词信息，按最近答错时间倒序 */
    @Select("""
            SELECT ww.*, w.word, w.phonetic, w.meaning, w.example, w.freq_level
            FROM t_wrong_word ww
            JOIN t_word w ON w.id = ww.word_id
            WHERE ww.user_id = #{userId} AND ww.mastered = 0
            ORDER BY ww.last_wrong_time DESC
            LIMIT #{size} OFFSET #{offset}
            """)
    List<WrongWord> selectPage(@Param("userId") long userId,
                               @Param("size") int size,
                               @Param("offset") int offset);

    @Select("SELECT COUNT(1) FROM t_wrong_word WHERE user_id = #{userId} AND mastered = 0")
    int countUnmastered(long userId);

    /** 随机抽一批错题用于「错题重练」 */
    @Select("""
            SELECT ww.*, w.word, w.phonetic, w.meaning, w.example, w.freq_level
            FROM t_wrong_word ww
            JOIN t_word w ON w.id = ww.word_id
            WHERE ww.user_id = #{userId} AND ww.mastered = 0
            ORDER BY RANDOM()
            LIMIT #{limit}
            """)
    List<WrongWord> selectRandomForReview(@Param("userId") long userId, @Param("limit") int limit);

    /** 标记为已掌握（错题重练答对后） */
    @Update("UPDATE t_wrong_word SET mastered = 1 WHERE user_id = #{userId} AND word_id = #{wordId}")
    int markMasteredByWordId(@Param("userId") long userId, @Param("wordId") long wordId);

    /** 手动移出错题本（按错题本记录 id） */
    @Delete("DELETE FROM t_wrong_word WHERE id = #{id} AND user_id = #{userId}")
    int deleteById(@Param("id") long id, @Param("userId") long userId);
}
