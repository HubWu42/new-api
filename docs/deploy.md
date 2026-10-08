# LinkSail 镜像部署

本文件只记录我们在 Docker Hub 与 Coolify 上的发布约定；上游通用安装说明不在这里重复。

## 发布目标

| 项目 | 固定值 |
| --- | --- |
| Docker Hub 镜像仓库 | `hubwu42/new-api` |
| 架构 | `linux/amd64`、`linux/arm64` |
| Coolify 地址 | `https://coolify.gosail.tech` |
| 应用 | `linksail` |
| 应用 UUID | `nxaaajntzlycy98lwxrgcygx` |
| Coolify context / project / environment | `gosail` / `platform` / `production` |
| 发布脚本 | `scripts/release-tag.sh` |
| 发布 workflow | `.github/workflows/release-image.yml` |

实现按本文件来，改了名字要同步改这里。这份文档先定义发布接口，脚本与 workflow 按约定实现后再执行发布。

## 发布顺序与凭据

推送 [git.md](git.md) 约定的日期 tag 后，workflow 按顺序运行：校验 tag 及其 `main` 来源 → 构建两个架构 → 推送 Docker Hub → 钉镜像 tag → 触发 Coolify 部署。镜像尚未推送成功时，不更新 Coolify。

例如 Git tag `v2026.10.8-r1` 对应 `hubwu42/new-api:2026.10.8-r1`。生产固定到具体 tag，不用 `latest` 作为部署依据。正式 tag 推送前要由人确认，因为它会触发生产部署。

`v2026.10.8-r1-dry.1` 对应 `hubwu42/new-api:2026.10.8-r1-dry.1`；干跑会构建、推送镜像，但必须跳过全部 Coolify 写操作。本地 `bash scripts/release-tag.sh --dry` 仅预览版本，不触发这条远端流程。

仓库 secrets `COOLIFY_TOKEN` 与 `COOLIFY_APP_UUID` 提供部署凭据及目标；`COOLIFY_APP_UUID` 应配置为上表 UUID。缺任一项，跳过部署并明确写入工作流日志或 summary，镜像发布仍可成功。因此绿色 workflow 不代表已经上线；部署步骤若实际执行后出错，应报告失败，不能当作缺凭据跳过。Docker Hub 的推送凭据通过 Actions secrets 提供，令牌不写入仓库或日志。

## 钉 tag 与触发部署

以下 Bash 示例是线上写操作，只在获得部署确认后执行。`IMAGE_TAG` 换成本次已经推送成功的镜像 tag，不带 `v`。通过安全环境注入 `COOLIFY_TOKEN`，不要把令牌直接写进命令历史。

```bash
set -euo pipefail
export COOLIFY_URL='https://coolify.gosail.tech'
export COOLIFY_APP_UUID='nxaaajntzlycy98lwxrgcygx'
export IMAGE_TAG='2026.10.8-r1'
: "${COOLIFY_TOKEN:?请先安全注入 COOLIFY_TOKEN}"

# 先固定应用要拉取的镜像版本。
curl --fail --silent --show-error -X PATCH \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  "${COOLIFY_URL}/api/v1/applications/${COOLIFY_APP_UUID}" \
  --data "{\"docker_registry_image_tag\":\"${IMAGE_TAG}\"}"

# PATCH 成功后再请求部署；此接口使用 POST。
curl --fail --silent --show-error -X POST \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  "${COOLIFY_URL}/api/v1/deploy?uuid=${COOLIFY_APP_UUID}&force=false"
```

两条调用只操作 linksail。部署请求被接受不等于新容器已经健康：跟踪 Coolify 返回的部署记录，确认应用运行的是目标镜像，并检查 linksail 的 `/api/status` 返回版本与本次发布标识一致。不要把接口返回成功当作上线完成。

调用方式参考 `GoSail/projects/agent-platform/.github/workflows/release.yml` 的 deploy job；这里只更新 new-api 的镜像 tag，不复制该项目的其他环境变量操作。

## 回滚

发布前记录当前成功运行的镜像 tag 与 digest，确认旧镜像仍可拉取。tag 不覆盖、不删除已发布镜像，回滚不重新构建旧代码。

需要回滚时，由人确认目标版本，把上面示例的 `IMAGE_TAG` 改成上一版已经验证的镜像 tag，重新执行 PATCH，再执行 POST 部署；等待部署完成并检查 `/api/status` 与服务健康。回滚是显式运维操作，允许部署旧镜像，无需推送倒序日期 tag。

从旧 `custom` 发布链迁移前，必须保留当时线上镜像的 digest。若旧镜像没有可靠的固定 tag，先根据该 digest 保全一个可拉取的固定回滚版本，再进行切换；不能把可变 tag 当前指向的镜像当作原版本。删除 `custom` 分支不影响已经保留的镜像回滚能力。
