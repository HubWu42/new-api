#!/usr/bin/env bash
# Isolated Git fixtures exercise the CLI without touching repository tags or origin.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$root/temp-data"
fixture=$(mktemp -d "$root/temp-data/release-tag-test.XXXXXX")
trap 'rm -rf "$fixture"' EXIT
cat > "$fixture/git" <<'MOCK'
#!/usr/bin/env bash
case "$*" in
  'tag --list v*') printf '%s\n' "${TEST_LOCAL_TAGS:-}" ;;
  'ls-remote --tags origin')
    [[ ${TEST_REMOTE_FAIL:-0} == 0 ]] || exit 1
    while IFS= read -r tag; do
      [[ -z $tag ]] || printf '0123456789abcdef\trefs/tags/%s\n' "$tag"
    done <<< "${TEST_REMOTE_TAGS:-}"
    ;;
  *) printf 'Unexpected Git operation: %s\n' "$*" >&2; exit 90 ;;
esac
MOCK
chmod +x "$fixture/git"
export PATH="$fixture:$PATH"
unset GITHUB_ACTIONS GITHUB_REF
export TEST_LOCAL_TAGS='v2026.10.8-r1'
export TEST_REMOTE_TAGS='v2026.10.8-r3'
run_case() {
  local name=$1 expected=$2 reason=$3 output status=0
  shift 3
  output=$(bash "$root/scripts/release-tag.sh" "$@" 2>&1) || status=$?
  printf '%s | expected=%s actual=%s | %s\n' "$name" "$expected" "$status" "$output"
  [[ $status == "$expected" && $output == *"$reason"* ]] || exit 1
}
run_case 'invalid shape' 1 'Invalid tag' --check '2026.10.8-r4'
run_case 'revision zero' 1 'Invalid tag' --check 'v2026.10.8-r0'
run_case 'revision overflow' 1 'Invalid tag' --check 'v2026.10.8-r1000'
run_case 'used revision (remote)' 1 'Tag already used' --check 'v2026.10.8-r3'
run_case 'older date' 1 'earlier than' --check 'v2026.10.7-r4'
run_case 'dry tag' 0 'Valid tag' --check 'v2026.10.8-r1-dry.2'
run_case 'same-day gap' 1 'must increase' --check 'v2026.10.8-r2'
run_case 'invalid calendar date' 1 'Invalid tag' --check 'v2026.2.29-r1'
run_case 'leading zero' 1 'Invalid tag' --check 'v2026.10.08-r4'
run_case 'numeric month ordering' 0 'Valid tag' --check 'v2026.11.1-r1'
export TEST_REMOTE_TAGS=$'v2026.10.8-r3\nv2026.10.8-r1-dry.2\nv2099.1.1-r1-dry.1'
run_case 'repeated dry tag' 1 'Tag already used' --check 'v2026.10.8-r1-dry.2'
run_case 'future dry ignored' 0 'Valid tag' --check 'v2026.10.8-r4'
export GITHUB_ACTIONS=true GITHUB_REF=refs/tags/v2026.10.8-r3
run_case 'workflow current tag excluded' 0 'Valid tag' --check 'v2026.10.8-r3'
export GITHUB_REF=refs/tags/v2026.10.8-r4
run_case 'workflow other tag not excluded' 1 'Tag already used' --check 'v2026.10.8-r3'
unset GITHUB_ACTIONS GITHUB_REF
export TEST_REMOTE_FAIL=1
run_case 'remote failure closed' 1 'Cannot read origin' --check 'v2026.10.8-r4'
unset TEST_REMOTE_FAIL
now=$(TZ=Asia/Shanghai date +'%Y.%-m.%-d')
export TEST_LOCAL_TAGS="v$now-r2" TEST_REMOTE_TAGS="v$now-r9"
run_case 'dry allocation from remote maximum' 0 "Git tag: v$now-r10" --dry
export TEST_REMOTE_TAGS="v$now-r999"
run_case 'daily exhaustion' 1 'exhausted' --dry
printf 'All 17 cases passed.\n'
