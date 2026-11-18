package com.cet46.service;

import com.cet46.init.WordImportRunner;
import com.cet46.mapper.MaintenanceMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 词库维护服务：词库统计 + 重置词库。
 *
 * <p>「重置词库」是一次破坏性操作，会清空：
 * <ul>
 *   <li>t_word           词库</li>
 *   <li>t_answer_record  作答记录</li>
 *   <li>t_wrong_word     错题本</li>
 *   <li>t_review_task    艾宾浩斯复习任务</li>
 *   <li>t_stage_record   闯关记录</li>
 *   <li>t_user_stage     关卡进度</li>
 * </ul>
 * 用户账号（t_user）与登录令牌（t_token）保留，所以重置后不用重新登录，
 * 只是学习数据回到零，然后按内置词库全量重灌。
 *
 * <p>为什么必须清空学习数据：重置会重建 t_word、单词 id 全部变化，
 * 旧的作答/错题记录里的 word_id 会指向不存在或错误的单词，只有一起清掉才不会串数据。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WordAdminService {

    private final MaintenanceMapper maintenanceMapper;
    private final WordImportRunner wordImportRunner;

    /** 词库统计（设置页展示用） */
    public Map<String, Object> stats() {
        Map<String, Object> data = new LinkedHashMap<>();
        int l1 = maintenanceMapper.countByLevel(1);
        int l2 = maintenanceMapper.countByLevel(2);
        int l3 = maintenanceMapper.countByLevel(3);
        data.put("total", l1 + l2 + l3);
        data.put("level1", l1);
        data.put("level2", l2);
        data.put("level3", l3);
        return data;
    }

    /**
     * 重置词库：清空词库与全部学习数据后，按内置 JSON 全量重灌。
     *
     * @return 重置前后的词数，便于前端提示"已重置为 xxx 词"
     */
    @Transactional
    public Map<String, Object> reset() {
        int before = maintenanceMapper.countByLevel(1)
                + maintenanceMapper.countByLevel(2)
                + maintenanceMapper.countByLevel(3);

        log.warn("开始重置词库，重置前共 {} 词，将清空全部学习记录", before);

        // 先删依赖词库的表，再删词库本身，避免留下悬空 word_id
        maintenanceMapper.deleteAllAnswers();
        maintenanceMapper.deleteAllWrongWords();
        maintenanceMapper.deleteAllReviewTasks();
        maintenanceMapper.deleteAllStageRecords();
        maintenanceMapper.deleteAllUserStages();
        maintenanceMapper.deleteAllWords();
        maintenanceMapper.resetWordSequence();

        int added;
        try {
            added = wordImportRunner.importBuiltinNow();
        } catch (Exception e) {
            // 导入失败要整体回滚，不能留下一个空词库
            log.error("重置后导入内置词库失败，事务回滚", e);
            throw new IllegalStateException("重置失败：内置词库导入异常 - " + e.getMessage());
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("before", before);
        data.put("after", stats().get("total"));
        data.put("imported", added);
        log.warn("词库重置完成，重置后共 {} 词", data.get("after"));
        return data;
    }
}
