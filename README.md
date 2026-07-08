# FluxDown Themes

Community theme marketplace for [FluxDown](https://fluxdown.zerx.dev) — the blazing fast download manager.

FluxDown 主题市场官方仓库。提交一个 PR，你的主题就会出现在 FluxDown 的「主题市场」里。

## How it works

```
themes/<theme-id>/
├── manifest.json          # 市场元数据（id / 名称 / 作者 / 版本 / 变体）
├── theme.dark.json        # 暗色变体（FluxDown 原生主题格式，可从 App 直接导出）
├── theme.light.json       # 亮色变体（至少提供一个变体）
├── screenshot-dark.png    # 与变体一一对应的截图
└── screenshot-light.png
```

- 每次 merge 后，CI 自动重新生成根目录的 [`index.json`](./index.json)。
- FluxDown App 与官网只读取 `index.json` 与各主题目录下的 raw 文件，本仓库即是「服务器」。

## Submitting a theme / 提交主题

1. 在 FluxDown 设置 → 外观 中调好你的主题并**导出 JSON**。
2. Fork 本仓库，新建 `themes/<你的主题id>/` 目录（id 规则见 [CONTRIBUTING.md](./CONTRIBUTING.md)）。
3. 放入 `manifest.json`、主题文件与截图。
4. 本地跑 `node scripts/validate.mjs`（可选，CI 也会跑）。
5. 提交 PR。CI 通过 + 人工过目后合并，主题即上架。

完整规范见 **[CONTRIBUTING.md](./CONTRIBUTING.md)**。

## Consuming (for developers)

- Theme index: `https://raw.githubusercontent.com/<owner>/fluxdown-themes/main/index.json`
- Theme files & screenshots: raw URLs listed inside `index.json` (repo-relative paths).

## License

Theme submissions are accepted under the repository license (see [LICENSE](./LICENSE)).
By submitting a theme you agree to distribute it under the same license.
