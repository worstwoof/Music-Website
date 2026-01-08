<div align="center">
  <img src="https://img.shields.io/badge/Space-Music-423B63?style=for-the-badge&logo=applemusic&logoColor=white&labelColor=1B305D" alt="Space Music Logo" />
  
  <h1 style="font-family: 'Orbitron', sans-serif;">🌌 星乐 Space Music </h1>
  
  <p>
    <strong>基于 Web Audio API 与 CSS3D 的沉浸式视听音乐空间</strong>
  </p >

  <p>
    <!-- 核心技术 -->
    <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" />
    <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" />
    <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
    <img src="https://img.shields.io/badge/Node.js-Build_Script-339933?style=flat-square&logo=node.js&logoColor=white" />
    <br/>
    <!-- 视觉与动画 -->
    <img src="https://img.shields.io/badge/Three.js-Vanta_Background-000000?style=flat-square&logo=three.js&logoColor=white" />
    <img src="https://img.shields.io/badge/GSAP-Animations-88CE02?style=flat-square&logo=greensock&logoColor=white" />
    <img src="https://img.shields.io/badge/Swiper-3D_Flow-6332F6?style=flat-square&logo=swiper&logoColor=white" />
    <!-- 核心API -->
    <img src="https://img.shields.io/badge/Web_Audio_API-Visualizer-FF69B4?style=flat-square&logo=shazam&logoColor=white" />
    <img src="https://img.shields.io/badge/View_Transitions_API-SPA-4285F4?style=flat-square" />
  </p >
</div>

---
# 🎵 星乐 (Space Music) - 沉浸式音乐世界

欢迎来到“星乐”，一个功能丰富、视觉效果惊艳的现代音乐 Web 应用程序。

本项目是一个完整的、从引导到播放的沉浸式音乐体验。它由三个核心部分组成：

1.  **开始界面 (`start.html`)**: 一个采用全屏滚动和丰富动画（流星、蝴蝶、开花）的产品引导页。
2.  **功能主页 (`index.html`)**: 一个集成了 WebGL、GSAP 动画和 View Transitions API 的现代化音乐发现主页。
3.  **音乐播放器 ( `music-player.html`)**: 一个功能齐全的用户中心和具有音视频(MV)双核同步功能的沉浸式播放器。

---
# 👥 开发团队 (Development Team)
组长: 张渠美 (音乐中心功能、页面设计、报告撰写)
成员:
* 黄子豪 (播放界面功能、页面设计、界面整合)
* 张天译 (首页功能、页面设计、演示视频录制)
* 文 旺 (首页功能、页面设计、后期润色)
* 宁 娟 (引导页动画设计、Logo设计、报告撰写

---
## 🌟 项目一览 (Project Showcase)

| 引导页 (Start Page) | 引导页 - 功能介绍 |
| :---: | :---: |
| ![引导页](./img/屏幕截图%202026-01-08%20214946.png) | ![引导页功能1](./img/屏幕截图%202026-01-08%20214959.png) |
| ![引导页功能2](./img/屏幕截图%202026-01-08%20215013.png) | ![引导页功能3](./img/屏幕截图%202026-01-08%20215027.png) |

| 主页 (暗色) | 主页 (亮色) |
| :---: | :---: |
| ![主页导航栏](./img/屏幕截图%202026-01-08%20213159.png) | ![主页导航栏](./img/屏幕截图%202026-01-08%20213300.png) |
| ![主页内容区](./img/屏幕截图%202026-01-08%20213221.png) | ![主页内容区](./img/屏幕截图%202026-01-08%20213321.png) |
| ![主页内容区](./img/屏幕截图%202026-01-08%20213231.png) | ![主页内容区](./img/屏幕截图%202026-01-08%20205650.png) |

| 我的音乐 (暗色) | 我的音乐 (亮色) |
| :---: | :---: |
| ![最近播放](./img/屏幕截图%202026-01-08%20213547.png) | ![最近播放](./img/屏幕截图%202026-01-08%20213506.png) |
| ![本地音乐](./img/屏幕截图%202026-01-08%20213558.png) | ![本地音乐](./img/屏幕截图%202026-01-08%20213519.png) |

| 沉浸式播放器 (Player) | 播放器 - MV 模式 |
| :---: | :---: |
| ![播放器-音频模式](./img/屏幕截图%202026-01-08%20213647.png) | ![播放器-MV模式](./img/屏幕截图%202026-01-08%20213734.png) |
| ![播放器-音频模式](./img/屏幕截图%202026-01-08%20213710.png) | ![播放器-MV模式](./img/屏幕截图%202026-01-08%20213828.png) |

---

## ✨ 核心功能与特点

本项目的开发重点在于将高级视觉特效与健壮的播放器功能相结合，创造出色的用户体验。

### 1. 视觉与沉浸感 (Visuals & Immersion)

* **多层动态背景**:
    * **WebGL 动态海浪**: 主页背景采用 **Vanta.js (Three.js)** 驱动的 WebGL 海浪，实现了 GPU 加速的 3D 动态效果。
    * **CSS 动画特效**: 全站（包括引导页）大量使用纯 CSS 实现了流星雨、飘落星星、蝴蝶飞舞、花朵绽放等动画。
    * **JS 交互式粒子**: 主页和音乐中心实现了跟随鼠标飘落的雪花粒子特效，提供即时趣味性交互。
* **现代毛玻璃质感 (Glassmorphism)**:
    * 整个 UI（导航栏、侧边栏、主内容区、登录弹窗）均采用现代的 `backdrop-filter: blur()` 毛玻璃模糊特效，质感通透。
* **双重主题系统**:
    * **明暗双模 (Homepage / MyMusic)**: 主页和音乐中心支持一键切换明亮/暗黑两种模式，主题设置会保存在 `localStorage` 中。
    * **动态氛围 (Player)**: 沉浸式播放器会使用 **ColorThief.js** 自动分析当前歌曲封面，提取主题色，并将其动态应用到背景氛围光和黑胶光晕上。

### 2. 交互体验 (UX & Animations)

* **原生级页面过渡**:
    * 采用实验性的 **View Transition API** (`document.startViewTransition`)。 当在主页点击卡片时，封面和标题会实现丝滑的“共享元素”过渡动画，提供媲美原生 App 的无缝跳转体验。
* **专业动画库应用**:
    * **GSAP 无限滚动**: 主页的“猜你喜欢”模块采用 **GSAP** 动画库来实现无限循环的 Marquee (跑马灯) 效果，并实现了“鼠标悬停时减速”的细节。
    * **Swiper 3D 封面流**: 主页的“推荐 MV”模块使用了 **Swiper.js** 库，实现了经典的 3D Coverflow (封面流) 效果，支持触摸滑动。
* **丰富的微交互**:
    * **3D 倾斜卡片**: 主页卡片会根据鼠标位置产生 3D 倾斜效果。
    * **导航栏“药丸”滑动**: 顶部导航栏的激活项会有一个“药丸”背景（Nav Pill）平滑移动过去，提供了清晰的视觉焦点。
    * **可拖动侧边栏**: 主页的锚点导航栏支持用户自由拖拽。
    * **按钮波纹**: 播放器中的所有按钮（包括播放列表）在点击时均有 Material Design 风格的波纹反馈。
    * **引导页全屏滚动**: `start.html` 支持鼠标滚轮和点击导航点进行全屏平滑滚动。

### 3. 播放器核心 (Player Core)

* **🎬 音视频(MV)双核播放系统 (重点功能)**:
    * **音频模式**: 默认播放高解析度音频，并展示动态旋转的黑胶唱片。
    * **MV 模式**: 一键切换。播放器会自动暂停音频，转而播放高清 MV 并使用其音轨。 所有控件（进度条、音量、时长）都会自动与视频同步。
* **🎤 3D 齿轮歌词滚动**:
    * 自动解析 `.lrc` 歌词文件，以 3D 齿轮状滚动，当前行高亮。
    * 支持点击任意一行歌词跳转到歌曲对应进度。
* **🎧 实时音频可视化**:
    * （在音频模式下）播放器控制栏的频谱条会通过 **Web Audio API** 实时分析音乐节拍并跳动。
* **▶️ 播放列表“活力”图标**:
    * 在播放列表弹窗中，正在播放的歌曲会显示一个动态的声波动画图标，取代了静态高亮。

### 4. 用户中心与管理 (User & Management)

* **👤 “我的音乐”中心**:
    * 一个功能完整的用户中心页面 (`mymusic.html`)，包含可自定义的个人资料侧边栏。
    * 使用 JavaScript 驱动的标签页，用于切换**“我的收藏”、“最近播放”、“本地音乐”** 和 “编辑资料”。
* **💾 持久化体验 (localStorage)**:
    * **记住音量**: 用户调节的音量大小会被自动保存。
    * **记住收藏**: 用户的“喜欢”列表会保存在本地。
    * **记住播放列表顺序**: 下文提到的拖拽排序结果也会被保存。
* **🖐️ 播放列表拖拽排序**:
    * 用户可以在播放列表弹窗中通过 **Drag and Drop API** 随意拖拽歌曲，以调整播放顺序。 `上一首/下一首` 按钮会严格遵循用户自定义的新顺序。

---
## ⚡ 性能优化策略 (Optimization)
为了确保在富动画环境下的流畅体验，我们实施了以下优化：

* **渲染性能:**
对高频动画元素（如蝴蝶、流星）使用 will-change: transform 启用 GPU 硬件加速。
使用 backface-visibility: hidden 修复 3D 旋转时的闪烁问题。
CSS 属性使用 contain: layout style paint 减少重绘区域。
* **资源管理:**
按需生成: 粒子特效仅在当前可见的 Slide 中生成，离开页面自动销毁 DOM 节点，防止内存泄漏。
* **事件节流:**
滚动监听 (wheel) 使用 { passive: true } 提升滚动性能。
对高频触发事件（如可视化数据传输）进行防抖处理，降低 postMessage 通信频率。
---

## 🛠️ 技术栈 (Technology Stack)

* **前端**: HTML5, CSS3 (Flexbox, Grid, Animations, CSS 变量)
* **JavaScript (ES6+)**:
    * **原生 JS (Vanilla JS)**: 项目主体逻辑均由原生 JS 编写，无框架依赖。
    * **核心 API**:
        * Web Audio API (用于频谱)
        * Drag and Drop API (用于拖拽排序)
        * localStorage (用于持久化)
        * View Transition API (用于页面过渡)
        * IntersectionObserver (用于滚动监听)
    * **动画库**:
        * **GSAP (GreenSock)**: 用于高性能的无限滚动动画。
        * **Three.js (Vanta.js)**: 用于主页的 WebGL 3D 海浪背景。
        * **Swiper.js**: 用于 3D 封面流轮播。
    * **工具库**:
        * **ColorThief.js**: 用于从歌曲封面提取主题色。
* **构建脚本 (Build Script)**:
    * **Node.js**: 使用 `fs` 和 `path` 模块扫描文件系统，自动生成歌曲列表。
* **字体与图标**:
    * Font Awesome
    * Google Fonts

---
## 🚀 快速启动 (How to Run)

由于本项目使用了 `Web Audio API` (音频分析) 和 `fetch API` (加载配置)，受浏览器安全策略限制，**无法直接双击 HTML 文件运行**。请按照以下步骤启动：

### 1. 环境准备
确保你的电脑已安装 [Node.js](https://nodejs.org/) (用于生成播放列表) 和 [VS Code](https://code.visualstudio.com/)。

### 2. 生成播放列表 (首次运行必需)
打开项目根目录的终端，运行构建脚本，这将扫描本地音乐并生成 `playlist.json`：
```bash
node build-playlist.js
```
> *看到 "✅ 成功生成 playlist.json！" 即表示成功。*

### 3. 启动服务器
推荐使用 VS Code 的 **Live Server** 插件：
1.  在 VS Code 中安装插件：`Live Server`。
2.  鼠标右键点击 `start.html` (引导页) 或 `index.html` (主页)。
3.  选择 **"Open with Live Server"**。
4.  浏览器将自动打开，尽情享受音乐吧！🎵

---

## 📂 如何上传音乐与 MV (Upload Guide)

本项目采用**"文件即数据"**的自动化管理方式。你不需要写代码，只需按规则放入文件即可。

### 1. 创建文件夹
在 `songs/` 目录下，为你想要的每一首歌创建一个**单独的文件夹**（文件夹名最好是英文或拼音，如 `songs/paomo/`）。

### 2. 放入资源文件
将你的音频、图片、MV 放入刚才创建的文件夹中：
*   🎵 **音频文件** (必需): 支持 `.mp3`, `.flac`。
*   🖼️ **封面图片** (必需): 推荐命名为 `cover.jpg`。
*   🎬 **MV 视频** (可选): 推荐命名为 `video.mp4`。
*   📝 **歌词文件** (可选): 推荐命名为 `lyrics.lrc`。

### 3. 配置 info.json (关键)
在文件夹内新建一个 `info.json` 文件，填入以下内容（确保文件名完全匹配）：

```json
{
  "title": "歌曲标题",
  "artist": "歌手名字",
  "album": "专辑名称",
  "audio": "你的音频文件名.mp3", 
  "cover": "cover.jpg",
  "mv": "video.mp4" 
}
```
> *注意：如果这首歌没有 MV，请直接删除 `"mv"` 这一行。*

### 4. 刷新列表
每当你添加或删除了歌曲后，都需要**重新执行一次步骤 2 中的命令**来更新播放列表：
```bash
node build-playlist.js
```
刷新浏览器，你的新歌就会出现在列表中了！✨


### 第五步：检查结果


脚本会自动扫描 songs/ 目录下的所有子文件夹，读取它们的 info.json，然后生成（或更新）一个 playlist.json 文件。

您每次添加或删除歌曲文件夹时，都需要重复第四步来刷新列表。

```
📁 文件结构 (简)
.
├── 📄 start.html             # 引导页 (项目入口之一)
├── 📄 index.html           # 音乐主页 (项目入口之一)
├── 📄 music-player.html       # 沉浸式播放器 (由 mymusic.html 嵌入)
│
├── 🎨 start.css              # 引导页样式
├── 🎨 style.css             # 音乐主页样式
├── 🎨 music-player.css        # 播放器样式
│
├── ⚙️ function.js             # 引导页逻辑
├── ⚙️ homepage.js             # 主页逻辑
├── ⚙️ app.js              # 音乐中心逻辑 (充当播放器遥控器)
├── ⚙️ music-player.js         # 播放器核心逻辑
├── ⚙️ mouse-trail.js          # (start.html) 鼠标拖尾特效
│
├── 🔧 build-playlist.js       # (Node.js) 歌曲列表生成脚本
├── 📄 playlist.json           # (自动生成) 歌曲配置文件
│
├── 📁 songs/                  # 歌曲资源目录
│   └── 📁 paomo/ (示例)
│       ├── 📄 info.json
│       ├── 🎵 G.E.M.邓紫棋-泡沫.flac
│       ├── 🖼️ cover.jpg
│       ├── 💬 lyrics.lrc
│       └── 🎬 video.mp4
│
└── 📁 graphics/               # 引导页的图片资源
```
