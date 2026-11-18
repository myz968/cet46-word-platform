package com.cet46.mapper;

import com.cet46.entity.StageRecord;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 闯关记录 Mapper（学习报告数据源）。
 */
@Mapper
public interface StageRecordMapper {

    @Insert("""
            INSERT INTO t_stage_record
                (user_id, freq_level, stage_no, mode, total, correct_count, accuracy, duration_sec, new_word_count, create_time)
            VALUES
                (#{userId}, #{freqLevel}, #{stageNo}, #{mode}, #{total}, #{correctCount}, #{accuracy}, #{durationSec}, #{newWordCount}, #{createTime})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(StageRecord record);

    /** 最近若干条闯关记录（「我的」页面展示历史） */
    @Select("""
            SELECT * FROM t_stage_record
            WHERE user_id = #{userId}
            ORDER BY id DESC
            LIMIT #{limit}
            """)
    List<StageRecord> selectRecent(@Param("userId") Long userId, @Param("limit") int limit);

    @Select("SELECT COUNT(1) FROM t_stage_record WHERE user_id = #{userId}")
    int countByUser(@Param("userId") long userId);
}
