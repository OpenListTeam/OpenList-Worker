// [PLACEHOLDER] EdgeOne server-handler 检测占位 —— 真实产物由部署构建生成，勿提交构建产物！
//
// EdgeOne Pages 平台按 Git 仓库内容检测本项目是否含 Node 后端（server-handler）；
// 缺少本文件时构建日志会报「No server-handler detected, generating routes.json
// for pure project」，/api/* 会被 edgeone.json 的 rewrites 吞掉返回 index.html。
//
// 因此这里入库一个几行的小占位（永不变更、永不产生 PR 冲突），部署时
// edgeone.json -> pnpm run build -> scripts/build-edge.mjs 会在同一路径生成
// 打包全部后端代码的完整产物（~2MB）并覆盖本文件，EdgeOne 运行的是那份构建产物。
//
// 注意：本地执行 pnpm run build 后本文件会被覆盖为完整产物 —— 这属于预期行为，
// 不要把覆盖后的版本提交进来；PR 中若出现本文件的大段变更，请还原为占位内容。
export async function onRequest(context) {
  return new Response(
    "openlist: backend bundle missing (built at deploy time, this is a placeholder)",
    { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
  )
}

export default onRequest
