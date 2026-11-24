# 迟迟 CHICHI · 个人主站

[访问主站](https://dh666i.github.io/) · [山水版作品集](https://dh666i.github.io/v2/) · [浏览公开项目](https://dh666i.github.io/#projects) · [使用迟迟 API](https://chichiapi.cn/)

这是迟迟的个人网站源码。主站收录我开发和维护的 AI 工具、媒体应用与桌面项目。首个展示产品是**迟迟 API**，为应用和客户端提供 GPT、Claude、Gemini 与 Grok 等模型的接入入口。[产品使用教程](https://docs.qq.com/aio/DRkVRSVJIV1B6ZXJq)

## 公开项目

| 项目 | 用途 | 相关入口 |
| --- | --- | --- |
| [ImageBot](https://github.com/dh666i/imageBot) | Windows 图片生成与参考图编辑工具，默认接入迟迟 API | [下载](https://github.com/dh666i/imageBot/releases/latest) |
| [Dyfire](https://github.com/dh666i/dyfire) | 管理抖音好友续火任务、定时执行和历史记录 | [官网](https://dyfire.cn/) |
| [AIcoversong](https://github.com/dh666i/AIcoversong) | 在 Windows 本机完成录音、音色训练、歌曲转换与混音 | [安装指南](https://github.com/dh666i/AIcoversong/blob/main/docs/INSTALL.md) |
| [Mineradio](https://github.com/dh666i/Mineradio) | 带天气电台、歌词舞台与粒子视觉的 Electron 音乐播放器 | [原作 · XxHuberrr](https://github.com/XxHuberrr/Mineradio) |
| [岛仔 Daozai](https://github.com/dh666i/daozai) | Windows 桌面信息岛，支持录屏、截图 OCR、音乐与日程 | [下载](https://github.com/dh666i/daozai/releases/latest) |
| [个人主站](https://github.com/dh666i/dh666i.github.io) | WebGL 流体、书法排版与原生浏览器交互 | [在线浏览](https://dh666i.github.io/) |

各项目的安装要求、发布版本及许可证见对应仓库。项目问题请在对应仓库反馈，主站的展示或链接问题可提交至[本站 Issues](https://github.com/dh666i/dh666i.github.io/issues)。

## 本地预览

在仓库根目录启动静态服务器：

```sh
python -m http.server 8000 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8000/>。站点采用原生 HTML、CSS 和 JavaScript，无需安装前端依赖。宽屏下的产品横卷在窄屏自动切换为纵向排列，并支持系统的减少动态效果设置。

## 内容维护与发布

- [index.html](index.html) 包含产品入口、项目卡片和搜索及分享摘要。目录以静态 HTML 呈现，离线或 GitHub API 限流时也可阅读。
- [styles.css](styles.css) 定义排版、断点和动效。[script.js](script.js) 负责 WebGL 流体、卷轴和菜单交互。
- 新增或更名公开仓库时，请同时更新首页 `#projects` 区块和上表，核对上游署名、下载及文档链接。
- GitHub Pages 从 `main` 分支的根目录发布。[.nojekyll](.nojekyll) 让 Pages 直接托管静态文件。

复制图标来自 Lucide，详见[图标许可证](assets/lucide-LICENSE)。
