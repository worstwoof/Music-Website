# 星乐 Space Music V7

在浏览器里浏览曲库、搜索、播放音频或 MV。主页和“我的音乐”共用一个播放器。收藏、最近播放、队列、音量、主题和资料都存在当前浏览器中。

## 启动

在 v7 目录进入终端，运行下面的命令。

~~~powershell
python -m http.server 8000 --bind 127.0.0.1
~~~

打开 [引导页](http://127.0.0.1:8000/start.html) 或 [音乐首页](http://127.0.0.1:8000/index.html)。仓库带有歌曲清单，直接开网页就能试。基本播放使用本地资源，部分动画、字体和图标通过 CDN 加载。

## 看代码

| 文件 | 负责的内容 |
| --- | --- |
| index.html、app.js | 首页、搜索、音乐中心、底栏和播放器消息 |
| music-player.html、music-player.js | 选择活动媒体、播放、歌词、队列和收藏 |
| storage.js、profile.js | 浏览器数据、显示名称、简介和头像 |
| build-playlist.js | 检查歌曲配置和资源，生成 playlist.json |

V7 中点歌早于播放器加载完成时，主页会记住最后一次选择。收藏另一首歌时会继续播放当前曲目。切换音频或 MV 时从头开始，保留切换前的播放或暂停状态。

## 增加曲目

1. 在 songs 下为一首歌新建目录，将音频、封面和可选的 MV、lyrics.lrc 放进去。
2. 参照现有曲目的 info.json 填写信息，使用从未分配过的非负整数 id。已有曲目保持原有编号。
3. 在 v7 运行 node build-playlist.js，成功后刷新网页。重号或资源缺失时终端会指出配置，旧清单仍可用。

运行 node --test build-playlist.test.js 可以检查稳定编号、重复编号和资源缺失三种情况。
