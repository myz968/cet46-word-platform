package com.cet46.init;

import com.cet46.entity.Word;
import com.cet46.mapper.WordMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 词库导入器：应用启动时把内置分级词库灌进 SQLite。
 *
 * <p>两种使用方式：
 * <ol>
 *   <li>自动：若 t_word 表为空，自动导入 resources/db/words-*.json（按文件名顺序）</li>
 *   <li>手动追加：启动时加参数 <code>--import-words=D:/xxx/my-words.json</code>，
 *       把自定义词表追加进库，已存在的单词自动跳过（按单词文本去重）</li>
 * </ol>
 *
 * <p>JSON 格式（一个文件一个难度分区）：
 * <pre>
 * {
 *   "level": 1,
 *   "words": [
 *     {"word":"abandon","phonetic":"əˈbændən","meaning":"v. 放弃；抛弃","example":"He abandoned his car."}
 *   ]
 * }
 * </pre>
 *
 * <p>为什么要做成「程序导入」而不是纯 SQL 脚本：5500 词的 INSERT 语句体积巨大且难以维护，
 * JSON + 批量插入既好扩词、又好版本管理。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WordImportRunner implements ApplicationRunner {

    /** 单次批量插入条数，太大容易触发 SQLite 变量上限 */
    private static final int BATCH_SIZE = 200;

    private final WordMapper wordMapper;
    private final ObjectMapper objectMapper;

    private final ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 全库已有单词，用于去重
        Set<String> existing = new HashSet<>(wordMapper.selectAllWords());

        // 1) 手动追加导入（可选）
        if (args.containsOption("import-words")) {
            List<String> paths = args.getOptionValues("import-words");
            if (paths != null) {
                for (String p : paths) {
                    importFromFile(Paths.get(p), existing);
                }
            }
        }

        // 2) 内置词库：每次启动都跑一遍，已存在的单词按单词文本跳过。
        //    做成"每次都跑"而不是"表为空才跑"，是为了修复上次导入被中断
        //    （比如导入到一半进程被杀）导致词库只进了一半、之后再也补不回来的问题。
        int before = existing.size();
        importBuiltin(existing);
        int added = existing.size() - before;
        if (added > 0) {
            log.info("内置词库本次补齐 {} 个单词", added);
        } else {
            log.info("内置词库已齐备（{} 词），无需导入", before);
        }

        log.info("词库就绪：高频 {} 词 / 中频 {} 词 / 低频 {} 词",
                wordMapper.countByLevel(1), wordMapper.countByLevel(2), wordMapper.countByLevel(3));
    }

    /**
     * 立即执行一次内置词库导入，返回本次新增的单词数。
     *
     * <p>供「重置词库」功能复用：重置时先清空表，再调用本方法把内置词库重新灌满。
     * 内部按单词文本去重，重复调用不会产生重复数据。
     */
    public int importBuiltinNow() throws Exception {
        Set<String> existing = new HashSet<>(wordMapper.selectAllWords());
        int before = existing.size();
        importBuiltin(existing);
        return existing.size() - before;
    }

    /** 扫描 classpath:db/words-*.json 并逐个导入 */
    private void importBuiltin(Set<String> existing) throws Exception {
        Resource[] resources = resolver.getResources("classpath*:db/words-*.json");
        // 按文件名排序，保证导入顺序稳定（高频 -> 中频 -> 低频）
        Arrays.sort(resources, (a, b) -> {
            String na = a.getFilename() == null ? "" : a.getFilename();
            String nb = b.getFilename() == null ? "" : b.getFilename();
            return na.compareTo(nb);
        });

        log.info("开始导入内置词库，共 {} 个文件", resources.length);
        for (Resource resource : resources) {
            try (InputStream in = resource.getInputStream()) {
                doImport(objectMapper.readTree(in), "内置:" + resource.getFilename(), existing);
            }
        }
    }

    /** 从磁盘上的 JSON 文件导入（用户自定义词表） */
    private void importFromFile(Path path, Set<String> existing) throws Exception {
        if (!Files.exists(path)) {
            log.warn("指定的词库文件不存在，已跳过：{}", path);
            return;
        }
        try (InputStream in = Files.newInputStream(path)) {
            doImport(objectMapper.readTree(in), "外部:" + path.getFileName(), existing);
        }
    }

    /** 解析一个 JSON 节点并批量写库 */
    private void doImport(JsonNode root, String source, Set<String> existing) {
        int level = root.path("level").asInt(0);
        if (level < 1 || level > 3) {
            log.warn("{} 的 level 字段非法（应为 1~3），已跳过", source);
            return;
        }
        JsonNode wordsNode = root.path("words");
        if (!wordsNode.isArray()) {
            log.warn("{} 缺少 words 数组，已跳过", source);
            return;
        }

        // seq 接着该难度的最大值继续排
        int seq = wordMapper.maxSeqByLevel(level);
        List<Word> buffer = new ArrayList<>(BATCH_SIZE);
        int inserted = 0;

        for (JsonNode node : wordsNode) {
            String wordText = node.path("word").asText("").trim();
            if (wordText.isEmpty() || existing.contains(wordText)) {
                continue;
            }
            Word w = new Word();
            w.setWord(wordText);
            w.setPhonetic(node.path("phonetic").asText(""));
            w.setMeaning(node.path("meaning").asText(""));
            w.setExample(node.path("example").asText(""));
            w.setFreqLevel(level);
            w.setSeq(++seq);
            buffer.add(w);
            existing.add(wordText);

            if (buffer.size() >= BATCH_SIZE) {
                wordMapper.insertBatch(buffer);
                inserted += buffer.size();
                buffer.clear();
            }
        }
        if (!buffer.isEmpty()) {
            wordMapper.insertBatch(buffer);
            inserted += buffer.size();
        }
        log.info("{} 导入完成：新增 {} 词", source, inserted);
    }
}
