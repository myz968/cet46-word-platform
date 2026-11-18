package com.cet46.controller;

import com.cet46.common.ApiResponse;
import com.cet46.common.UserContext;
import com.cet46.dto.PageVO;
import com.cet46.dto.QuestionVO;
import com.cet46.dto.QuizResultVO;
import com.cet46.dto.QuizSubmitRequest;
import com.cet46.entity.WrongWord;
import com.cet46.service.WrongBookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 错题本接口。
 */
@RestController
@RequestMapping("/api/wrong-book")
@RequiredArgsConstructor
public class WrongBookController {

    private final WrongBookService wrongBookService;

    /** 分页查看错题 */
    @GetMapping
    public ApiResponse<PageVO<WrongWord>> page(@RequestParam(defaultValue = "1") int pageNo,
                                               @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(wrongBookService.page(UserContext.requireUserId(), pageNo, pageSize));
    }

    /** 错题重练出题 */
    @GetMapping("/questions")
    public ApiResponse<List<QuestionVO>> questions(@RequestParam(defaultValue = "EN2CN") String mode,
                                                   @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.ok(wrongBookService.questions(UserContext.requireUserId(), mode, limit));
    }

    /** 提交错题重练结果 */
    @PostMapping("/submit")
    public ApiResponse<QuizResultVO> submit(@Valid @RequestBody QuizSubmitRequest req) {
        return ApiResponse.ok(wrongBookService.submit(UserContext.requireUserId(), req));
    }

    /** 手动把某条错题移出错题本 */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> remove(@PathVariable long id) {
        wrongBookService.remove(UserContext.requireUserId(), id);
        return ApiResponse.ok();
    }
}
