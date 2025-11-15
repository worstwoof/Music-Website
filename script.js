document.addEventListener('DOMContentLoaded', async () => {

    // ===============================================
    // --- 1. 核心配置区 ---
    // ===============================================
    const songFolders = [
        '泡沫',   // 对应 songs/paomo/
        '再见' , // 对应 songs/zaijian/
        'love uu',
        '续写',
        '落叶归根',
        '富士山下',
        '南京恋爱通告',
        '爱错',
        '我想要占据你',
        '这就是爱'
    ];

    // ===============================================
    // --- 2. 全局变量与元素获取 ---
    // ===============================================
    let playlistData = []; 
    let currentSongId = 0;
    
    // (修改) isPlaying 现在代表“用户希望播放”的状态，而不是某个元素的具体状态
    let isPlaying = false; 
    
    let isSeeking = false; 
    let isUserScrolling = false;
    let scrollTimeout = null;
    let lastVolume = 1;
    let playMode = 'loop';
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
    const repeatBtn = document.getElementById('btn-repeat');
    const repeatIcon = repeatBtn.querySelector('img');
    const favoriteBtn = document.getElementById('btn-favorite');
    const favoriteIcon = favoriteBtn.querySelector('img');

    let favoriteSongIds = [];
    const playlistBtn = document.getElementById('btn-playlist');
    const playlistModal = document.getElementById('playlist-modal');
    const closeModalBtn = document.getElementById('btn-close-modal');
    const songListUl = document.getElementById('playlist-song-list');
    
    const volumeBtn = document.getElementById('btn-volume');
    const volumeIcon = document.getElementById('volume-icon');
    const volumeSlider = document.getElementById('volume-slider');
    
    const vinylRecord = document.querySelector('.vinyl-record');
    const vinylSheen = document.querySelector('.vinyl-sheen');
    const visualizer = document.querySelector('.music-visualizer');
    const lyricsListElement = document.querySelector('.lyrics-list'); 
    const lyricsContainer = document.querySelector('.lyrics-container');

    const playerCard = document.querySelector('.music-player');
    const vinylWrapper = document.querySelector('.vinyl-wrapper');
    
    const mvPlayer = document.getElementById('mv-player');
    const mvBtn = document.getElementById('btn-mv');
    const mvIcon = document.getElementById('mv-icon');
    
    // (修改) isMvMode 是核心状态，决定谁在发声
    let isMvMode = false;

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
                    lrc: lrcText,
                    mv: info.mv ? `${basePath}${info.mv}` : null
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
    // --- 4. 核心播放逻辑 (已修改) ---
    // ===============================================

    function loadSongToPlayer(id, autoPlay = true) {
        const song = playlistData.find(s => s.id === id);
        if (!song) return;

        currentSongId = song.id;
        audio.crossOrigin = "anonymous";

        // (修改) 仅在非 MV 模式时预加载音频
        if (!isMvMode) {
             if (audio.src !== new URL(song.src, document.baseURI).href) {
                audio.src = song.src;
            }
        } else {
            // 如果在 MV 模式，只加载音频路径，不播放
            audio.src = song.src;
        }

        // 2. 更新文本信息 (淡入淡出)
        const infoElements = [titleElement, artistElement, albumTitleElement];
        infoElements.forEach(el => { if (el) el.classList.add('fade-out'); });
        setTimeout(() => {
            titleElement.innerHTML = `${song.title} <span class="tag-quality">Hi-Res</span>`;
            artistElement.textContent = song.artist;
            if (albumTitleElement) albumTitleElement.textContent = song.album;
            infoElements.forEach(el => { if (el) el.classList.remove('fade-out'); });
        }, 300);

        // 3. 更新封面
        if (albumArtElement) {
            albumArtElement.style.opacity = 0;
            albumArtElement.src = song.cover;
            albumArtElement.crossOrigin = "Anonymous"; 
            updateBackgroundTheme(albumArtElement);
            setTimeout(() => albumArtElement.style.opacity = 1, 300);
        }

        // (修改) 4. 加载 MV
        isPlaying = autoPlay; // 关键：在这里设置播放意图

        if (song.mv) {
            mvBtn.style.display = 'flex';
            if (mvPlayer.src !== new URL(song.mv, document.baseURI).href) {
                mvPlayer.src = song.mv;
            }
        } else {
            mvBtn.style.display = 'none';
            mvPlayer.src = '';
            if (isMvMode) {
                // 正在 MV 模式，但新歌没有 MV，强制退出 MV 模式
                toggleMvMode(); 
            }
        }

        // 5. 加载歌词
        renderLyrics(song.lrc);
        // 6. 更新列表
        renderPlaylist();

        // (修改) 7. 播放
        if (autoPlay) {
            if (!isAudioContextSetup) setupAudioContext();
            
            if (isMvMode && song.mv) {
                // 意图：播放, 模式：MV, 条件：有MV
                mvPlayer.muted = false; // (使用 MV 音频)
                mvPlayer.volume = audio.volume;
                mvPlayer.play().catch(console.warn);
            } else {
                // 意图：播放, 模式：Audio (或 MV模式但无MV)
                audio.play().catch(console.warn);
            }
        }
        
        updatePlayPauseIcon(); // 根据 isPlaying 更新 UI
        updateFavoriteButtonUI(currentSongId);
    }
    
    // ... (playNext, playPrev 保持不变) ...
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
    // --- 4.5. 播放模式逻辑 (已修改) ---
    // ===============================================

    // ... (cyclePlayMode, updateRepeatButtonUI, playShuffle 保持不变) ...
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
    function updateRepeatButtonUI() {
        switch(playMode) {
            case 'one':
                repeatIcon.src = 'icon/24gl-repeatOnce2.png';
                break;
            case 'shuffle':
                repeatIcon.src = 'icon/24gl-shuffle.png';
                break;
            case 'loop':
            default:
                repeatIcon.src = 'icon/24gl-repeat2.png'; 
                break;
        }
    }
    function playShuffle() {
        if (playlistData.length <= 1) {
            playNext();
            return;
        }
        let newId;
        do {
            newId = Math.floor(Math.random() * playlistData.length);
        } while (newId === currentSongId);
        loadSongToPlayer(newId, true);
    }

    /**
     * (修改) 根据播放模式处理歌曲播放结束事件 (支持 MV/Audio)
     */
    function handleSongEnd() {
        switch(playMode) {
            case 'one':
                // 单曲循环：回到开头并播放
                if (isMvMode) {
                    mvPlayer.currentTime = 0;
                    mvPlayer.play();
                } else {
                    audio.currentTime = 0;
                    audio.play();
                }
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
    
    // ... (handleNextClick 保持不变) ...
    function handleNextClick() {
        if (playMode === 'shuffle') {
            playShuffle();
        } else {
            playNext();
        }
    }
    
    // ... (收藏功能 保持不变) ...
    function saveFavoritesToStorage() {
        localStorage.setItem('myFavoriteSongs', JSON.stringify(favoriteSongIds));
    }
    function loadFavoritesFromStorage() {
        const storedFavorites = localStorage.getItem('myFavoriteSongs');
        if (storedFavorites) {
            favoriteSongIds = JSON.parse(storedFavorites);
        }
    }
    function updateFavoriteButtonUI(songId) {
        if (!songId) songId = currentSongId;
        if (favoriteSongIds.includes(songId)) {
            favoriteIcon.src = 'icon/24gl-heart-filled.png'; 
            favoriteBtn.classList.add('active');
        } else {
            favoriteIcon.src = 'icon/24gl-heart.png';
            favoriteBtn.classList.remove('active');
        }
    }
    function toggleFavorite() {
        const songId = currentSongId;
        const index = favoriteSongIds.indexOf(songId);
        if (index > -1) {
            favoriteSongIds.splice(index, 1);
        } else {
            favoriteSongIds.push(songId);
        }
        saveFavoritesToStorage();
        updateFavoriteButtonUI(songId);
    }
    
    // ... (背景主题 保持不变) ...
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
            document.body.style.backgroundImage = `
                radial-gradient(ellipse at 50% 0%, rgba(${rgbStr}, 0.6) 0%, rgba(1, 18, 48, 0.9) 80%), 
                url('${img.src}')
            `;
            const light1 = document.querySelector('.ambient-light.one');
            const light2 = document.querySelector('.ambient-light.two');
            if(light1) light1.style.background = `rgb(${rgbStr})`;
            if(light2) light2.style.background = `rgba(${rgbStr}, 0.6)`;
            if(vinylSheen) {
                vinylSheen.style.background = `radial-gradient(ellipse at center, rgba(${rgbStr}, 0.8) 0%, rgba(${rgbStr}, 0) 70%)`;
            }
        } catch (e) {
            // ... (error handling) ...
        }
    }

    // ===============================================
    // --- 6. LRC 歌词解析与渲染 (已修改) ---
    // ===============================================

    // ... (parseLrc 保持不变) ...
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
        // ... (顶部逻辑 保持不变) ...
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
            // ... (创建 li, timeSpan) ...
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

            // (修改) 点击歌词跳转，支持 MV/Audio
            li.addEventListener('click', () => {
                // (修改) 确定跳转到哪个播放器
                if (isMvMode) {
                    mvPlayer.currentTime = item.time;
                    if (!isPlaying) mvPlayer.play();
                } else {
                    audio.currentTime = item.time;
                    if (!isPlaying) audio.play();
                }
                
                if (!isPlaying) { // 如果原本是暂停的，则开始播放
                    isPlaying = true;
                    updatePlayPauseIcon();
                }

                updateUI(item.time);
                isUserScrolling = false;
                lyricsContainer.classList.remove('user-scrolling');
                render3DLyrics(index); // (函数名未改，但效果是 2D)
            });

            lyricsListElement.appendChild(li);
            lyricsData.push({ time: item.time, element: li });
        });

        render3DLyrics(0); // (函数名未改，但效果是 2D)
    }

    /**
     * (修改) 渲染歌词，已移除 3D 特效
     */
    function render3DLyrics(targetIndex) {
        if (!lyricsData.length) return;
        if (targetIndex < 0) targetIndex = 0;
        if (targetIndex >= lyricsData.length) targetIndex = lyricsData.length - 1;

        lyricsData.forEach((line, index) => {
            const el = line.element;
            const dist = index - targetIndex;
            
            // === (1. 恢复) 恢复 rotate 变量 ===
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

            // === (1. 恢复) 恢复 transform 中的 rotateZ ===
            el.style.transform = `translateY(calc(-50% + ${translate}px)) rotateZ(${rotate}deg) scale(${scale})`;
            el.style.opacity = opacity;
            el.style.pointerEvents = opacity > 0 ? 'auto' : 'none';
        });
    }

    // (修改) 音频时间更新 (仅在 Audio 模式下工作)
    audio.addEventListener('timeupdate', () => {
        if (isMvMode || isSeeking) return; // MV 模式下，音频不控制 UI
        
        updateUI(audio.currentTime);
        
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

    // (新增) MV 时间更新 (仅在 MV 模式下工作)
    mvPlayer.addEventListener('timeupdate', () => {
        if (!isMvMode || isSeeking) return; // Audio 模式下，视频不控制 UI

        updateUI(mvPlayer.currentTime);
        
        // (复制歌词同步逻辑)
        if (!isUserScrolling) {
            let idx = -1;
            for (let i = 0; i < lyricsData.length; i++) {
                if (mvPlayer.currentTime >= lyricsData[i].time) idx = i;
                else break;
            }
            if (idx !== -1 && idx !== currentLyricDataIndex) {
                currentLyricDataIndex = idx;
                render3DLyrics(currentLyricDataIndex);
            }
        }
    });

    // ... (歌词滚动 保持不变) ...
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
            
            // (修改) 根据模式决定用谁的时间
            const currentTime = isMvMode ? mvPlayer.currentTime : audio.currentTime;
            
            let realIdx = -1;
            for (let i = 0; i < lyricsData.length; i++) {
                if (currentTime >= lyricsData[i].time) realIdx = i;
                else break;
            }
            if(realIdx !== -1) render3DLyrics(realIdx);
        }, 3000);
    }, { passive: false });


    // ===============================================
    // --- 7. 基础 UI 控制 (已修改) ---
    // ===============================================

    // (修改) updatePlayPauseIcon 只依赖 isPlaying 状态
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

    // (修改) 播放/暂停按钮，控制全局状态和对应的播放器
    playPauseBtn.addEventListener('click', () => {
        const wasPlaying = isPlaying; // 检查之前的状态
        
        if (wasPlaying) {
            // 用户想暂停
            isPlaying = false;
            if (isMvMode) mvPlayer.pause();
            else audio.pause();
        } else {
            // 用户想播放
            isPlaying = true;
            if (isMvMode) {
                mvPlayer.play();
            } else {
                if(!isAudioContextSetup) setupAudioContext();
                audio.play();
            }
        }
        updatePlayPauseIcon(); // 更新 UI
    });

    // ... (updateUI, formatTime 保持不变) ...
    function updateUI(time) {
        // (修改) 自动获取当前活动播放器的总时长
        const duration = isMvMode ? mvPlayer.duration : audio.duration;
        if (duration) {
            progressBar.style.width = `${(time / duration) * 100}%`;
        }
        currentTimeEl.textContent = formatTime(time);
    }
    function formatTime(s) {
        if (isNaN(s) || s < 0) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0'+sec : sec}`;
    }
    
    // ... (进度条拖拽 保持不变) ...
    progressBarContainer.addEventListener('mousedown', (e) => {
        isSeeking = true;
        progressBarContainer.classList.add('seeking');
        handleSeek(e);
    });
    document.addEventListener('mousemove', (e) => { if(isSeeking) handleSeek(e, false); });
    document.addEventListener('mouseup', (e) => { 
        if(isSeeking) {
            handleSeek(e, true);
            isSeeking = false;
            progressBarContainer.classList.remove('seeking');
        }
    });

    /**
     * (修改) 进度条拖拽 (支持 MV/Audio)
     */
    function handleSeek(e, apply = true) {
        const rect = progressBarContainer.getBoundingClientRect();
        let pct = (e.clientX - rect.left) / rect.width;
        pct = Math.min(1, Math.max(0, pct));
        
        // (修改) 自动获取当前活动播放器的总时长
        const duration = isMvMode ? mvPlayer.duration : audio.duration;
        const time = pct * duration;

        if(apply) {
            // (修改) 自动应用到当前活动播放器
            if (isMvMode) mvPlayer.currentTime = time;
            else audio.currentTime = time;
        }
        updateUI(time); // 立即更新 UI
    }

    // ... (播放列表 保持不变) ...
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
        if (playlistModal.classList.contains('show')) {
            const currentSongElement = songListUl.querySelector('li.playing');
            if (currentSongElement) {
                const elementTop = currentSongElement.offsetTop;
                const elementHeight = currentSongElement.clientHeight;
                const elementCenter = elementTop + (elementHeight / 2);
                const containerHeight = songListUl.clientHeight;
                const containerCenter = containerHeight / 2;
                const scrollToTop = elementCenter - containerCenter;
                songListUl.scrollTo({ top: scrollToTop, behavior: 'smooth' });
            }
        }
    });
    closeModalBtn.addEventListener('click', () => playlistModal.classList.remove('show'));
    
    // (修改) 关联 `handleSongEnd`
    prevBtn.addEventListener('click', playPrev);
    nextBtn.addEventListener('click', handleNextClick);
    audio.addEventListener('ended', handleSongEnd);
    mvPlayer.addEventListener('ended', handleSongEnd); // (新增) MV 结束时也调用
    repeatBtn.addEventListener('click', cyclePlayMode);
    favoriteBtn.addEventListener('click', toggleFavorite);

    // (修改) 总时长显示
    audio.onloadedmetadata = () => {
        if (!isMvMode) totalTimeEl.textContent = formatTime(audio.duration);
        updateVolumeUI();
    };
    mvPlayer.onloadedmetadata = () => { // (新增)
        if (isMvMode) totalTimeEl.textContent = formatTime(mvPlayer.duration);
    };

    // ... (点击外部关闭播放列表 保持不变) ...
    document.addEventListener('click', (event) => {
        if (playlistModal.classList.contains('show')) {
            const isClickOnButton = playlistBtn.contains(event.target) || playlistBtn === event.target;
            const isClickInModal = playlistModal.contains(event.target);
            if (!isClickOnButton && !isClickInModal) {
                playlistModal.classList.remove('show');
            }
        }
    });

    // ===============================================
    // --- 7.5. 音量控制 (已修改) ---
    // ===============================================

    /**
     * (修改) 音量滑块改变 (同时控制 Audio 和 MV)
     */
    function handleVolumeChange() {
        const value = volumeSlider.value / 100;
        audio.volume = value;
        mvPlayer.volume = value; // (新增)
        
        audio.muted = (value === 0);
        // (MV 的 Mute 由 toggleMvMode 控制)
    }

    /**
     * (修改) 点击静音 (同时控制 Audio 和 MV)
     */
    function toggleMute() {
        if (audio.muted) {
            audio.muted = false;
            const newVol = (lastVolume > 0) ? lastVolume : 1;
            audio.volume = newVol;
            mvPlayer.volume = newVol; // (新增)
        } else {
            lastVolume = audio.volume; // 保存当前音量
            audio.muted = true;
            audio.volume = 0;
            mvPlayer.volume = 0; // (新增)
        }
    }

    /**
     * (修改) 更新音量 UI (始终以 Audio 元素为准)
     */
    function updateVolumeUI() {
        // UI 始终跟随 audio 元素的状态
        const volume = audio.muted ? 0 : audio.volume;
        
        if (!audio.muted && volume > 0) {
            lastVolume = volume; 
        }
        
        volumeSlider.value = volume * 100;
        volumeSlider.style.background = `linear-gradient(to right, var(--progress-bar-fill) ${volume * 100}%, var(--progress-bar-bg) ${volume * 100}%)`;

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

    // ... (音量监听 保持不变) ...
    volumeSlider.addEventListener('input', handleVolumeChange);
    volumeBtn.addEventListener('click', toggleMute);
    audio.addEventListener('volumechange', updateVolumeUI);

    // ===============================================
    // --- 7.8. MV 控制 (已修改) ---
    // ===============================================

    /**
     * (修改) 切换 MV 模式 (核心逻辑)
     */
    function toggleMvMode() {
        const oldMvMode = isMvMode; // 记录切换前的状态
        isMvMode = !isMvMode; // 切换状态
        const currentSong = playlistData.find(s => s.id === currentSongId);

        if (isMvMode && currentSong && currentSong.mv) {
            // [ 1. 进入 MV 模式 ]
            if (oldMvMode) return; // 防止重复进入

            // 1. 暂停音频
            audio.pause();

            // 2. 更新 UI
            playerCard.classList.add('mv-mode'); 
            mvBtn.classList.add('active');
            mvIcon.src = 'icon/24gl-musicAlbum.png'; // (新增) 切换为音乐图标

            // 3. 准备视频 (使用 MV 音频)
            mvPlayer.muted = false; 
            mvPlayer.volume = audio.volume; // 同步音量
            mvPlayer.currentTime = 0; // (新增) 从头播放
            audio.currentTime = 0;    // (新增) 保持音频同步

            // 4. 更新总时长
            if (mvPlayer.readyState >= 1) { // 检查是否已加载
                 totalTimeEl.textContent = formatTime(mvPlayer.duration);
            } else {
                 mvPlayer.onloadedmetadata = () => { totalTimeEl.textContent = formatTime(mvPlayer.duration); };
            }
            
            // 5. 如果用户意图是 "播放", 则播放 MV
            if (isPlaying) {
                mvPlayer.play();
            }

        } else {
            // [ 2. 退出 MV 模式 ]
            if (!oldMvMode) return; // 防止重复退出

            // 1. 暂停视频
            mvPlayer.pause();

            // 2. 更新 UI
            playerCard.classList.remove('mv-mode'); 
            mvBtn.classList.remove('active');
            mvIcon.src = 'icon/24gl-mv.png'; // (新增) 切换回 MV 图标
            
            // 3. 准备音频
            mvPlayer.muted = true; // 静音 MV
            audio.currentTime = mvPlayer.currentTime; // (修改) 同步回 MV 的时间
            // (修改) 根据需求4，切换时重置为0
            audio.currentTime = 0;
            mvPlayer.currentTime = 0;
            
            // 4. 更新总时长
            if (audio.readyState >= 1) {
                 totalTimeEl.textContent = formatTime(audio.duration);
            } else {
                 audio.onloadedmetadata = () => { totalTimeEl.textContent = formatTime(audio.duration); };
            }

            // 5. 如果用户意图是 "播放", 则播放音频
            if (isPlaying) {
                audio.play();
            }
            
            isMvMode = false; // 确保状态为 false
        }
    }

    // ... (MV 按钮点击 保持不变) ...
    mvBtn.addEventListener('click', toggleMvMode);

    // (修改) 移除 MV 缓冲时的音频暂停 (因为现在 MV 是唯一的声源)
    mvPlayer.addEventListener('waiting', () => {
        // if (isMvMode && isPlaying) {
        //     audio.pause(); // (移除)
        // }
    });
    mvPlayer.addEventListener('canplay', () => {
        // if (isMvMode && isPlaying && !audio.paused) {
        //     audio.play(); // (移除)
        // }
    });

    // ===============================================
    // --- 8. 音频频谱 ---
    // ===============================================
    
    // ... (频谱 保持不变) ...
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
        if (!isPlaying) { // (修改) 依赖 isPlaying 全局状态
            visualizerBars.forEach(b => {
                b.style.height = '5%';
                b.style.opacity = 1;
                b.style.background = 'var(--progress-bar-bg)'; 
            });
            if(particleContainer) {
                 particleContainer.style.setProperty('--audio-pulse', 0);
            }
            return;
        }
        analyser.getByteFrequencyData(dataArray);
        let bassSum = 0;
        const bassBins = 8;
        for (let i = 0; i < bassBins; i++) {
            bassSum += dataArray[i];
        }
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
            bar.style.opacity = 0.3 + (lastHeights[i] / 150);
            if (currentHeight > 60) bar.style.background = 'var(--c-salmon)';
            else if (currentHeight > 10) bar.style.background = 'var(--progress-bar-bg1)';
            else bar.style.background = 'var(--progress-bar-bg1)';
        });
        if (particleContainer) {
            let pulse = average / 255; 
            pulse = Math.pow(pulse, 3);
            pulse = Math.min(1.0, pulse * 1.5);
            particleContainer.style.setProperty('--audio-pulse', pulse);
        }
    }

    // (修改) 键盘快捷键 (支持 MV/Audio)
    document.addEventListener('keydown', (e) => {
        if (document.activeElement === volumeSlider && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
            return; 
        }
        switch(e.code) {
            case 'Space': 
                e.preventDefault();
                playPauseBtn.click(); // (修改) 已更新 playPauseBtn 逻辑
                break;
            case 'ArrowRight':
                e.preventDefault();
                // (修改) 自动快进当前活动播放器
                if (isMvMode) {
                    if (mvPlayer.duration) {
                        const newTime = Math.min(mvPlayer.duration, mvPlayer.currentTime + 5);
                        mvPlayer.currentTime = newTime;
                        updateUI(newTime);
                    }
                } else {
                    if (audio.duration) {
                        const newTime = Math.min(audio.duration, audio.currentTime + 5);
                        audio.currentTime = newTime;
                        updateUI(newTime);
                    }
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                // (修改) 自动快退当前活动播放器
                if (isMvMode) {
                    if (mvPlayer.duration) {
                        const newTime = Math.max(0, mvPlayer.currentTime - 5);
                        mvPlayer.currentTime = newTime;
                        updateUI(newTime);
                    }
                } else {
                    if (audio.duration) {
                        const newTime = Math.max(0, audio.currentTime - 5);
                        audio.currentTime = newTime;
                        updateUI(newTime);
                    }
                }
                break;
            
            // (音量键保持不变，它们控制 audio 元素，而 UI 和 MV 会跟随 audio)
            case 'ArrowUp':
                e.preventDefault();
                const newVolUp = Math.min(1, audio.volume + 0.1);
                audio.volume = newVolUp;
                audio.muted = false;
                break;
            case 'ArrowDown':
                e.preventDefault();
                const newVolDown = Math.max(0, audio.volume - 0.1);
                audio.volume = newVolDown;
                break;
            case 'KeyM':
                toggleMute();
                break;
        }
    });

    // ===============================================
    // --- 9. 启动特效 (已修改) ---
    // ===============================================
    
    // ... (流星, 粒子, 雪花 保持不变) ...
    const starsContainer = document.querySelector('.shooting-stars-container');
    if(starsContainer) {
        for(let i=0; i<100; i++) {
            const s = document.createElement('div');
            s.className = 'shooting-star';
            s.style.left = Math.random()*100 + '%';
            s.style.top = Math.random()*100 + '%';
            s.style.animationDelay = Math.random()*5 + 's';
            s.style.animationDuration = (5+Math.random()*5) + 's';
            starsContainer.appendChild(s);
        }
    }
    const particleContainer = document.querySelector('.card-particle-overlay');
    if (particleContainer) {
        const particleColors = [
            'rgba(245, 218, 223, 0.4)', 'rgba(175, 125, 172, 0.4)',
            'rgba(242, 146, 110, 0.5)', 'rgba(255, 255, 255, 0.3)'
        ];
        const particleCount = 400; 
        for (let i = 0; i < particleCount; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'card-particle-wrapper';
            const particle = document.createElement('div');
            particle.className = 'card-particle';
            const randomColor = particleColors[Math.floor(Math.random() * particleColors.length)];
            particle.style.background = randomColor;
            wrapper.style.top = Math.random() * 100 + '%';
            wrapper.style.left = Math.random() * 100 + '%';
            wrapper.style.animationDelay = (Math.random() * 15) + 's';
            const dx = (Math.random() - 0.5) * 200; 
            const dy = (Math.random() - 0.5) * 200; 
            wrapper.style.setProperty('--dx', `${dx}px`);
            wrapper.style.setProperty('--dy', `${dy}px`);
            const scale = 0.5 + Math.random() * 0.5;
            particle.style.width = `${Math.floor(scale * 4)}px`;
            particle.style.height = `${Math.floor(scale * 4)}px`;
            wrapper.appendChild(particle);
            particleContainer.appendChild(wrapper);
        }
    }
    const snowflakeCanvas = document.getElementById('snowflake-canvas');
    let snowflakeThrottleTimer = null;
    function spawnSnowflake(x, y) {
        if (!snowflakeCanvas) return;
        const flake = document.createElement('div');
        flake.className = 'mouse-snowflake';
        flake.style.left = x + 'px';
        flake.style.top = y + 'px';
        const driftX = Math.random() * 80 - 40;
        const driftY = Math.random() * 50 + 100;
        flake.style.setProperty('--drift-x', `${driftX}px`);
        flake.style.setProperty('--drift-y', `${driftY}px`);
        snowflakeCanvas.appendChild(flake);
        setTimeout(() => {
            flake.remove();
        }, 2000);
    }

    // (修改) 鼠标移动监听 (移除了 3D 特效)
    document.body.addEventListener('mousemove', (e) => {
        const currentMouseX = e.clientX;
        const currentMouseY = e.clientY;

        if (!snowflakeThrottleTimer) {
            snowflakeThrottleTimer = setTimeout(() => {
                spawnSnowflake(currentMouseX, currentMouseY);
                snowflakeThrottleTimer = null;
            }, 2);
        }

        if(window.innerWidth > 768) {
            let x = (window.innerWidth/2 - e.pageX) / 200;
            let y = (window.innerHeight/2 - e.pageY) / 200;
            playerCard.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
        

            const rect = playerCard.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            playerCard.style.setProperty('--mouse-x', `${mouseX}px`);
            playerCard.style.setProperty('--mouse-y', `${mouseY}px`);
        }
    });

    // ... (波纹 保持不变) ...
    function applyRippleEffect() {
        const rippleElements = document.querySelectorAll(
            '.btn, .playlist-song-list li, .nav-capsule a'
        );
        rippleElements.forEach(el => {
            el.addEventListener('click', function(e) {
                const rect = el.getBoundingClientRect();
                const rippleX = e.clientX - rect.left;
                const rippleY = e.clientY - rect.top;
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                ripple.style.left = rippleX + 'px';
                ripple.style.top = rippleY + 'px';
                const oldRipple = el.querySelector('.ripple');
                if (oldRipple) {
                    oldRipple.remove();
                }
                el.appendChild(ripple);
                ripple.addEventListener('animationend', () => {
                    ripple.remove();
                });
            });
        });
    }

    // ===============================================
    // --- 10. 动态导航栏 ---
    // ===============================================
    
    // ... (导航栏 保持不变) ...
    function initNavPill() {
        const navCapsule = document.querySelector('.nav-capsule');
        const navPill = document.querySelector('.nav-pill');
        const navLinks = document.querySelectorAll('.nav-capsule a');
        if (!navCapsule || !navPill || navLinks.length === 0) return;
        function movePill(targetLink) {
            if (!targetLink) return;
            const targetRect = targetLink.getBoundingClientRect();
            const capsuleRect = navCapsule.getBoundingClientRect();
            const capsulePaddingLeft = parseFloat(getComputedStyle(navCapsule).paddingLeft);
            const translateX = (targetRect.left - capsuleRect.left) - capsulePaddingLeft;
            navPill.style.width = targetRect.width + 'px';
            navPill.style.transform = `translateX(${translateX}px)`; 
            navLinks.forEach(link => link.classList.remove('active'));
            targetLink.classList.add('active');
        }
        const activeLink = document.querySelector('.nav-capsule a.active');
        if (activeLink) {
            setTimeout(() => {
                movePill(activeLink);
                navPill.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 100);
            navPill.style.transition = 'none';
        }
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                movePill(e.currentTarget);
            });
        });
    }

   // 启动
    loadFavoritesFromStorage();
    loadAllSongs();
    applyRippleEffect();
    initNavPill();
});