# douyin-local

类抖音风格的本地视频网页播放器。支持滑动切换、收藏管理、Artplayer 播放器交互。

## 功能

- 上下滑动切换视频（触屏 + 鼠标滚轮）
- 单击/双击暂停，拖拽进度条，手势控制
- 顺序播放 / 随机播放
- 爱心收藏，支持导出/导入 JSON
- 视频目录可配置
- 3 元素实例池，手机端内存友好
- Docker 一键部署

## 快速开始

### 开发模式

```bash
npm install

# 终端 1 - 启动后端
npm run server

# 终端 2 - 启动前端（自动代理 API）
npm run dev
```

### 生产模式

```bash
npm run build
npm run server
```

访问 http://localhost:7077

### Docker

```bash
# 指定视频目录
VIDEO_DIR=/your/video/path docker compose up -d

# 或默认读取 ./videos
docker compose up -d
```

## 配置视频目录

1. 打开页面，点击左上角齿轮按钮
2. 在「视频目录」输入服务器/容器上的视频文件夹路径
3. 点击「应用」

默认路径：`./videos`（开发模式）或 `/videos`（Docker 容器内）。

支持格式：mp4、webm、mov、mkv、avi、m4v

## 技术栈

| 项目 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite |
| 播放器 | Artplayer |
| 后端 | Express |
| 部署 | Docker |

## 项目结构

```
├── server/index.js            # Express 后端
├── src/
│   ├── App.vue
│   ├── main.js
│   ├── components/
│   │   ├── VideoCard.vue      # Artplayer + 收藏按钮
│   │   ├── VideoFeed.vue      # 全屏滑动容器
│   │   ├── FavoriteBtn.vue    # 爱心按钮
│   │   └── SettingsPanel.vue  # 设置面板
│   ├── composables/
│   │   ├── useSettings.js
│   │   ├── useVideoList.js
│   │   └── useFavorites.js
│   └── styles/main.css
├── Dockerfile
├── docker-compose.yml
└── vite.config.js
```
