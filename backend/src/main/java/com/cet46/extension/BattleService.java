package com.cet46.extension;

/**
 * 【预留扩展接口】双人对战。
 *
 * <p>本期不实现任何业务，只定义契约。将来要做时按下面的顺序补三样东西：
 * <ol>
 *   <li>pom.xml 增加依赖 spring-boot-starter-websocket</li>
 *   <li>新建 WebSocketConfig（@EnableWebSocket + WebSocketConfigurer）与
 *       BattleSocketHandler（继承 TextWebSocketHandler）</li>
 *   <li>写一个类实现本接口并在 Handler 里调用，房间信息可存内存 Map 或新建 t_battle_room 表</li>
 * </ol>
 *
 * <p>协议建议（届时可调整）：
 * <pre>
 *   客户端 -> 服务端  {"type":"CREATE_ROOM"}
 *   服务端 -> 客户端  {"type":"ROOM_CREATED","roomNo":"1234"}
 *   客户端 -> 服务端  {"type":"JOIN_ROOM","roomNo":"1234"}
 *   服务端 -> 客户端  {"type":"WORD","wordId":1,"word":"abandon","options":[...]}
 *   客户端 -> 服务端  {"type":"ANSWER","roomNo":"1234","wordId":1,"correct":true}
 *   服务端 -> 客户端  {"type":"SCORE","roomNo":"1234","scores":{"A":3,"B":2}}
 * </pre>
 */
public interface BattleService {

    /** 创建对战房间，返回 4 位房间号 */
    String createRoom(long userId);

    /** 加入房间；房间不存在或已满时抛业务异常 */
    void joinRoom(String roomNo, long userId);

    /** 提交一道题的作答结果 */
    void submitAnswer(String roomNo, long userId, long wordId, boolean correct);

    /** 离开房间；房主离开则房间解散 */
    void leaveRoom(String roomNo, long userId);
}
