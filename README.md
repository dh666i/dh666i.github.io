# CHICHI Personal Site

一个零依赖、可直接部署到 GitHub Pages 的个人站。当前版本包含：

- 响应式首页、作品、能力、记录、联系区块
- SEO / Open Graph / Twitter Card 基础元信息
- 可访问性跳转链接、移动端菜单、滚动进度、进入动画
- 纯静态 HTML、CSS、JavaScript，无需构建步骤
- GitHub Actions 自动部署到 GitHub Pages

## 本地预览

在当前目录运行任意静态服务器，例如：

```powershell
python -m http.server 4173
```

然后访问：

```text
http://localhost:4173
```

## 修改个人信息

主要内容在这些文件中：

- `index.html`：页面文案、SEO 信息、作品和记录内容
- `styles.css`：视觉风格、布局、响应式样式
- `script.js`：站点名、GitHub 链接和交互逻辑

`script.js` 顶部的个人信息：

```js
const profile = {
    siteName: 'CHICHI',
    github: 'https://github.com/dh666i',
    githubLabel: '@dh666i'
};
```

## 部署到 GitHub Pages

当前目标仓库：

```text
https://github.com/dh666i/dh666i.github.io
```

发布地址：

```text
https://dh666i.github.io/
```

推送到 `main` 分支后，GitHub Actions 会自动发布。
