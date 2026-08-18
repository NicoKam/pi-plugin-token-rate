# pi-plugin-token-rate

[English](./README.md) | 简体中文

一个 Oh My Pi / OMP 扩展，用于在 AI 回答流式输出时展示实时输出速度。

![Token rate indicator demo](./assets/demo.svg)

## 功能

- 每 500ms 刷新一次输出速率。
- 流式输出中显示 `🚀`，结束后显示 `✅`。
- 根据 tok/s 使用红 → 黄 → 绿的 truecolor 渐变色。
- 指标展示在输入框上方，并和对话内容之间保留一行空白。
- 使用支持 CJK 修正的 chars-per-token 启发式算法，从流式 delta 中估算输出 token 数。

## Token 统计准确性

本插件展示的是实时输出 token 的估算值，因为大多数 provider 只会在流式响应结束后返回权威 usage。

当前估算规则：

- Latin 文本：`4.0 chars/token`
- CJK 文本：`1.4 chars/token`
- 空白字符不计入有效字符
- 中英混合文本按 CJK 字符占比加权

展示的 tok/s 适合用作实时体验反馈，不适合作为计费级精确统计。

## 安装

### 方式 1：单次加载

在任意目录执行：

```bash
omp --extension /path/to/pi-plugin-token-rate
```

### 方式 2：持久配置

把插件路径加入 `~/.omp/agent/config.yml`：

```yaml
extensions:
  - /path/to/pi-plugin-token-rate
```

如果已经存在 `extensions`，追加插件路径，不要覆盖原有列表：

```yaml
extensions:
  - /existing/extension
  - /path/to/pi-plugin-token-rate
```

修改配置后重启 `omp`。

### 方式 3：自动发现

复制插件到 OMP 用户扩展目录：

```bash
mkdir -p ~/.omp/agent/extensions
cp -R /path/to/pi-plugin-token-rate ~/.omp/agent/extensions/
```

然后重启 `omp`。

## 开发

OMP 会通过 Bun 直接加载 TypeScript 扩展入口。日常使用不需要构建步骤。

语法 smoke check：

```bash
bun build --no-bundle index.ts --outfile /dev/null
```

使用本地插件启动：

```bash
omp --extension .
```
