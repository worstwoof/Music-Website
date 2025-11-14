document.addEventListener('DOMContentLoaded', async () => {

    // ===============================================
    // --- 1. 核心配置区 ---
    // ===============================================
    const songFolders = [
        'paomo',   // 对应 songs/paomo/
        'zaijian' , // 对应 songs/zaijian/
        'love uu',
        'xuxie',
        'luoyeguigen',
        'fushishanxia',
        'nanjinglianaitonggao',
        'aicuo'
    ];

    // ===============================================
    // --- 2. 全局变量与元素获取 (已补全音量元素) ---
    // ===============================================
    let playlistData = []; 
    let currentSongId = 0;
    let isPlaying = false; 
    let isSeeking = false; 
    let isUserScrolling = false;
    let scrollTimeout = null;
    let lastVolume = 1; // 用于静音切换
    let playMode = 'loop'; // 新增：'loop' (列表), 'one' (单曲), 'shuffle' (随机)
    let lyricsData = []; 
    let currentLyricDataIndex = -1; 

    // DOM 元素
    const audio = document.getElementById('audio-player');
    const titleElement = document.querySelector('.song-info h1');
    const artistElement = document.querySelector('.song-info .artist');
    const albumTitleElement = document.querySelector('.album-title');
    const albumArtElement = document.querySelector('.album-art');
    
    const playPauseBtn = document.getElementById('play-pause');
    const playPauseIcon = document.getElementById('play-pause-icon'); 
    const progressBarContainer = document.querySelector('.progress-bar-container');
    const progressBar = document.querySelector('.progress-bar');
    const currentTimeEl = document.querySelector('.time-current');
    const totalTimeEl = document.querySelector('.time-total');
    
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const repeatBtn = document.getElementById('btn-repeat'); // <-- 新增
    const repeatIcon = repeatBtn.querySelector('img');     // <-- 新增
    const favoriteBtn = document.getElementById('btn-favorite'); // <-- 新增
    const favoriteIcon = favoriteBtn.querySelector('img');     // <-- 新增

    let favoriteSongIds = []; // <-- 新增: 用来在内存中保存收藏列表
    const playlistBtn = document.getElementById('btn-playlist');
    const playlistModal = document.getElementById('playlist-modal');
    const closeModalBtn = document.getElementById('btn-close-modal');
    const songListUl = document.getElementById('playlist-song-list');
    
    // === 新增修复：重新获取音量控制元素 ===
    const volumeBtn = document.getElementById('btn-volume');
    const volumeIcon = document.getElementById('volume-icon');
    const volumeSlider = document.getElementById('volume-slider');
    
    const vinylRecord = document.querySelector('.vinyl-record');
    const vinylSheen = document.querySelector('.vinyl-sheen');
    const visualizer = document.querySelector('.music-visualizer');
    const lyricsListElement = document.querySelector('.lyrics-list'); 
    const lyricsContainer = document.querySelector('.lyrics-container');
    const sparkle = document.querySelector('.cursor-sparkle');

    const colorThief = new ColorThief();

    // ===============================================
    // --- 3. 自动加载系统 ---
    // ===============================================
    
    async function loadAllSongs() {
        console.log("开始加载歌曲...");
        playlistData = []; 

        for (let i = 0; i < songFolders.length; i++) {
            const folder = songFolders[i];
            const basePath = `songs/${folder}/`;

            try {
                const response = await fetch(`${basePath}info.json`);
                if (!response.ok) throw new Error(`配置缺失: ${folder}`);
                const info = await response.json();

                let lrcText = "";
                try {
                    const lrcRes = await fetch(`${basePath}lyrics.lrc`);
                    if (lrcRes.ok) lrcText = await lrcRes.text();
                } catch (e) { console.warn("歌词加载失败", e); }

                playlistData.push({
                    id: i,
                    title: info.title,
                    artist: info.artist,
                    album: info.album || "", 
                    src: `${basePath}${info.audio}`, 
                    cover: `${basePath}cover.jpg`,
                    lrc: lrcText
                });

            } catch (error) {
                console.error(`加载失败 [${folder}]:`, error);
            }
        }

        console.log(`成功加载 ${playlistData.length} 首歌曲`);
        
        if (playlistData.length > 0) {
            loadSongToPlayer(0, false); 
            renderPlaylist();
        }
    }

    // ===============================================
    // --- 4. 核心播放逻辑 ---
    // ===============================================

    function loadSongToPlayer(id, autoPlay = true) {
        const song = playlistData.find(s => s.id === id);
        if (!song) return;

        currentSongId = song.id;
        audio.crossOrigin = "anonymous";

        if (audio.src !== new URL(song.src, document.baseURI).href) {
            audio.src = song.src;
        }

        // 2. 更新文本信息 (使用淡入淡出)
        const infoElements = [titleElement, artistElement, albumTitleElement];

        // --- 立即触发“淡出” ---
        infoElements.forEach(el => {
            // 检查元素是否存在
            if (el) {
                el.classList.add('fade-out');
            }
        });

        // --- 延迟 300 毫秒 (等淡出动画播完) ---
        setTimeout(() => {
            // 1. 在“不可见”的状态下更新内容
            titleElement.innerHTML = `${song.title} <span class="tag-quality">Hi-Res</span>`;
            artistElement.textContent = song.artist;
            if (albumTitleElement) {
                albumTitleElement.textContent = song.album;
            }
            
            // 2. 移除 'fade-out' 类，触发 CSS "淡入"
            infoElements.forEach(el => {
                if (el) {
                    el.classList.remove('fade-out');
                }
            });
        }, 300); // 这里的 300ms 必须匹配 CSS transition 的 0.3s

        // 3. 更新封面
        if (albumArtElement) {
            albumArtElement.style.opacity = 0;
            albumArtElement.src = song.cover;
            albumArtElement.crossOrigin = "Anonymous"; 
            updateBackgroundTheme(albumArtElement);
            setTimeout(() => albumArtElement.style.opacity = 1, 300);
        }

        // 4. 加载歌词
        renderLyrics(song.lrc);
        // 5. 更新列表
        renderPlaylist();

        // 6. 播放
        if (autoPlay) {
            if (!isAudioContextSetup) setupAudioContext();
            audio.play().then(() => {
                isPlaying = true;
                updatePlayPauseIcon();
            }).catch(console.warn);
        } else {
            isPlaying = false;
            updatePlayPauseIcon();
        }
        updateFavoriteButtonUI(currentSongId);
    }

    function playNext() {
        let newId = (currentSongId + 1) % playlistData.length;
        loadSongToPlayer(newId, true);
    }

    function playPrev() {
        let newId = currentSongId - 1;
        if (newId < 0) newId = playlistData.length - 1;
        loadSongToPlayer(newId, true);
    }
    // ===============================================
    // --- 4.5. 播放模式逻辑 (新增) ---
    // ===============================================

    /**
     * 切换播放模式 (loop -> one -> shuffle)
     */
    function cyclePlayMode() {
        if (playMode === 'loop') {
            playMode = 'one';
        } else if (playMode === 'one') {
            playMode = 'shuffle';
        } else {
            playMode = 'loop';
        }
        updateRepeatButtonUI();
    }

    /**
     * 根据当前播放模式，更新循环按钮的图标
     */
    function updateRepeatButtonUI() {
        switch(playMode) {
            case 'one':
                // !! 注意：'icon/24gl-repeatone1.png' 是一个假设的路径
                repeatIcon.src = 'icon/24gl-repeatOnce2.png';
                repeatIcon.alt = '单曲循环';
                break;
            case 'shuffle':
                // !! 注意：'icon/24gl-shuffle1.png' 是一个假设的路径
                repeatIcon.src = 'icon/24gl-shuffle.png';
                repeatIcon.alt = '随机播放';
                break;
            case 'loop':
            default:
                // 'icon/24gl-repeat2.png' 来自你的 index.html
                repeatIcon.src = 'icon/24gl-repeat2.png'; 
                repeatIcon.alt = '列表循环';
                break;
        }
    }

    /**
     * 播放一首随机歌曲
     */
    function playShuffle() {
        if (playlistData.length <= 1) {
            playNext(); // 只有一首歌，无所谓随机
            return;
        }
        let newId;
        do {
            newId = Math.floor(Math.random() * playlistData.length);
        } while (newId === currentSongId); // 确保不是同一首歌
        
        loadSongToPlayer(newId, true);
    }

    /**
     * 根据播放模式处理歌曲播放结束事件
     */
    function handleSongEnd() {
        switch(playMode) {
            case 'one':
                // 单曲循环：回到开头并播放
                audio.currentTime = 0;
                audio.play();
                break;
            case 'shuffle':
                // 随机播放
                playShuffle();
                break;
            case 'loop':
            default:
                // 列表循环
                playNext();
                break;
        }
    }
    
    /**
     * 处理 "下一首" 按钮的点击事件
     */
    function handleNextClick() {
        if (playMode === 'shuffle') {
            playShuffle();
        } else {
            // 无论 'loop' 还是 'one'，用户手动点 "下一首" 都应该播放列表的下一首
            playNext();
        }
    }
    // ===============================================
    // --- 4.6. 收藏功能逻辑 (新增) ---
    // ===============================================

    /**
     * 将当前的收藏列表 (favoriteSongIds 数组) 保存到 localStorage
     */
    function saveFavoritesToStorage() {
        // localStorage 只能存字符串，所以用 JSON.stringify 转换数组
        localStorage.setItem('myFavoriteSongs', JSON.stringify(favoriteSongIds));
    }

    /**
     * 从 localStorage 加载已保存的收藏列表
     */
    function loadFavoritesFromStorage() {
        const storedFavorites = localStorage.getItem('myFavoriteSongs');
        if (storedFavorites) {
            // 将存的字符串转回数组
            favoriteSongIds = JSON.parse(storedFavorites);
        }
        // 如果 localStorage 里没有，favoriteSongIds 会保持为 [] (空数组)
    }

    /**
     * 根据当前歌曲 ID，更新收藏按钮的图标 (实心/空心)
     */
    function updateFavoriteButtonUI(songId) {
        if (!songId) songId = currentSongId; // 兼容

        if (favoriteSongIds.includes(songId)) {
            // !! 注意：'icon/24gl-heart-filled.png' 是一个假设的路径
            favoriteIcon.src = 'icon/24gl-heart-filled.png'; 
            favoriteIcon.alt = '取消收藏';
            favoriteBtn.classList.add('active'); // (可选) 添加激活类
        } else {
            favoriteIcon.src = 'icon/24gl-heart.png'; // 你的原始图标
            favoriteIcon.alt = '收藏';
            favoriteBtn.classList.remove('active');
        }
    }

    /**
     * 切换当前歌曲的收藏状态
     */
    function toggleFavorite() {
        const songId = currentSongId;

        // 检查是否已收藏
        const index = favoriteSongIds.indexOf(songId);

        if (index > -1) {
            // 已收藏 -> 移除
            favoriteSongIds.splice(index, 1);
        } else {
            // 未收藏 -> 添加
            favoriteSongIds.push(songId);
        }

        // 1. 将新列表存入 localStorage
        saveFavoritesToStorage();
        // 2. 立即更新 UI
        updateFavoriteButtonUI(songId);
    }
    // ===============================================
    // --- 5. 视觉进阶：背景与黑胶光晕自适应 ---
    // ===============================================

    function updateBackgroundTheme(imgElement) {
        if (imgElement.complete) {
            applyBackground(imgElement);
        } else {
            imgElement.addEventListener('load', function() {
                applyBackground(imgElement);
            }, { once: true });
        }
    }

    function applyBackground(img) {
        try {
            const color = colorThief.getColor(img); 
            const rgbStr = color.join(',');

            // 1. 修改 body 背景
            document.body.style.backgroundImage = `
                radial-gradient(ellipse at 50% 0%, rgba(${rgbStr}, 0.6) 0%, rgba(1, 18, 48, 0.9) 80%), 
                url('${img.src}')
            `;

            // 2. 修改漂浮光斑
            const light1 = document.querySelector('.ambient-light.one');
            const light2 = document.querySelector('.ambient-light.two');
            if(light1) light1.style.background = `rgb(${rgbStr})`;
            if(light2) light2.style.background = `rgba(${rgbStr}, 0.6)`;
            
            // 3. 更新黑胶唱片光晕
            if(vinylSheen) {
                vinylSheen.style.background = `radial-gradient(ellipse at center, rgba(${rgbStr}, 0.8) 0%, rgba(${rgbStr}, 0) 70%)`;
            }

        } catch (e) {
            console.warn("背景或光晕取色失败:", e);
            document.body.style.backgroundImage = `
                radial-gradient(ellipse at 50% 0%, rgba(66, 59, 99, 0.7), rgba(1, 18, 48, 0.9) 70%), 
                url('${img.src}')
            `;
            if(vinylSheen) {
                vinylSheen.style.background = `radial-gradient(ellipse at center, rgba(242, 146, 110, 0.8) 0%, rgba(242, 146, 110, 0) 70%)`; 
            }
        }
    }

    // ===============================================
    // --- 6. LRC 歌词解析与渲染 ---
    // ===============================================

    function parseLrc(lrcText) {
        if (!lrcText) return [];
        const lines = lrcText.split('\n');
        const result = [];
        const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

        lines.forEach(line => {
            const match = timeReg.exec(line);
            if (match) {
                const m = parseInt(match[1]);
                const s = parseInt(match[2]);
                const ms = parseInt(match[3]);
                const time = m * 60 + s + (ms / (match[3].length === 3 ? 1000 : 100));
                const text = line.replace(timeReg, '').trim();
                result.push({ time, text });
            }
        });
        return result;
    }

    function renderLyrics(lrcString) {
        lyricsListElement.innerHTML = '';
        lyricsData = [];
        currentLyricDataIndex = -1;
        lyricsContainer.scrollTop = 0;

        if (!lrcString) {
            lyricsListElement.innerHTML = '<li class="lyric-line active" style="text-align:center">暂无歌词</li>';
            return;
        }

        const parsed = parseLrc(lrcString);
        parsed.forEach((item, index) => {
            const li = document.createElement('li');
            li.classList.add('lyric-line');
            li.innerText = item.text;
            if(item.text === '') li.innerHTML = '&nbsp;';

            const timeSpan = document.createElement('span');
            timeSpan.classList.add('lyric-timestamp');
            const m = Math.floor(item.time / 60);
            const s = Math.floor(item.time % 60);
            timeSpan.innerText = `${m}:${s < 10 ? '0'+s : s}`;
            li.appendChild(timeSpan);

            li.addEventListener('click', () => {
                audio.currentTime = item.time;
                updateUI(item.time);
                if(audio.paused) {
                    if (!isAudioContextSetup) setupAudioContext();
                    audio.play();
                    isPlaying = true;
                    updatePlayPauseIcon();
                }
                isUserScrolling = false;
                lyricsContainer.classList.remove('user-scrolling');
                render3DLyrics(index);
            });

            lyricsListElement.appendChild(li);
            lyricsData.push({ time: item.time, element: li });
        });

        render3DLyrics(0);
    }

    function render3DLyrics(targetIndex) {
        if (!lyricsData.length) return;
        if (targetIndex < 0) targetIndex = 0;
        if (targetIndex >= lyricsData.length) targetIndex = lyricsData.length - 1;

        lyricsData.forEach((line, index) => {
            const el = line.element;
            const dist = index - targetIndex;
            
            const rotate = dist * 8;
            let translate = dist * 52;
            let scale = 1;
            let opacity = 0;

            if (dist === 0) {
                scale = 1.2; opacity = 1;
                el.classList.add('active');
            } else if (Math.abs(dist) <= 4) {
                scale = 1 - Math.abs(dist) * 0.15;
                opacity = 1 - Math.abs(dist) * 0.2;
                el.classList.remove('active');
            } else {
                opacity = 0; translate = dist * 60;
                el.classList.remove('active');
            }

            el.style.transform = `translateY(calc(-50% + ${translate}px)) rotateZ(${rotate}deg) scale(${scale})`;
            el.style.opacity = opacity;
            el.style.pointerEvents = opacity > 0 ? 'auto' : 'none';
        });
    }

    audio.addEventListener('timeupdate', () => {
        if (!isSeeking) updateUI(audio.currentTime);
        
        if (!isUserScrolling) {
            let idx = -1;
            for (let i = 0; i < lyricsData.length; i++) {
                if (audio.currentTime >= lyricsData[i].time) idx = i;
                else break;
            }
            if (idx !== -1 && idx !== currentLyricDataIndex) {
                currentLyricDataIndex = idx;
                render3DLyrics(currentLyricDataIndex);
            }
        }
    });

    lyricsContainer.addEventListener('wheel', (e) => {
        if (lyricsData.length === 0) return;
        e.preventDefault();
        
        if (!isUserScrolling) {
            lyricsContainer.dataset.scrollIdx = currentLyricDataIndex;
            isUserScrolling = true;
            lyricsContainer.classList.add('user-scrolling');
        }

        let idx = parseInt(lyricsContainer.dataset.scrollIdx || 0);
        if (e.deltaY > 0) idx++; else idx--;
        if (idx < 0) idx = 0;
        if (idx >= lyricsData.length) idx = lyricsData.length - 1;
        
        lyricsContainer.dataset.scrollIdx = idx;
        render3DLyrics(idx);

        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isUserScrolling = false;
            lyricsContainer.classList.remove('user-scrolling');
            let realIdx = -1;
            for (let i = 0; i < lyricsData.length; i++) {
                if (audio.currentTime >= lyricsData[i].time) realIdx = i;
                else break;
            }
            if(realIdx !== -1) render3DLyrics(realIdx);
        }, 3000);
    }, { passive: false });


    // ===============================================
    // --- 7. 基础 UI 控制 ---
    // ===============================================

    function updatePlayPauseIcon() {
        if (isPlaying) {
            playPauseIcon.src = 'icon/24gl-pause.png';
            vinylRecord.classList.add('playing');
            visualizer.classList.add('playing');
        } else {
            playPauseIcon.src = 'icon/24gl-play.png';
            vinylRecord.classList.remove('playing');
            visualizer.classList.remove('playing');
        }
    }

    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            if(!isAudioContextSetup) setupAudioContext();
            audio.play();
            isPlaying = true;
        } else {
            audio.pause();
            isPlaying = false;
        }
        updatePlayPauseIcon();
    });

    function updateUI(time) {
        if (audio.duration) {
            progressBar.style.width = `${(time / audio.duration) * 100}%`;
        }
        currentTimeEl.textContent = formatTime(time);
    }
    function formatTime(s) {
        if (isNaN(s)) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0'+sec : sec}`;
    }
    
    progressBarContainer.addEventListener('mousedown', (e) => {
        isSeeking = true;
        progressBarContainer.classList.add('seeking'); // <-- 新增
        handleSeek(e);
    });
    document.addEventListener('mousemove', (e) => { if(isSeeking) handleSeek(e, false); });
    document.addEventListener('mouseup', (e) => { 
        if(isSeeking) {
            handleSeek(e, true);
            isSeeking = false;
            progressBarContainer.classList.remove('seeking'); // <-- 新增
        }
    });
    function handleSeek(e, apply = true) {
        const rect = progressBarContainer.getBoundingClientRect();
        let pct = (e.clientX - rect.left) / rect.width;
        pct = Math.min(1, Math.max(0, pct));
        const time = pct * audio.duration;
        if(apply) audio.currentTime = time;
        updateUI(time);
    }

    function renderPlaylist() {
        songListUl.innerHTML = ''; 
        playlistData.forEach(song => {
            const li = document.createElement('li');
            if (song.id === currentSongId) li.classList.add('playing');
            li.innerHTML = `<span class="song-item-title">${song.title}</span><span class="song-item-artist">${song.artist}</span>`;
            li.addEventListener('click', () => loadSongToPlayer(song.id, true));
            songListUl.appendChild(li);
        });
    }
    playlistBtn.addEventListener('click', () => {
        playlistModal.classList.toggle('show');

        // === (已修复) 优化：如果播放列表被打开，则滚动到当前歌曲 ===
        if (playlistModal.classList.contains('show')) {
            const currentSongElement = songListUl.querySelector('li.playing');
            
            if (currentSongElement) {
                
                // -----------------------------------------------------------------
                // === 替换开始 ===
                //
                // 错误的方式 (这会滚动整个页面):
                // currentSongElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                //
                // 正确的方式 (只滚动 <ul> 列表内部):
                
                // 1. 计算元素中心点的位置 (相对于 <ul> 顶部)
                const elementTop = currentSongElement.offsetTop;
                const elementHeight = currentSongElement.clientHeight;
                const elementCenter = elementTop + (elementHeight / 2);

                // 2. 计算 <ul> 容器的可见高度和中心点
                const containerHeight = songListUl.clientHeight;
                const containerCenter = containerHeight / 2;

                // 3. 计算 <ul> 需要滚动的距离
                //    目标：让 元素的中心点 与 容器的中心点 对齐
                const scrollToTop = elementCenter - containerCenter;

                // 4. 执行平滑滚动 (只滚动 songListUl 元素)
                //    (songListUl 是您在脚本开头定义的 .playlist-song-list)
                songListUl.scrollTo({
                    top: scrollToTop,
                    behavior: 'smooth'
                });
                // === 替换结束 ===
                // -----------------------------------------------------------------
            }
        }
        // =========================================================
    });
    closeModalBtn.addEventListener('click', () => playlistModal.classList.remove('show'));
    
    prevBtn.addEventListener('click', playPrev);
    nextBtn.addEventListener('click', handleNextClick); // <-- 修改
    audio.addEventListener('ended', handleSongEnd); // <-- 修改
    repeatBtn.addEventListener('click', cyclePlayMode); // <-- 新增
    favoriteBtn.addEventListener('click', toggleFavorite); // <-- 新增
    audio.onloadedmetadata = () => {
        totalTimeEl.textContent = formatTime(audio.duration);
        // === 修复：确保音量UI在音频加载后初始化 ===
        updateVolumeUI();
    };

// === 新增：点击播放列表外部区域自动关闭 ===
    document.addEventListener('click', (event) => {
        // 1. 检查播放列表当前是否可见
        if (playlistModal.classList.contains('show')) {
            
            // 2. 检查点击的是否是“播放列表按钮” (或其内部的图标)
            const isClickOnButton = playlistBtn.contains(event.target) || playlistBtn === event.target;
            
            // 3. 检查点击的是否在“播放列表”内部
            const isClickInModal = playlistModal.contains(event.target);

            // 4. 如果点击既不在按钮上，也不在播放列表内部，则关闭它
            if (!isClickOnButton && !isClickInModal) {
                playlistModal.classList.remove('show');
            }
        }
    });
    // =========================================
    // ===============================================
    // --- 7.5. 音量控制 (已修复) ---
    // ===============================================

    function handleVolumeChange() {
        const value = volumeSlider.value / 100;
        audio.volume = value;
        audio.muted = (value === 0);
    }

    function toggleMute() {
        if (audio.muted) {
            audio.muted = false;
            // 恢复到静音前的音量，如果静音前是0，则恢复到100%
            audio.volume = (lastVolume > 0) ? lastVolume : 1;
        } else {
            lastVolume = audio.volume; // 保存当前音量
            audio.muted = true;
            audio.volume = 0; // 静音时，音量滑块也应为0
        }
    }

    function updateVolumeUI() {
        // 根据 audio.muted 和 audio.volume 来更新UI
        const volume = audio.muted ? 0 : audio.volume;
        
        if (!audio.muted && volume > 0) {
            lastVolume = volume; // 记录最后一次非静音时的音量
        }
        
        // 更新滑块位置
        volumeSlider.value = volume * 100;
        
        // 更新滑块背景填充
        volumeSlider.style.background = `linear-gradient(to right, var(--progress-bar-fill) ${volume * 100}%, var(--progress-bar-bg) ${volume * 100}%)`;

        // 更新音量图标
        // (确保你的图标路径是 'icon/...'，如果不是请修改这里)
        if (volume === 0) {
            volumeIcon.src = 'icon/24gl-volumeCross.png';
        } else if (volume < 0.33) {
            volumeIcon.src = 'icon/24gl-volumeLow.png';
        } else if (volume < 0.66) {
            volumeIcon.src = 'icon/24gl-volumeMiddle.png';
        } else {
            volumeIcon.src = 'icon/24gl-volumeHigh.png';
        }
    }

    // === 修复：添加事件监听器 ===
    volumeSlider.addEventListener('input', handleVolumeChange);
    volumeBtn.addEventListener('click', toggleMute);
    audio.addEventListener('volumechange', updateVolumeUI); // 监听音频元素的所有音量变化

    // ===============================================
    // --- 8. 音频频谱 ---
    // ===============================================
    let audioContext, analyser, dataArray;
    let isAudioContextSetup = false;
    const visualizerBars = document.querySelectorAll('.music-visualizer .bar');
    let lastHeights = new Array(30).fill(0);

    function setupAudioContext() {
        if (isAudioContextSetup) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            audioContext = new AC();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 64; 
            
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            isAudioContextSetup = true;
            renderVisualizer();
            
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

        } catch(e) { 
            console.log("Web Audio Init Failed:", e); 
        }
    }

    function renderVisualizer() {
        requestAnimationFrame(renderVisualizer);
        
        if (!isPlaying) {
            // === 1. 修改暂停/无声时的样式 ===
            visualizerBars.forEach(b => {
                b.style.height = '5%'; // 保持 5% 的低高度
                b.style.opacity = 1;   // 设置为 1 (因为颜色自带透明度)
                
                // (修改点) 使用进度条背景色 (透明的薰衣草紫)
                b.style.background = 'var(--progress-bar-bg)'; 
            });
            if(particleContainer) {
                 particleContainer.style.setProperty('--audio-pulse', 0);
            }
            return;
        }

        analyser.getByteFrequencyData(dataArray);
        let bassSum = 0;
        const bassBins = 8; // 只取前 8 个低音/中低音频段
        
        for (let i = 0; i < bassBins; i++) {
            bassSum += dataArray[i];
        }
        
        // dataArray[i] 的范围是 0-255
        let average = bassSum / bassBins;
        const center = 14.5; 
        
        visualizerBars.forEach((bar, i) => {
            
            const dist = Math.abs(i - center);
            const idx = Math.floor(dist); 
            const val = dataArray[idx] || 0;
            const targetHeight = (val / 255) * 100;
            
            lastHeights[i] += (targetHeight - lastHeights[i]) * 0.2;
            
            const currentHeight = Math.max(5, lastHeights[i]);

            bar.style.height = currentHeight + '%';
            bar.style.opacity = 0.3 + (lastHeights[i] / 150); // 透明度依然由高度决定

            // === 2. 修改播放时的颜色逻辑 ===
            if (currentHeight > 60) {
                // 高峰 (鲑鱼色)
                bar.style.background = 'var(--c-salmon)';
            } else if (currentHeight > 10) {
                // 中间 (薰衣草紫)
                bar.style.background = 'var(--progress-bar-bg1)';
            } else {
                // (修改点) 低谷 (使用进度条背景色，即透明的薰衣草紫)
                bar.style.background = 'var(--progress-bar-bg1)';
            }
        });
        if (particleContainer) {
            // average 范围是 0-255。我们把它转为 0 到 1 之间
            let pulse = average / 255; 
        
            // 2. 增强对比度 (使用 Math.pow)
            //    (pulse, 2) 曲线比较缓和
            //    (pulse, 4) 曲线非常陡峭，只有很响的鼓点才能触发高数值
            //    我们用 3 试试
            pulse = Math.pow(pulse, 3);
            
            // 3. (可选) 再次放大信号，并确保不超过 1
            pulse = Math.min(1.0, pulse * 1.5);
            
            // 写入 CSS 变量，让 CSS 去做动画
            particleContainer.style.setProperty('--audio-pulse', pulse);
        }
    }
document.addEventListener('keydown', (e) => {
        // 当焦点在音量条上时，不触发左右箭头，以免冲突
        if (document.activeElement === volumeSlider && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
            return; 
        }

        switch(e.code) {
            case 'Space': 
                e.preventDefault(); // 阻止页面滚动
                playPauseBtn.click(); // 触发按钮点击，逻辑最统一
                break;
                
            case 'ArrowRight':
                e.preventDefault();
                if (audio.duration) {
                    audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
                    updateUI(audio.currentTime); // 立即更新UI
                }
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                if (audio.duration) {
                    audio.currentTime = Math.max(0, audio.currentTime - 5);
                    updateUI(audio.currentTime);
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                const newVolUp = Math.min(1, audio.volume + 0.1);
                audio.volume = newVolUp;
                audio.muted = false; // 增加音量时自动取消静音
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                const newVolDown = Math.max(0, audio.volume - 0.1);
                audio.volume = newVolDown;
                break;
            
            case 'KeyM': // 'M' 键静音
                toggleMute();
                break;
        }
    });
    // ===============================================
    // --- 9. 启动特效 ---
    // ===============================================

    // 1. 背景流星
    const starsContainer = document.querySelector('.shooting-stars-container');
    if(starsContainer) {
        for(let i=0; i<60; i++) {
            const s = document.createElement('div');
            s.className = 'shooting-star';
            s.style.left = Math.random()*100 + '%';
            s.style.top = Math.random()*100 + '%';
            s.style.animationDelay = Math.random()*5 + 's';
            s.style.animationDuration = (5+Math.random()*5) + 's';
            starsContainer.appendChild(s);
        }
    }

    // === 更新：卡片内部粒子星云特效 (带有多彩颜色) ===
    const particleContainer = document.querySelector('.card-particle-overlay');
    if (particleContainer) {
        
        // --- 新增：定义浅色主题色数组 ---
        // (颜色来自 style.css 的 --c-pale-pink, --c-lavender, --c-salmon, 以及白色)
        const particleColors = [
            'rgba(245, 218, 223, 0.4)', // 浅粉
            'rgba(175, 125, 172, 0.4)', // 薰衣草紫
            'rgba(242, 146, 110, 0.5)', // 鲑鱼色 (稍亮一点)
            'rgba(255, 255, 255, 0.3)'  // 白色 (稍透明)
        ];
        // ---------------------------------

        const particleCount = 400; 
        
        for (let i = 0; i < particleCount; i++) {
        
            // --- 1. (新) 创建外层“流动”包裹器 ---
            const wrapper = document.createElement('div');
            wrapper.className = 'card-particle-wrapper';

            // --- 2. (新) 创建内层“呼吸”粒子 ---
            const particle = document.createElement('div');
            particle.className = 'card-particle';

            // --- 3. (修改) 应用颜色到内层粒子 ---
            const randomColor = particleColors[Math.floor(Math.random() * particleColors.length)];
            particle.style.background = randomColor;
            
            // --- 4. (修改) 应用动画属性到外层包裹器 ---
            
            // 初始位置
            wrapper.style.top = Math.random() * 100 + '%';
            wrapper.style.left = Math.random() * 100 + '%';

            // 动画延迟
            wrapper.style.animationDelay = (Math.random() * 15) + 's';
            
            // 动画终点
            const dx = (Math.random() - 0.5) * 200; 
            const dy = (Math.random() - 0.5) * 200; 
            wrapper.style.setProperty('--dx', `${dx}px`);
            wrapper.style.setProperty('--dy', `${dy}px`);
            
            // --- 5. (修改) 随机大小应用到内层粒子 ---
            const scale = 0.5 + Math.random() * 0.5;
            particle.style.width = `${Math.floor(scale * 4)}px`;
            particle.style.height = `${Math.floor(scale * 4)}px`;
            
            // --- 6. (新) 组装：把 粒子 放入 包裹器，再把 包裹器 放入 容器 ---
            wrapper.appendChild(particle);
            particleContainer.appendChild(wrapper);
        }
    }
    // ===============================================
    // --- (新增) 鼠标流星拖尾逻辑 ---
    // ===============================================
    
    // 1. 获取所有粒子
    const trailDots = document.querySelectorAll('.trail-dot');
    
    // 2. 存储上一次鼠标的位置
    let lastMouseX = -100;
    let lastMouseY = -100;
    
    // 3. 定义一个“节流阀”计时器
    let trailThrottleTimer;

    // 4. 当鼠标移动时触发
    document.body.addEventListener('mousemove', (e) => {
        // 更新鼠标位置
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        // 5. 节流：我们不需要每 1 毫秒都更新所有粒子
        //    我们只需要每 20 毫秒左右更新一次“头部”
        if (!trailThrottleTimer) {
            trailThrottleTimer = setTimeout(() => {
                // 6. 移动“头部”粒子 (第一个 dot)
                if (trailDots.length > 0) {
                    trailDots[0].style.opacity = 1;
                    trailDots[0].style.transform = `translate(${lastMouseX}px, ${lastMouseY}px)`;
                }
                
                // 7. 依次移动后续粒子
                //    使用一个微小的延迟，让 CSS transition 生效，形成链条感
                for (let i = 1; i < trailDots.length; i++) {
                    const dot = trailDots[i];
                    // 立即读取“前一个”粒子的位置
                    const prevDot = trailDots[i - 1];
                    const transform = window.getComputedStyle(prevDot).transform;
                    
                    // 将自己的位置设置为“前一个”粒子的位置
                    dot.style.opacity = 1 - (i * 0.15); // 透明度
                    dot.style.transform = transform; // CSS transition 会自动平滑过去
                }

                // 8. 重置节流阀
                trailThrottleTimer = null;
            }, 20); // 每 20ms 触发一次
        }
    });

    // (可选) 鼠标移出窗口时隐藏拖尾
    document.body.addEventListener('mouseleave', () => {
        trailDots.forEach(dot => dot.style.opacity = 0);
    });
    // 3. 播放器卡片 3D 视差
    const playerCard = document.querySelector('.music-player');
    document.body.addEventListener('mousemove', (e) => {
      
        if(window.innerWidth > 768) {
            let x = (window.innerWidth/2 - e.pageX) / 200;
            let y = (window.innerHeight/2 - e.pageY) / 200;
            playerCard.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
            // 2. 新增：黑胶唱片 (更强的位移，增强前景感)
            // Tweak 这里的 /10 和 /15 来调整强度
            vinylWrapper.style.transform = `translateX(${x * -10}px) translateY(${y * -15}px)`;

            // 3. 新增：歌词 (轻微的、反向的位移，增强后景感)
            lyricsContainer.style.transform = `translateX(${x * 5}px) translateY(${y * 5}px)`;
        }
    });
    // (可以放在 script.js 的 "9. 启动特效" 部分)

    function applyRippleEffect() {
        // 找到所有需要波纹效果的元素
        const rippleElements = document.querySelectorAll(
            '.btn, .playlist-song-list li, .nav-capsule a'
        );

        rippleElements.forEach(el => {
            el.addEventListener('click', function(e) {
                // 计算波纹的位置
                const rect = el.getBoundingClientRect();
                const rippleX = e.clientX - rect.left;
                const rippleY = e.clientY - rect.top;

                // 创建波纹元素
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                ripple.style.left = rippleX + 'px';
                ripple.style.top = rippleY + 'px';

                // 移除旧波纹 (如果存在)
                const oldRipple = el.querySelector('.ripple');
                if (oldRipple) {
                    oldRipple.remove();
                }

                el.appendChild(ripple);

                // 动画结束后移除波纹
                ripple.addEventListener('animationend', () => {
                    ripple.remove();
                });
            });
        });
    }
    // ===============================================
    // --- 10. 动态导航栏 (新增) ---
    // ===============================================
    function initNavPill() {
        const navCapsule = document.querySelector('.nav-capsule');
        const navPill = document.querySelector('.nav-pill');
        const navLinks = document.querySelectorAll('.nav-capsule a');

        // 检查元素是否存在
        if (!navCapsule || !navPill || navLinks.length === 0) return;

        /**
         * 移动药丸到目标链接
         * @param {HTMLElement} targetLink - 目标 <a> 元素
         */
        function movePill(targetLink) {
            if (!targetLink) return;

            // 1. 获取目标链接和胶囊的位置信息
            const targetRect = targetLink.getBoundingClientRect();
            const capsuleRect = navCapsule.getBoundingClientRect();
            
            // 2. 获取胶囊的 padding-left (您在 CSS 中设置的 10px)
            const capsulePaddingLeft = parseFloat(getComputedStyle(navCapsule).paddingLeft);

            // 3. 计算药丸需要平移的距离
            //    (链接的左侧 - 胶囊的左侧) = 链接相对于胶囊 *border* 的偏移
            //    再减去 capsulePaddingLeft，就得到链接相对于胶囊 *padding* 的偏移
            const translateX = (targetRect.left - capsuleRect.left) - capsulePaddingLeft;

            // 4. 移动药丸
            navPill.style.width = targetRect.width + 'px';
            navPill.style.transform = `translateX(${translateX}px)`; // <-- 这是修复后的核心

            // 5. 更新 .active 状态 (只改变文本颜色)
            navLinks.forEach(link => link.classList.remove('active'));
            targetLink.classList.add('active');
        }

        // 1. 页面加载时：立即定位到默认的 .active 链接
        const activeLink = document.querySelector('.nav-capsule a.active');
        if (activeLink) {
            // 需要一点点延迟，确保 CSS 布局已计算完毕
            setTimeout(() => {
                movePill(activeLink);
                // (可选) 立即生效，移除初始的过渡动画
                navPill.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 100);
            navPill.style.transition = 'none'; // 初始加载时不显示动画
        }

        // 2. 为所有链接添加点击事件
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); // 阻止页面跳转
                movePill(e.currentTarget); // 移动药丸到被点击的链接
            });
        });
    }


   // 开始
    loadFavoritesFromStorage(); // <-- 新增：先加载收藏记录
    loadAllSongs();
    applyRippleEffect(); // <-- 添加这一行
        // 在脚本启动时调用它
    initNavPill();
});