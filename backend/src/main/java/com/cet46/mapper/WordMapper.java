package com.cet46.mapper;

import com.cet46.entity.Word;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 词库 Mapper。
 * <p>关卡与单词的对应关系不落独立表，而是「按 freq_level 分组 + seq 排序 + LIMIT/OFFSET 切片」算出，
 * 这样把 app.level-size 从 20 改成 10，关卡数会自动重算，无需迁移数据。
 */
@Mapper
public interface WordMapper {

    @Select("SELECT COUNT(1) FROM t_word")
    int countAll();

    @Select("SELECT COUNT(1) FROM t_word WHERE freq_level = #{freqLevel}")
    int countByLevel(int freqLevel);

    /** 某难度当前最大排序号，导入新词时接着往后排 */
    @Select("SELECT IFNULL(MAX(seq), 0) FROM t_word WHERE freq_level = #{freqLevel}")
    int maxSeqByLevel(int freqLevel);

    /** 取某难度的某一页单词（等价于取某一关的单词），size=每关词数，offset=(关卡号-1)*size */
    @Select("""
            SELECT * FROM t_word
            WHERE freq_level = #{freqLevel}
            ORDER BY seq, id
            LIMIT #{size} OFFSET #{offset}
            """)
    List<Word> selectByLevelPage(@Param("freqLevel") int freqLevel,
                                 @Param("size") int size,
                                 @Param("offset") int offset);

    @Select("SELECT * FROM t_word WHERE id = #{id}")
    Word selectById(Long id);

    /** 全部已存在的单词（导入时用于去重，避免重复插入触发唯一索引异常） */
    @Select("SELECT word FROM t_word")
    List<String> selectAllWords();

    @Select("SELECT * FROM t_word WHERE word = #{word}")
    Word selectByWord(String word);

    /**
     * 随机取同难度的干扰项（排除正确答案自身），用于生成四选一的三个错误选项。
     * <p>ORDER BY RANDOM() 在 SQLite 里会全表扫描，词库万级以内完全可接受。
     */
    @Select("""
            SELECT * FROM t_word
            WHERE freq_level = #{freqLevel} AND id <> #{excludeId}
            ORDER BY RANDOM()
            LIMIT #{limit}
            """)
    List<Word> selectRandomSameLevel(@Param("freqLevel") int freqLevel,
                                     @Param("excludeId") long excludeId,
                                     @Param("limit") int limit);

    /** 按 id 批量查词（错题重练、复习推送时用） */
    @Select("""
            <script>
            SELECT * FROM t_word WHERE id IN
            <foreach collection="ids" item="id" open="(" separator="," close=")">#{id}</foreach>
            </script>
            """)
    List<Word> selectByIds(@Param("ids") List<Long> ids);

    /** 批量插入词库（词库导入器使用）。用 INSERT OR IGNORE，重复单词自动跳过，保证导入幂等 */
    @Insert("""
            <script>
            INSERT OR IGNORE INTO t_word (word, phonetic, meaning, example, freq_level, seq) VALUES
            <foreach collection="words" item="w" separator=",">
                (#{w.word}, #{w.phonetic}, #{w.meaning}, #{w.example}, #{w.freqLevel}, #{w.seq})
            </foreach>
            </script>
            """)
    int insertBatch(@Param("words") List<Word> words);
}
