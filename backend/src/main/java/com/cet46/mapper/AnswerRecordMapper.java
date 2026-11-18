package com.cet46.mapper;

import com.cet46.entity.AnswerRecord;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 作答记录 Mapper：既用于落库，也用于统计「正确率 / 新增生词」。
 */
@Mapper
public interface AnswerRecordMapper {

    @Insert("""
            INSERT INTO t_answer_record (user_id, word_id, mode, correct, freq_level, stage_no, create_time)
            VALUES (#{userId}, #{wordId}, #{mode}, #{correct}, #{freqLevel}, #{stageNo}, #{createTime})
            """)
    int insert(AnswerRecord record);

    /** 批量写入本次闯关的全部作答（一条 INSERT 多 VALUES，比循环单条快很多） */
    @Insert("""
            <script>
            INSERT INTO t_answer_record (user_id, word_id, mode, correct, freq_level, stage_no, create_time)
            VALUES
            <foreach collection="list" item="r" separator=",">
                (#{r.userId}, #{r.wordId}, #{r.mode}, #{r.correct}, #{r.freqLevel}, #{r.stageNo}, #{r.createTime})
            </foreach>
            </script>
            """)
    int insertBatch(@Param("list") List<AnswerRecord> list);

    /**
     * 统计这批单词里「此前已经作答过」的词数。
     * <p>用总数减去它，就得到「本次新增生词数」（学习报告里的指标）。
     */
    @Select("""
            <script>
            SELECT COUNT(DISTINCT word_id) FROM t_answer_record
            WHERE user_id = #{userId} AND word_id IN
            <foreach collection="wordIds" item="id" open="(" separator="," close=")">#{id}</foreach>
            </script>
            """)
    int countAnsweredWordIds(@Param("userId") long userId, @Param("wordIds") List<Long> wordIds);

    /** 累计作答数（「我的」页面数据概览用） */
    @Select("SELECT COUNT(1) FROM t_answer_record WHERE user_id = #{userId}")
    int countByUser(long userId);

    /** 累计答对数 */
    @Select("SELECT COUNT(1) FROM t_answer_record WHERE user_id = #{userId} AND correct = 1")
    int countCorrectByUser(long userId);

    /** 已接触过的不同单词数（= 学过多少词） */
    @Select("SELECT COUNT(DISTINCT word_id) FROM t_answer_record WHERE user_id = #{userId}")
    int countDistinctLearnedWords(long userId);
}
