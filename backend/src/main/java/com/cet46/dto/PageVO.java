package com.cet46.dto;

import lombok.Data;

import java.util.List;

/** 通用分页结构 */
@Data
public class PageVO<T> {

    private Integer total;

    private Integer pageNo;

    private Integer pageSize;

    private List<T> list;

    public static <T> PageVO<T> of(int total, int pageNo, int pageSize, List<T> list) {
        PageVO<T> vo = new PageVO<>();
        vo.total = total;
        vo.pageNo = pageNo;
        vo.pageSize = pageSize;
        vo.list = list;
        return vo;
    }
}
