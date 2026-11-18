package com.cet46.mapper;

import com.cet46.entity.ReviewTask;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 艾宾浩斯复习任务 Mapper。
 */
@Mapper
public interface ReviewTaskMapper {

    /** 答错时调用：已存在则重置回第 1 阶段并重新排期，不存在则新建 */
    @Insert("""
            INSERT INTO t_review_task (user_id, word_id, stage, due_time, finished, create_time, update_time)
            VALUES (#{userId}, #{wordId}, 1, #{dueTime}, 0, #{now}, #{now})
            ON CONFLICT(user_id, word_id) DO UPDATE SET
                stage       = 1,
                due_time    = #{dueTime},
                finished    = 0,
                update_time = #{now}
            """)
    int resetToFirstStage(@Param("userId") long userId,
                          @Param("wordId") long wordId,
                          @Param("dueTime") String dueTime,
                          @Param("now") String now);

    @Select("SELECT * FROM t_review_task WHERE user_id = #{userId} AND word_id = #{wordId}")
    ReviewTask selectByUserAndWord(@Param("userId") long userId, @Param("wordId") long wordId);

    /** 推进到下一记忆阶段（或全部完成） */
    @Update("""
            UPDATE t_review_task
            SET stage = #{stage}, due_time = #{dueTime}, finished = #{finished}, update_time = #{now}
            WHERE id = #{id}
            """)
    int updateStage(@Param("id") long id,
                    @Param("stage") int stage,
                    @Param("dueTime") String dueTime,
                    @Param("finished") int finished,
                    @Param("now") String now);

    /** 待复习列表：已到期且未完成，联表带出单词信息 */
    @Select("""
            SELECT rt.*, w.word, w.phonetic, w.meaning, w.example, w.freq_level
            FROM t_review_task rt
            JOIN t_word w ON w.id = rt.word_id
            WHERE rt.user_id = #{userId} AND rt.finished = 0 AND rt.due_time <= #{now}
            ORDER BY rt.due_time ASC
            LIMIT #{limit}
            """)
    List<ReviewTask> selectDue(@Param("userId") long userId,
                               @Param("now") String now,
                               @Param("limit") int limit);

    @Select("SELECT COUNT(1) FROM t_review_task WHERE user_id = #{userId} AND finished = 0 AND due_time <= #{now}")
    int countDue(@Param("userId") long userId, @Param("now") String now);

    /** 全部待复习数量（含未到期的），首页展示「复习计划」用 */
    @Select("SELECT COUNT(1) FROM t_review_task WHERE user_id = #{userId} AND finished = 0")
    int countPending(long userId);
}
