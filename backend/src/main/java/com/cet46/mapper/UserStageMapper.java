package com.cet46.mapper;

import com.cet46.entity.UserStage;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 关卡通关状态 Mapper。
 */
@Mapper
public interface UserStageMapper {

    /**
     * 记录一次闯关结果：没有记录则插入，有记录则更新「最好成绩」并累加挑战次数。
     * <p>MAX(best_accuracy, excluded.best_accuracy) 保证只升不降。
     */
    @Insert("""
            INSERT INTO t_user_stage (user_id, freq_level, stage_no, best_accuracy, play_count, last_time)
            VALUES (#{userId}, #{freqLevel}, #{stageNo}, #{accuracy}, 1, #{now})
            ON CONFLICT(user_id, freq_level, stage_no) DO UPDATE SET
                best_accuracy = MAX(best_accuracy, #{accuracy}),
                play_count    = play_count + 1,
                last_time     = #{now}
            """)
    int upsert(@Param("userId") long userId,
               @Param("freqLevel") int freqLevel,
               @Param("stageNo") int stageNo,
               @Param("accuracy") double accuracy,
               @Param("now") String now);

    /** 某难度下所有已挑战过的关卡（前端据此渲染「已通关 / 待挑战」） */
    @Select("SELECT * FROM t_user_stage WHERE user_id = #{userId} AND freq_level = #{freqLevel} ORDER BY stage_no")
    List<UserStage> selectByLevel(@Param("userId") long userId, @Param("freqLevel") int freqLevel);

    @Select("SELECT COUNT(1) FROM t_user_stage WHERE user_id = #{userId} AND best_accuracy >= 0.6")
    int countPassed(long userId);
}
