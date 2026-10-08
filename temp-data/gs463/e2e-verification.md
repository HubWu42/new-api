# 切换后端到端验证（2026-10-08 · GS-469）

全部为真实付费调用，走手机那条链路：`claude-opus-5` → 19 号渠道 `cc-sub2api` → `gpt-6.1-sol`。凭证用 admin 自己那把 `public` 令牌，调用后未在产物里留任何令牌明文。

## 一、非流式 · 开启思考

请求：`POST /v1/messages`，`thinking: {type: adaptive, display: summarized}`，`max_tokens: 600`。

回包：HTTP 200，`model: gpt-6.1-sol`，`stop_reason: end_turn`，`usage.output_tokens: 105`，账单里 `reasoning_tokens: 61`。

- **`thinking` 块：363 字**（非空，开头 `**Formulating a response in Chinese** …`）
- `text` 块：48 字（`天空是蓝色的，因为阳光中的蓝光比红光等长波长的光更容易被空气分子散射…`）

## 二、流式 · 开启思考（手机用的形态）

事件序列完整：`message_start` → 2×`content_block_start` → 115×`content_block_delta` → 2×`content_block_stop` → `message_delta` → `message_stop`。

- **思考增量合计 483 字**（`thinking_delta`）
- 正文增量合计 45 字（`text_delta`）

## 三、不带思考

请求不带 `thinking` 字段。回包 HTTP 200，内容块只有 `['text']`，**没有 `thinking` 块**，正文正常。

## 四、账目

调用前后 admin 的 `used_quota`：`873122945905` → `873122961993`（**+16088**，三次调用合计；切换时已核对过六个用户余额与切换前逐条一致）。

## 五、没跑的部分（如实记录）

- **SDK 层与「控制面收到思考事件」**：需要手机那条线的执行者与控制面环境，本机与两条线的工作台都没有装那套依赖（`agent-platform` 及其 `gs-372-mobile` 工作台都没有 `node_modules`）。本次验到的是网关这一层——也就是 SDK 实际打的那个协议端点；SDK 消息里有没有 thinking 块、控制面有没有对应事件，仍未验证。
- **真机 UI**：按 D6 归手机端任务的人工核对。
- **原验收里的「Chat 转 Responses 路径」**：14 号渠道已删除、策略悬空引用它且无渠道匹配，该路径在生产不可达，这一条作废（见 GS-465 的盘点）。
