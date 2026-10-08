# 我们的分支与发布约定

本文件只记录 HubWu42/new-api 的 fork 约定。上游功能与安装说明沿用上游文档。

## 分支与上游同步

- `origin` 是 `HubWu42/new-api`；`upstream` 是 `QuantumNous/new-api`。`upstream/main` 只跟随官方，不承载我们的修改。
- 默认分支与合并目标都是 `main`。它保存官方基线与我们必要的修改；不再以 `custom` 作为开发或发布分支。旧 `custom` 要在发布链干跑通过后删除，恢复线上靠保留的镜像，不靠重建该分支。
- 任务分支命名沿用 `feat/GS-<号>-<短描述>` 或 `fix/GS-<号>-<短描述>`，有父任务时使用父任务号。从 `origin/main` 建 worktree，改动经 PR 合入 `main`；主工作区仅快进更新。
- 本仓**不放 Fleet 的临时工作文件**：执行期的日志、盘点、证据放 issue 评论或仓外的作业目录（`temp-data/` 已在 `.gitignore` 里）。这个仓是上游项目的公开 fork，临时件会公开可见，也会随每次跟上游 merge 一直留着。
- 上游更新由人选择时机，手动 merge，不 rebase、不强制覆盖我们的历史。在任务 worktree 的分支执行：

```bash
git fetch origin
git fetch upstream --tags
git merge origin/main
git merge upstream/main
git merge-base --is-ancestor upstream/main HEAD
```

解决冲突并复核下方工作流清单后，通过 PR 合入 `main`。上游同步须保留上游祖先关系；如果 squash 会丢失上游祖先关系，该同步 PR 使用 merge commit。完成后读取最新 `origin/main`，用 `git merge-base --is-ancestor upstream/main origin/main` 确认退出码为 0。仅看 `git rev-list --count upstream/main..HEAD` 为 0，不能证明已追上上游。

## 日期 tag 与脚本接口

发布入口固定为 `scripts/release-tag.sh`，工作流固定为 `.github/workflows/release-image.yml`。实现按本文件来，改了名字要同步改这里。脚本与工作流已按本文件实现并跑通：2026-10-08 起线上镜像由这条链产出（首版 `2026.10.8-r2`）。

- 日期按 `Asia/Shanghai`（北京时间）。Git tag 是 `v年.月.日-r当日序号`，例如 `v2026.10.8-r1`；月、日不带前导零，序号为从 `r1` 起的正整数。
- 镜像 tag 去掉开头的 `v`，例如 `2026.10.8-r1`。这是我们的发布标识，不改上游的版本号方案。
- 干跑 tag 为正式 tag 加 `-dry.N`，例如 `v2026.10.8-r1-dry.1`，N 从 1 起。它触发构建并推送独立镜像 tag，但不触发生产部署。
- 校验包含格式、有效日历日期、序号唯一性与时间顺序；正式版本不得早于已发布的最新正式版本，同日序号必须递增。数字比较不能用字符串字典序。正式序号为 1–999；当天达到 r999 后拒绝继续分配，不填补旧序号的空缺。月日及序号不带前导零。
- 已经使用的 tag 不覆盖、不复用；干跑 tag 的唯一性按完整名称比较，`-dry.N` 中 N 为不带前导零的正整数。干跑 tag 不参与正式版本的日期和序号排序；干跑校验只检查格式、日历日期与完整名称未被使用。
- 构建来源必须是已经合入 `origin/main` 的提交。workflow 在构建前校验 tag。`--check` 默认拒绝已经使用的 tag；仅在标准 GitHub 环境变量 `GITHUB_ACTIONS=true` 且 `GITHUB_REF=refs/tags/<待检tag>` 时排除触发本次运行的 tag 自身，再与其他已有版本比较。workflow 必须保留这两个标准环境变量，不得删除或覆盖，以免把正常触发判成重复。脚本不新增用于排除 tag 的 CLI 参数。
- 所有模式都读取本地 tag 与 `git ls-remote --tags origin` 的远端 tag；远端读取失败就拒绝继续，不以本地缓存分配序号。其他命名体系的 tag 不参与日期发布排序。

脚本在仓根调用，三个接口为：

```bash
# 仅输出按北京时间计算的下一 Git tag 与镜像 tag；不创建 tag、不推送、不构建。
bash scripts/release-tag.sh --dry

# 只校验指定 tag，不修改仓库或远端；下面是格式示例，旧日期会被时序校验拒绝。
bash scripts/release-tag.sh --check v2026.10.8-r1

# 生成并创建当天的正式 Git tag；只在本地打 tag，不代替人工决定推送。
bash scripts/release-tag.sh
```

发布前同步远端 tag，并确认待发布提交与 `origin/main` 一致、工作区干净。读取脚本输出，检查 tag 指向的提交。推送正式 tag 会部署生产，必须单独获得人的确认；用 `git push origin <本次生成的tag>` 仅推该 tag，不用 `--tags` 批量推送。

本地 `--dry` 与推送 `-dry.N` tag 是两件事：前者完全不发布；后者会消耗 CI 与镜像仓资源，执行前同样需要确认。部署与回滚见 [deploy.md](deploy.md)。

## 与上游工作流的差异

只通过 fork 的仓库设置停用以下两条，保留上游文件，减少后续 merge 冲突：

| 文件 | 上游触发条件 | fork 的处理与理由 |
| --- | --- | --- |
| `docker-build.yml` | push tags `*`、`!nightly*`；另有 `workflow_dispatch` | 停用 Publish Docker image (Multi-arch)，ID `271166472`。我们的日期 tag 会命中，避免启动上游发布链。 |
| `release.yml` | push tags `*`、`!*-alpha*`；另有 `workflow_dispatch` | 停用 Release (Linux, macOS, Windows)，ID `271166474`。日期 tag 同样会命中，并非仅手动触发。 |

其余已检查的事件条件如下；这些文件不因本约定修改：

| 文件 | 事件条件与处理 |
| --- | --- |
| `docker-image-branch.yml` | 仅 `workflow_dispatch`，保持启用，不由 tag push 触发。 |
| `electron-build.yml` | push tags `*`、`!*-*`、`!*-alpha*`，另有 `workflow_dispatch`；`!*-*` 排除含 `-r1` 的日期 tag，保持启用。 |
| `ci.yml` | `pull_request` 的 opened/synchronize/closed，不响应 tag push。 |
| `sync-release-to-gitcode.yml` | 仅 `workflow_dispatch`，不响应 tag push。 |
| `docker-image-custom.yml`（旧远端 `custom` 分支遗留） | push branches `custom`，另有 `workflow_dispatch`；不响应 tag push。迁移期间保持原状，新发布链取代它，删除 `custom` 后不再使用。 |

远端可能仍显示旧基线的 `PR Check`；它不响应 tag push。远端列表与本地文件会随合入进度不同，不据此漏查本地新工作流。

每次 merge 上游之后，逐个读 `.github/workflows/*` 的 `on:`，重新判定正式日期 tag 与 `-dry.N` tag 的匹配、排除条件，尤其检查新增或改名的发布工作流。然后复核两个 ID 仍为 `disabled_manually`：

```bash
gh workflow list --repo HubWu42/new-api --all
gh api repos/HubWu42/new-api/actions/workflows/271166472 --jq .state
gh api repos/HubWu42/new-api/actions/workflows/271166474 --jq .state
```

`gh workflow list` 不加 `--all` 会隐藏停用项。复核不推试验 tag。需要修正设置时，在获得操作确认后执行：

```bash
gh workflow disable docker-build.yml --repo HubWu42/new-api
gh workflow disable release.yml --repo HubWu42/new-api
```

恢复上游工作流用 `gh workflow enable <文件名> --repo HubWu42/new-api`；恢复后我们的日期 tag 可能再次触发它们，必须先评估发布影响。
