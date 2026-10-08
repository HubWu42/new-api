# 生产只读盘点（2026-10-08 · GS-465）

全部通过 km 上 PG 容器 `tttzk5rx6bwmrv7ytsgsk7dd` 的 `newapi` 库只读查询取得，以及 linksail 容器的只读 inspect。未做任何写入。

## 渠道（11 条）

| id | type | name | status | 上游 base_url |
|---|---|---|---|---|
| 1 | 1 | deepseek-hm | 启用 | newapi.sea-win.com |
| 6 | 1 | cc-luminai | 停用 | ai.luminai.cc |
| 7 | 1 | gpt-uocode | 停用 | www.uocode.com |
| 11 | 1 | cc-linkaihub | 停用 | linkaihub.net |
| 15 | 14 | cc-tokenswitchMax20x | 停用 | ivorysilver--meadow.freetokenswitch.cc |
| 18 | 1 | glm-hm | 启用 | newapi.sea-win.com |
| 19 | 1 | cc-sub2api | 启用 | sub2api.gosail.tech |
| 21 | 1 | cc-deepseek-hm | 停用 | newapi.sea-win.com |
| 23 | 1 | openrouter-hm | 启用 | openrouter.ai/api |
| 25 | 14 | cc-opencc | 停用 | opencc.281023.xyz |
| 26 | 1 | sub2api-gpt | 启用 | sub2api.gosail.tech |

**14 号渠道已不存在**（用户已删）。原本它承载的正是「Chat 转 Responses」那条路径。

## 全局 Chat 转 Responses 策略仍是悬空引用

`global.chat_completions_to_responses_policy`：
`{"enabled":true,"all_channels":false,"channel_ids":[14],"channel_types":[],"model_patterns":["^gpt-5[.]6-(luna|terra|sol)$"]}`

策略只点名 14 号渠道，而该渠道已删；现存渠道里没有任何一条会命中它。**结论：官方版对「上游 SSE 缺 Content-Type」的解析缺陷在生产里不可达**，因此不需要为它带补丁（GS-470 已按此定）。

## 用户与旧管理令牌

| id | username | role | 旧式 access_token |
|---|---|---|---|
| 1 | admin | 100（root） | **有** |
| 20 | guangyu | 1 | 无 |
| 23 | wangrd | 1 | 无 |
| 24 | wuhb | 1 | 无 |
| 25 | pengjl | 1 | 无 |
| 26 | zhoudb | 1 | 无 |

**旧管理令牌 = admin 用户的 `access_token`**，是生产里唯一一条。使用方判定：

- 本仓与工作空间配置里没有任何地方引用它（按 `NEWAPI` / `NEW_API` / `LINKAIL` 等关键词搜过 env、脚本、配置，命中的只有文档与 i18n 文案）。
- new-api 的 `logs` 表只记模型请求，不记管理接口调用，所以**无法从数据反查它的调用来源**。
- 结论：**未发现使用方**，按「没有在用它的服务」处理；处置见 GS-468（新版个人访问令牌 + 一个观察窗）。

## 令牌清单（15 条，不含明文）

`public`（user 1，最近使用 2026-10-08）、`scan-key`（user 1，7-23）、`袁`（user 1，8-27）、`public`（user 24，8-27 那条是 5-10）、`public`（user 26，5-11）、`public`（user 23，2026-10-08）、`test1` / `macmini`（user 20，4-5 月）、`付费`（user 1，5-03）、`ceshi`（user 23）、`111`（user 25）、`测试`（user 23）、`admin-test` / `test-fleet`（user 1，从未使用）。

## 镜像与密钥现状

- 运行容器 `linksail-nxaaajntzlycy98lwxrgcygx`，镜像引用 `hubwu42/new-api:custom`，实际 digest `sha256:65325f4695382008833ab4806abfe5d1ffd81693b3980068e9d2f0c4dc631d8e`（7/30 那版构建）。
- **既有漂移**：Docker Hub 上 `custom` 现在指向 8/3 的构建（`custom-20260803-043641d`），与正在运行的 digest 不一致——在换成新链之前，任何一次 Coolify 重部署都会静默把网关换成 8/3 那版。
- 容器环境变量名（只取名，不取值）：`SESSION_SECRET`、`SQL_DSN`、`REDIS_CONN_STRING`、`SERVICE_NAME_LINKSAIL`、`COOLIFY_*`。**没有 `CRYPTO_SECRET`**，新版按回退值沿用 `SESSION_SECRET`（与审计结论一致）。

## 近 7 天渠道调用

19 号 7219 次（最近 10-08 14:22）、21 号 6722 次（10-03）、25 号 2607 次（10-04）、26 号 1365 次（10-08）、1 号 81 次、18 号 65 次、0 号 48 次。手机走的是 19 号。
