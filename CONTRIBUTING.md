# 主题提交规范 / Theme Submission Guide

## 目录结构

每个主题占一个目录：`themes/<theme-id>/`。**一个 PR 只允许改动一个主题目录**（CI 强制）。

| 文件 | 必需 | 说明 |
|---|---|---|
| `manifest.json` | ✅ | 市场元数据，见下 |
| `theme.dark.json` / `theme.light.json` | 至少一个 | FluxDown 原生主题格式（App 导出即得） |
| `screenshot-dark.png` / `screenshot-light.png` | 与变体一一对应 | 截图规范见下 |
| `README.md` | 可选 | 主题介绍 |

## theme-id 规则

- kebab-case：小写字母、数字、连字符，`^[a-z0-9]+(-[a-z0-9]+)*$`
- 3–40 字符，全仓库唯一（CI 校验）
- 不得使用保留名：`default`、`default-dark`、`default-light`、`midnight-blue`、`nord`、`warm-light`（内置主题）

## manifest.json

```json
{
  "manifestVersion": 1,
  "id": "ocean-breeze",
  "name": "Ocean Breeze",
  "author": "your-github-username",
  "version": "1.0.0",
  "description": "A calm deep-sea palette.",
  "tags": ["dark", "blue", "minimal"],
  "variants": {
    "dark": "theme.dark.json",
    "light": "theme.light.json"
  }
}
```

- `id` 必须与目录名一致
- `version` 为 semver（`x.y.z`），更新主题时递增
- `author` 建议填 GitHub 用户名（市场页会链接到你的主页）
- `tags` 可选，0–8 个，每个 ≤ 20 字符
- `variants` 至少一个键（`dark` / `light`），值为目录内的主题文件名

## 主题文件（theme.*.json）

即 FluxDown 的导出格式（`schemaVersion: 2`）。要点：

- `appearance` 必须与变体键一致（`theme.dark.json` 内 `"appearance": "dark"`）
- 颜色为 hex 字符串：`aarrggbb` / `rrggbb`（可带 `#`）
- 缺失的颜色项 App 端会回退到对应明暗度的默认值，但**建议填全** `colors` 下所有分组
- `metrics`（圆角/间距等）可选
- `segmentPalette` 可选，最多 32 色

最小示例见 [`themes/ocean-breeze/`](./themes/ocean-breeze/)。

## 截图规范

- **PNG** 格式，文件名固定 `screenshot-dark.png` / `screenshot-light.png`
- **横向窗口比例**：宽高比 1.5–1.85（16:10 / 16:9 均可，如 1280×800、1920×1080），宽度 1200–4000px
- 单张 **≤ 500 KB**（建议用 [squoosh](https://squoosh.app) 压缩）
- 内容：FluxDown 主界面（三栏布局，含若干下载任务）
- **禁止**出现个人信息（真实文件名、URL、用户名等）——建议下载几个 Linux ISO 作为演示任务

## 提交流程

1. Fork → 新建 `themes/<id>/` → 填入文件
2. 本地校验（可选）：`node scripts/validate.mjs`
3. 提交 PR，按模板填写
4. CI 自动校验：manifest 格式、id 唯一性、主题文件格式、截图尺寸/大小、PR 改动范围
5. 维护者过目截图内容后合并，CI 自动更新 `index.json` 上架

## 更新已有主题

修改自己的主题目录并递增 `manifest.json` 的 `version` 即可。他人主题的修改 PR 需原作者确认或维护者裁定。
