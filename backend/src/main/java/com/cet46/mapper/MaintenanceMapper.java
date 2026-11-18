package com.cet46.mapper;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * 词库维护 Mapper（「重置词库」用）。
 *
 * <p>单独放一个 Mapper 而不是往业务 Mapper 里塞删除方法，是为了让「会清数据」的 SQL
 * 集中在一处、一眼可见，避免以后误用业务 Mapper 把用户数据删掉。
 *
 * <p>注意：这些 DELETE 都是"全表清空"，没有 where 条件，只能被 Service 里的重置流程调用。
 */
@Mapper
public interface MaintenanceMapper {

    @Delete("DELETE FROM t_word")
    int deleteAllWords();

    @Delete("DELETE FROM t_answer_record")
    int deleteAllAnswers();

    @Delete("DELETE FROM t_wrong_word")
    int deleteAllWrongWords();

    @Delete("DELETE FROM t_review_task")
    int deleteAllReviewTasks();

    @Delete("DELETE FROM t_stage_record")
    int deleteAllStageRecords();

    @Delete("DELETE FROM t_user_stage")
    int deleteAllUserStages();

    /** 把 t_word 的自增 id 归零，重置后单词 id 从 1 开始，便于对照词库顺序排查问题 */
    @Delete("DELETE FROM sqlite_sequence WHERE name = 't_word'")
    int resetWordSequence();

    /** 各难度词数，用于设置页展示与重置后校验 */
    @Select("SELECT COUNT(1) FROM t_word WHERE freq_level = #{freqLevel}")
    int countByLevel(int freqLevel);
}
