# LinkSail 镜像部署

本文件只记录我们在 Docker Hub 与 Coolify 上的发布约定；上游通用安装说明不在这里重复。

## 发布目标

| 项目 | 固定值 |
| --- | --- |
| Docker Hub 镜像仓库 | `hubwu42/new-api` |
| 架构 | `linux/amd64`、`linux/arm64` |
| Coolify 地址 | `https://coolify.gosail.tech` |
| 应用 | `linksail` |
| 应用 UUID | `2icvmiuyd8fgfush304xwqkx`（Docker Image 型 application） |
| Coolify context / project / environment | `gosail` / `platform` / `production` |
| 发布脚本 | `scripts/release-tag.sh` |
| 发布 workflow | `.github/workflows/release-image.yml` |

实现按本文件来，改了名字要同步改这里。脚本与 workflow 已按本文件实现并跑通，2026-10-08 起线上镜像由这条链产出（首版 `2026.10.8-r2`）。

## 发布顺序与凭据

推送 [git.md](git.md) 约定的日期 tag 后，workflow 按顺序运行：校验 tag → 构建两个架构 → 推送 Docker Hub（日期 tag 与 `latest` 两个）→ 触发 Coolify 部署。镜像尚未推送成功时，不更新 Coolify。

例如 Git tag `v2026.10.8-r1` 对应 `hubwu42/new-api:2026.10.8-r1`，同一次构建另刷一个 `latest` 指针，**只作人肉拉取用**。生产跟的不是它：部署时把 `docker_registry_image_tag` 钉到本次那个不可变的日期 tag（见下面〈部署〉一节），所以线上跑的是哪一版一眼可查，回滚也只是把钉住的 tag 换成上一版（见〈回滚〉）。正式 tag 推送前要由人确认，因为它会触发生产部署。

`v2026.10.8-r1-dry.1` 对应 `hubwu42/new-api:2026.10.8-r1-dry.1`；干跑会构建、推送镜像，但必须跳过全部 Coolify 写操作。本地 `bash scripts/release-tag.sh --dry` 仅预览版本，不触发这条远端流程。

- 版本内嵌：构建 job 先把本次发布标识写进仓库根的 `VERSION`（Go 的 `-X common.Version` 与前端 `VITE_REACT_APP_VERSION` 都读它），manifest job 再在镜像里搜一遍该标识——搜不到就整条失败，这一版不许进正式发布。所以 `/api/status` 的 `version` 应当等于发布标识（去掉前导 `v`）。

仓库 secrets `COOLIFY_TOKEN` 与 `COOLIFY_APP_UUID` 提供部署凭据及目标；`COOLIFY_APP_UUID` 应配置为上表 UUID。缺任一项，跳过部署并明确写入工作流日志或 summary，镜像发布仍可成功。因此绿色 workflow 不代表已经上线；部署步骤若实际执行后出错，应报告失败，不能当作缺凭据跳过。Docker Hub 的推送凭据通过 Actions secrets 提供，令牌不写入仓库或日志。

## 部署（linksail 是 Docker Image 型 application）

linksail 在 Coolify 里是 **Docker Image 型 application**（2026-10-08 从 compose 型 service 迁过来）。这类资源有 `docker_registry_image_tag` 字段，钉住版本之后 `POST /deploy` 会**真的去仓库拉取**那次构建。

```bash
set -euo pipefail
export COOLIFY_URL='https://coolify.gosail.tech'
export COOLIFY_APP_UUID='2icvmiuyd8fgfush304xwqkx'
export IMAGE_TAG='2026.10.8-r1'
: "${COOLIFY_TOKEN:?请先安全注入 COOLIFY_TOKEN}"

# 1) 钉住本次发布
curl --fail --silent --show-error -X PATCH \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" -H 'Content-Type: application/json' -H 'Accept: application/json' \
  "${COOLIFY_URL}/api/v1/applications/${COOLIFY_APP_UUID}" \
  --data "{\"docker_registry_image_tag\":\"${IMAGE_TAG}\"}"

# 2) 触发部署（只收 POST，GET 返 405）
curl --fail --silent --show-error -X POST \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" -H 'Accept: application/json' \
  "${COOLIFY_URL}/api/v1/deploy?uuid=${COOLIFY_APP_UUID}&force=false"
```

部署请求被接受不等于新容器已经健康：跟踪 Coolify 返回的部署记录，确认应用跑的镜像 digest 就是本次构建，并检查 `/api/status` 返回的版本等于发布标识。不要把接口返回成功当作上线完成。

### 换资源/换域名时的三步（2026-10-08 踩过，中断了 4–5 分钟）

把正式域名从一个 Coolify 资源搬到另一个（service → application 这种）时，下面三步必须连成一个动作，中间任何一步都不是「可停一会儿」的状态：

1. **停旧资源**：路由随之撤销，中断从这一刻开始。
2. **抢域名**：`PATCH` 新资源的 `domains` 会报 409 `Domain conflicts`——旧资源在 Coolify 里仍登记着这个域名，必须带 `force_domain_override: true` 才能拿过来。
3. **重建新容器**：只改 `domains` 不会重生成 Traefik 标签，必须再对应用做一次 restart/部署，路由才会认这个域名。

先确认目标资源已经能正常服务，再动第 1 步；否则中断时间就是第 1 步到第 3 步的全部时长。

## 回滚

发布前记录当前成功运行的镜像 tag 与 digest，确认旧镜像仍可拉取。tag 不覆盖、不删除已发布镜像，回滚不重新构建旧代码。

需要回滚时，由人确认目标版本：把示例里的 `IMAGE_TAG` 换成上一版已经验证过的镜像 tag（例如从 `2026.10.8-r1` 退回 `custom-20260730-b09e8f1`），重复上面的 PATCH + POST；等待部署完成并检查 `/api/status` 与服务健康。回滚是显式运维操作，允许部署旧镜像，无需推送倒序日期 tag。

从旧 `custom` 发布链迁移前，必须保留当时线上镜像的 digest。若旧镜像没有可靠的固定 tag，先根据该 digest 保全一个可拉取的固定回滚版本，再进行切换；不能把可变 tag 当前指向的镜像当作原版本。删除 `custom` 分支不影响已经保留的镜像回滚能力。
