document.addEventListener('DOMContentLoaded', async () => {

    // ===============================================
    // --- 1. 核心配置区 ---
    // ===============================================
    // (保持不变)

    // ===============================================
    // --- 2. 全局变量与元素获取 ---
    // ===============================================
    let playlistData = []; 
    let currentSongId = 0;
    
    let isPlaying = false; 
    let isSeeking = false; 
    let isUserScrolling = false;
    let scrollTimeout = null;
    let lastVolume = 1;
    let playMode = 'loop';
    let lyricsData = []; 
    let currentLyricDataIndex = -1; 
    let draggedItemId = null; 

    // === (新增) Iframe 通信变量 ===
    const IS_IN_IFRAME = (window.self !== window.top);
    const parentOrigin = '*'; // 为安全起见, 生产环境应设为父页面的域名

    // ... (DOM 元素获取保持不变) ...
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
    let isMvMode = false;
    const colorThief = new ColorThief();

    // === (不变) 1. 加载已保存的音量 ===
    const savedVolume = localStorage.getItem('playerVolume');
    if (savedVolume !== null) {
        const volumeValue = parseFloat(savedVolume);
        audio.volume = volumeValue;
        mvPlayer.volume = volumeValue;
        audio.muted = (volumeValue === 0);
        lastVolume = volumeValue > 0 ? volumeValue : 1;
    }

    // ===============================================
    // --- (不变) 10. Iframe 通信 (核心) ---
    // ===============================================

    /**
     * (不变) 向父窗口广播完整的播放器状态
     */
    function broadcastFullState() {
        if (!IS_IN_IFRAME) return;

        const song = playlistData.find(s => s.id === currentSongId);
        const duration = isMvMode ? (mvPlayer.duration || 0) : (audio.duration || 0);
        const currentTime = isMvMode ? (mvPlayer.currentTime || 0) : (audio.currentTime || 0);

        const state = {
            type: 'playerStateUpdate',
            // (修改) 发送 song.id 和 album
            song: song ? { id: song.id, title: song.title, artist: song.artist, cover: song.cover, album: song.album } : null,
            isPlaying: isPlaying,
            currentTime: isNaN(currentTime) ? 0 : currentTime,
            duration: isNaN(duration) ? 0 : duration,
            volume: audio.volume,
            isMuted: audio.muted,
            playMode: playMode,
            isFavorite: favoriteSongIds.includes(currentSongId)
        };
        window.parent.postMessage(state, parentOrigin);
    }
    
    // ===============================================
    // --- 3. 自动加载系统 (已修改) ---
    // ===============================================
    
    /* --- music-player.js --- */

    async function loadAllSongs() {
        console.log("开始加载歌曲 (New V2 Logic)...");
        
        try {
            // 1. 请求新的 playlist.json (现在是完整的对象数组)
            const response = await fetch('playlist.json');
            if (!response.ok) throw new Error('playlist.json 加载失败。');
            const songsData = await response.json();

            playlistData = []; 

            // 2. 遍历数据
            for (let i = 0; i < songsData.length; i++) {
                const song = songsData[i];
                
                // 3. 单独加载歌词 (因为 build-playlist.js 没有把歌词文本放进 json)
                let lrcText = "";
                if (song.folder) {
                    try {
                        const lrcRes = await fetch(`songs/${song.folder}/lyrics.lrc`);
                        if (lrcRes.ok) lrcText = await lrcRes.text();
                    } catch (e) { 
                        // 歌词加载失败不影响播放
                    }
                }

                // 4. 构建播放器需要的对象
                playlistData.push({
                    id: song.id, // 直接使用 json 里的 id
                    title: song.title,
                    artist: song.artist,
                    album: song.album || song.title,
                    src: song.src,   // 直接使用 json 里的路径
                    cover: song.cover, // 直接使用 json 里的路径
                    lrc: lrcText,
                    mv: song.mv      // 直接使用 json 里的路径 (或者是 null)
                });
            }

            // 处理保存的排序
            const savedOrder = localStorage.getItem('playerPlaylistOrder');
            if (savedOrder) {
                try {
                    const orderedIds = JSON.parse(savedOrder);
                    // 简单的排序恢复逻辑
                    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
                    // 分离出在排序列表中的和不在的
                    const sorted = [];
                    const unsorted = [];
                    
                    playlistData.forEach(song => {
                        if (orderMap.has(song.id)) sorted.push(song);
                        else unsorted.push(song);
                    });
                    
                    sorted.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));
                    playlistData = [...sorted, ...unsorted];
                    
                    console.log("成功恢复播放列表顺序。");
                } catch (e) {
                    console.warn("恢复顺序失败，使用默认顺序。", e);
                }
            }

            console.log(`成功加载 ${playlistData.length} 首歌曲`);
            
            // 如果有歌，加载第一首
            if (playlistData.length > 0) {
                // 默认加载第一首但不自动播放，等待用户操作
                // 注意：这里传入 false 防止自动播放，除非父页面发指令
                loadSongToPlayer(playlistData[0].id, false); 
                renderPlaylist();
            }

            // === 关键：通知父页面 Iframe 准备好了 ===
            if (IS_IN_IFRAME) {
                console.log('[IFRAME] 播放列表加载完毕。发送 playerReady。');
                window.parent.postMessage({ type: 'playerReady' }, parentOrigin);
            }

        } catch (e) {
            console.error("播放器加载严重错误:", e);
            titleElement.innerHTML = "加载失败";
            artistElement.textContent = "请检查控制台日志";
        }
    }

    // ===============================================
    // --- 4. 核心播放逻辑 (已修改) ---
    // ===============================================
    
    // (新增) 获取最近播放
    function getRecentlyPlayed() {
        try {
            const recent = localStorage.getItem('recentlyPlayed');
            return recent ? JSON.parse(recent) : [];
        } catch (e) {
            return [];
        }
    }

    // (新增) 保存最近播放
    function saveToRecentlyPlayed(songId) {
        let recent = getRecentlyPlayed();
        // 1. 移除已存在的 (防止重复)
        recent = recent.filter(id => id !== songId);
        // 2. 添加到最前面
        recent.unshift(songId);
        // 3. 限制列表长度 (例如 50 首)
        if (recent.length > 50) {
            recent = recent.slice(0, 50);
        }
        // 4. 保存
        localStorage.setItem('recentlyPlayed', JSON.stringify(recent));
    }


    function loadSongToPlayer(id, autoPlay = true) {
        const song = playlistData.find(s => s.id === id);
        if (!song) {
            console.warn(`歌曲 ID ${id} 未在 playlistData 中找到。`);
            return;
        }

        currentSongId = song.id;
        
        // (新增) 记录播放
        if (autoPlay) {
            saveToRecentlyPlayed(currentSongId);
            // (新增) 通知父级历史记录已更改
            if (IS_IN_IFRAME) {
                window.parent.postMessage({ type: 'historyChanged', songId: id }, parentOrigin);
            }
        }

        // ... (其余 loadSongToPlayer 的代码保持不变) ...
        audio.crossOrigin = "anonymous";
        
        if (!isMvMode) {
             if (audio.src !== new URL(song.src, document.baseURI).href) {
                audio.src = song.src;
            }
        } else {
            audio.src = song.src;
        }
        const infoElements = [titleElement, artistElement, albumTitleElement];
        infoElements.forEach(el => { if (el) el.classList.add('fade-out'); });
        setTimeout(() => {
            titleElement.innerHTML = `${song.title} <span class="tag-quality">Hi-Res</span>`;
            artistElement.textContent = song.artist;
            if (albumTitleElement) albumTitleElement.textContent = song.album;
            infoElements.forEach(el => { if (el) el.classList.remove('fade-out'); });
        }, 300);
        if (albumArtElement) {
            albumArtElement.style.opacity = 0;
            albumArtElement.src = song.cover;
            albumArtElement.crossOrigin = "Anonymous"; 
            updateBackgroundTheme(albumArtElement);
            setTimeout(() => albumArtElement.style.opacity = 1, 300);
        }
        isPlaying = autoPlay; 
        if (song.mv) {
            mvBtn.style.display = 'flex';
            if (mvPlayer.src !== new URL(song.mv, document.baseURI).href) {
                mvPlayer.src = song.mv;
            }
        } else {
            mvBtn.style.display = 'none';
            mvPlayer.src = '';
            if (isMvMode) {
                toggleMvMode(); 
            }
        }
        renderLyrics(song.lrc);
        renderPlaylist(); // 更新此处的播放列表
        if (autoPlay) {
            if (!isAudioContextSetup) setupAudioContext();
            if (isMvMode && song.mv) {
                mvPlayer.muted = false;
                mvPlayer.volume = audio.volume;
                mvPlayer.play().catch(console.warn);
            } else {
                audio.play().catch(console.warn);
            }
        }
        updatePlayPauseIcon();
        updateFavoriteButtonUI(currentSongId);

        broadcastFullState();
    }
    
    // ... (playNext, playPrev 等函数保持不变) ...
    function playNext() {
        const currentIndex = playlistData.findIndex(s => s.id === currentSongId);
        let newIndex = (currentIndex + 1) % playlistData.length;
        if (currentIndex === -1) newIndex = 0;
        const nextSong = playlistData[newIndex];
        loadSongToPlayer(nextSong.id, true);
    }
    function playPrev() {
        const currentIndex = playlistData.findIndex(s => s.id === currentSongId);
        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = playlistData.length - 1;
        if (currentIndex === -1) newIndex = 0;
        const prevSong = playlistData[newIndex];
        loadSongToPlayer(prevSong.id, true);
    }

    // ===============================================
    // --- 4.5. 播放模式逻辑 (已修改) ---
    // ... (所有播放模式、收藏、背景等函数保持不变) ...
    // ===============================================
    function cyclePlayMode() {
        if (playMode === 'loop') playMode = 'one';
        else if (playMode === 'one') playMode = 'shuffle';
        else playMode = 'loop';
        updateRepeatButtonUI();
    }
    function updateRepeatButtonUI() {
        switch(playMode) {
            case 'one': repeatIcon.src = 'icon/24gl-repeatOnce2.png'; break;
            case 'shuffle': repeatIcon.src = 'icon/24gl-repeat2.png'; break;
            default: repeatIcon.src = 'icon/24gl-shuffle.png'; break;
        }
        broadcastFullState();
    }
    function playShuffle() {
        if (playlistData.length <= 1) { playNext(); return; }
        let newId;
        do { newId = playlistData[Math.floor(Math.random() * playlistData.length)].id; } 
        while (newId === currentSongId);
        loadSongToPlayer(newId, true);
    }
    function handleSongEnd() {
        switch(playMode) {
            case 'one':
                if (isMvMode) { mvPlayer.currentTime = 0; mvPlayer.play(); }
                else { audio.currentTime = 0; audio.play(); }
                break;
            case 'shuffle': playShuffle(); break;
            default: playNext(); break;
        }
    }
    function handleNextClick() {
        if (playMode === 'shuffle') playShuffle();
        else playNext();
    }
    function saveFavoritesToStorage() {
        localStorage.setItem('myFavoriteSongs', JSON.stringify(favoriteSongIds));
    }
    function loadFavoritesFromStorage() {
        const storedFavorites = localStorage.getItem('myFavoriteSongs');
        if (storedFavorites) favoriteSongIds = JSON.parse(storedFavorites);
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
        broadcastFullState();
    }
    
    // (已修改) 收藏
    function toggleFavorite() {
        const songId = currentSongId;
        const index = favoriteSongIds.indexOf(songId);
        if (index > -1) favoriteSongIds.splice(index, 1);
        else favoriteSongIds.push(songId);
        
        saveFavoritesToStorage();
        updateFavoriteButtonUI(songId);
        
        // (新增) 通知父级收藏已更改
        if (IS_IN_IFRAME) {
            window.parent.postMessage({ type: 'favoritesChanged' }, parentOrigin);
        }
    }
    
    function updateBackgroundTheme(imgElement) {
        if (imgElement.complete) applyBackground(imgElement);
        else imgElement.addEventListener('load', () => applyBackground(imgElement), { once: true });
    }
    function applyBackground(img) {
        try {
            const color = colorThief.getColor(img); 
            const rgbStr = color.join(',');
            document.body.style.backgroundImage = `radial-gradient(ellipse at 50% 0%, rgba(${rgbStr}, 0.6) 0%, rgba(1, 18, 48, 0.9) 80%), url('${img.src}')`;
            document.querySelector('.ambient-light.one').style.background = `rgb(${rgbStr})`;
            document.querySelector('.ambient-light.two').style.background = `rgba(${rgbStr}, 0.6)`;
            if(vinylSheen) vinylSheen.style.background = `radial-gradient(ellipse at center, rgba(${rgbStr}, 0.8) 0%, rgba(${rgbStr}, 0) 70%)`;
        } catch (e) { /* 错误处理 */ }
    }

    // ===============================================
    // --- 6. LRC 歌词解析与渲染 (不变) ---
    // ... (所有歌词解析、渲染、timeupdate 监听器等保持不变) ...
    // ===============================================
    function parseLrc(lrcText) {
        if (!lrcText) return [];
        const lines = lrcText.split('\n');
        const result = [];
        const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
        lines.forEach(line => {
            const match = timeReg.exec(line);
            if (match) {
                const time = parseInt(match[1]) * 60 + parseInt(match[2]) + (parseInt(match[3]) / (match[3].length === 3 ? 1000 : 100));
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
                if (isMvMode) { mvPlayer.currentTime = item.time; if (!isPlaying) mvPlayer.play(); }
                else { audio.currentTime = item.time; if (!isPlaying) audio.play(); }
                if (!isPlaying) { isPlaying = true; updatePlayPauseIcon(); }
                updateUI(item.time);
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
            if (dist === 0) { scale = 1.2; opacity = 1; el.classList.add('active'); }
            else if (Math.abs(dist) <= 4) { scale = 1 - Math.abs(dist) * 0.15; opacity = 1 - Math.abs(dist) * 0.2; el.classList.remove('active'); }
            else { opacity = 0; translate = dist * 60; el.classList.remove('active'); }
            el.style.transform = `translateY(calc(-50% + ${translate}px)) rotateZ(${rotate}deg) scale(${scale})`;
            el.style.opacity = opacity;
            el.style.pointerEvents = opacity > 0 ? 'auto' : 'none';
        });
    }
    audio.addEventListener('timeupdate', () => {
        const currentTime = audio.currentTime;
        if (isMvMode || isSeeking) return;
        updateUI(currentTime);
        if (IS_IN_IFRAME) {
            window.parent.postMessage({ type: 'timeUpdate', currentTime: currentTime }, parentOrigin);
        }
        if (!isUserScrolling) {
            let idx = -1;
            for (let i = 0; i < lyricsData.length; i++) {
                if (currentTime >= lyricsData[i].time) idx = i; else break;
            }
            if (idx !== -1 && idx !== currentLyricDataIndex) {
                currentLyricDataIndex = idx;
                render3DLyrics(currentLyricDataIndex);
            }
        }
    });
    mvPlayer.addEventListener('timeupdate', () => {
        const currentTime = mvPlayer.currentTime;
        if (!isMvMode || isSeeking) return;
        updateUI(currentTime);
        if (IS_IN_IFRAME) {
            window.parent.postMessage({ type: 'timeUpdate', currentTime: currentTime }, parentOrigin);
        }
        if (!isUserScrolling) {
            let idx = -1;
            for (let i = 0; i < lyricsData.length; i++) {
                if (currentTime >= lyricsData[i].time) idx = i; else break;
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
            const currentTime = isMvMode ? mvPlayer.currentTime : audio.currentTime;
            let realIdx = -1;
            for (let i = 0; i < lyricsData.length; i++) {
                if (currentTime >= lyricsData[i].time) realIdx = i; else break;
            }
            if(realIdx !== -1) render3DLyrics(realIdx);
        }, 3000);
    }, { passive: false });


    // ===============================================
    // --- 7. 基础 UI 控制 (不变) ---
    // ... (所有 UI 控制、播放列表拖拽、音量、MV、频谱、特效、快捷键等函数保持不变) ...
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
        const playingBars = document.querySelectorAll('.playing-bar');
        if (playingBars.length) {
            const animationState = isPlaying ? 'running' : 'paused';
            playingBars.forEach(bar => {
                bar.style.animationPlayState = animationState;
            });
        }
        broadcastFullState();
    }
    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            isPlaying = false;
            if (isMvMode) mvPlayer.pause();
            else audio.pause();
        } else {
            isPlaying = true;
            if (isMvMode) mvPlayer.play();
            else { if(!isAudioContextSetup) setupAudioContext(); audio.play(); }
        }
        updatePlayPauseIcon();
    });
    function updateUI(time) {
        const duration = isMvMode ? mvPlayer.duration : audio.duration;
        if (duration) progressBar.style.width = `${(time / duration) * 100}%`;
        currentTimeEl.textContent = formatTime(time);
    }
    function formatTime(s) {
        if (isNaN(s) || s < 0) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0'+sec : sec}`;
    }
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
    function handleSeek(e, apply = true) {
        const rect = progressBarContainer.getBoundingClientRect();
        let pct = (e.clientX - rect.left) / rect.width;
        pct = Math.min(1, Math.max(0, pct));
        const duration = isMvMode ? mvPlayer.duration : audio.duration;
        const time = pct * duration;
        if(apply) {
            if (isMvMode) mvPlayer.currentTime = time;
            else audio.currentTime = time;
        }
        updateUI(time);
    }
    
    function renderPlaylist() {
        songListUl.innerHTML = ''; 
        playlistData.forEach(song => {
            const li = document.createElement('li');
            let playingIndicator = ''; 
            if (song.id === currentSongId) {
                li.classList.add('playing'); 
                playingIndicator = `
                    <div class="playing-icon-container">
                        <span class="playing-bar"></span>
                        <span class="playing-bar"></span>
                        <span class="playing-bar"></span>
                    </div>
                `;
            }
            const animationState = (song.id === currentSongId && isPlaying) ? 'running' : 'paused';
            li.innerHTML = `
                <div class="song-title-wrapper">
                    <span class="song-item-title">${song.title}</span>
                    ${playingIndicator}
                </div>
                <span class="song-item-artist">${song.artist}</span>
            `;
            if (song.id === currentSongId) {
                 li.querySelectorAll('.playing-bar').forEach(bar => {
                    bar.style.animationPlayState = animationState;
                });
            }
            li.addEventListener('click', () => loadSongToPlayer(song.id, true));
            li.draggable = true;
            li.dataset.songId = song.id; 
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('dragleave', handleDragLeave);
            li.addEventListener('drop', handleDrop);
            li.addEventListener('dragend', handleDragEnd);
            songListUl.appendChild(li);
        });
    }
    function handleDragStart(e) {
        draggedItemId = parseInt(e.currentTarget.dataset.songId);
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('dragging');
    }
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
    }
    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }
    function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const droppedOnId = parseInt(e.currentTarget.dataset.songId);
        if (draggedItemId === droppedOnId) return;
        const draggedIndex = playlistData.findIndex(s => s.id === draggedItemId);
        const targetIndex = playlistData.findIndex(s => s.id === droppedOnId);
        if (draggedIndex === -1 || targetIndex === -1) return;
        const [draggedItem] = playlistData.splice(draggedIndex, 1);
        const newTargetIndex = playlistData.findIndex(s => s.id === droppedOnId);
        if (draggedIndex < newTargetIndex) playlistData.splice(newTargetIndex + 1, 0, draggedItem);
        else playlistData.splice(newTargetIndex, 0, draggedItem);
        const newOrder = playlistData.map(song => song.id);
        localStorage.setItem('playerPlaylistOrder', JSON.stringify(newOrder));
        console.log("播放列表顺序已保存。");
        renderPlaylist();
    }
    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        draggedItemId = null;
        document.querySelectorAll('.playlist-song-list li.drag-over').forEach(li => {
            li.classList.remove('drag-over');
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
    prevBtn.addEventListener('click', playPrev);
    nextBtn.addEventListener('click', handleNextClick);
    audio.addEventListener('ended', handleSongEnd);
    mvPlayer.addEventListener('ended', handleSongEnd);
    repeatBtn.addEventListener('click', cyclePlayMode);
    favoriteBtn.addEventListener('click', toggleFavorite);
    audio.onloadedmetadata = () => {
        if (!isMvMode) totalTimeEl.textContent = formatTime(audio.duration);
        updateVolumeUI(); 
        broadcastFullState();
    };
    mvPlayer.onloadedmetadata = () => {
        if (isMvMode) totalTimeEl.textContent = formatTime(mvPlayer.duration);
        broadcastFullState();
    };
    document.addEventListener('click', (event) => {
        if (playlistModal.classList.contains('show')) {
            const isClickOnButton = playlistBtn.contains(event.target) || playlistBtn === event.target;
            const isClickInModal = playlistModal.contains(event.target);
            if (!isClickOnButton && !isClickInModal) playlistModal.classList.remove('show');
        }
    });

    function handleVolumeChange() {
        const value = volumeSlider.value / 100;
        audio.volume = value;
        mvPlayer.volume = value;
        audio.muted = (value === 0);
        localStorage.setItem('playerVolume', value);
    }
    function toggleMute() {
        let newVolume;
        if (audio.muted) {
            newVolume = (lastVolume > 0) ? lastVolume : 1;
            audio.muted = false;
            audio.volume = newVolume;
            mvPlayer.volume = newVolume;
        } else {
            lastVolume = audio.volume; 
            newVolume = 0;
            audio.muted = true;
            audio.volume = newVolume;
            mvPlayer.volume = newVolume;
        }
        localStorage.setItem('playerVolume', newVolume);
    }
    function updateVolumeUI() {
        const volume = audio.muted ? 0 : audio.volume;
        if (!audio.muted && volume > 0) lastVolume = volume;
        volumeSlider.value = volume * 100;
        volumeSlider.style.background = `linear-gradient(to right, var(--progress-bar-fill) ${volume * 100}%, var(--progress-bar-bg) ${volume * 100}%)`;
        if (volume === 0) volumeIcon.src = 'icon/24gl-volumeCross.png';
        else if (volume < 0.33) volumeIcon.src = 'icon/24gl-volumeLow.png';
        else if (volume < 0.66) volumeIcon.src = 'icon/24gl-volumeMiddle.png';
        else volumeIcon.src = 'icon/24gl-volumeHigh.png';
        broadcastFullState();
    }
    volumeSlider.addEventListener('input', handleVolumeChange);
    volumeBtn.addEventListener('click', toggleMute);
    audio.addEventListener('volumechange', updateVolumeUI);

    function toggleMvMode() {
        const oldMvMode = isMvMode;
        isMvMode = !isMvMode;
        const currentSong = playlistData.find(s => s.id === currentSongId);
        if (isMvMode && currentSong && currentSong.mv) {
            if (oldMvMode) return;
            audio.pause();
            playerCard.classList.add('mv-mode'); 
            mvBtn.classList.add('active');
            mvIcon.src = 'icon/24gl-musicAlbum.png';
            mvPlayer.muted = false; 
            mvPlayer.volume = audio.volume;
            mvPlayer.currentTime = 0;
            audio.currentTime = 0;
            if (mvPlayer.readyState >= 1) totalTimeEl.textContent = formatTime(mvPlayer.duration);
            else mvPlayer.onloadedmetadata = () => { totalTimeEl.textContent = formatTime(mvPlayer.duration); };
            if (isPlaying) mvPlayer.play();
        } else {
            if (!oldMvMode) return;
            mvPlayer.pause();
            playerCard.classList.remove('mv-mode'); 
            mvBtn.classList.remove('active');
            mvIcon.src = 'icon/24gl-mv.png';
            mvPlayer.muted = true;
            audio.currentTime = 0;
            mvPlayer.currentTime = 0;
            if (audio.readyState >= 1) totalTimeEl.textContent = formatTime(audio.duration);
            else audio.onloadedmetadata = () => { totalTimeEl.textContent = formatTime(audio.duration); };
            if (isPlaying) audio.play();
            isMvMode = false;
        }
    }
    mvBtn.addEventListener('click', toggleMvMode);
    mvPlayer.addEventListener('waiting', () => {});
    mvPlayer.addEventListener('canplay', () => {});

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
            if (audioContext.state === 'suspended') audioContext.resume();
        } catch(e) { console.log("Web Audio Init Failed:", e); }
    }
    // music-player.js - 修改 renderVisualizer 函数
    function renderVisualizer() {
        requestAnimationFrame(renderVisualizer);
        
        // 如果未播放，重置状态并通知主页归零
        if (!isPlaying) {
            visualizerBars.forEach(b => {
                b.style.height = '5%'; b.style.opacity = 1;
                b.style.background = 'var(--progress-bar-bg)'; 
            });
            if(particleContainer) particleContainer.style.setProperty('--audio-pulse', 0);
            
            // [新增] 通知主页音乐停止，亮度归零
            if (IS_IN_IFRAME) {
                window.parent.postMessage({ type: 'audioVisualizerData', amplitude: 0 }, parentOrigin);
            }
            return;
        }

        analyser.getByteFrequencyData(dataArray);
        
        // 1. 计算低音部分的平均音量 (用于律动)
        let bassSum = 0; 
        const bassBins = 8; // 取前8个频段作为低音
        for (let i = 0; i < bassBins; i++) bassSum += dataArray[i];
        let average = bassSum / bassBins; 
        
        // 2. 归一化振幅 (0.0 ~ 1.0)，并乘以当前音量
        // audio.volume 是 0~1，这样静音时星星也不会闪
        let amplitude = (average / 255) * audio.volume; 

        // [新增] 实时发送律动数据给主页 (app.js)
        if (IS_IN_IFRAME) {
            // 为了性能，我们可以稍微限制一下发送频率，或者直接发送（现代浏览器通常能处理）
            window.parent.postMessage({ type: 'audioVisualizerData', amplitude: amplitude }, parentOrigin);
        }

        // --- 原有的柱状图渲染逻辑 ---
        const center = 14.5; 
        visualizerBars.forEach((bar, i) => {
            const dist = Math.abs(i - center); const idx = Math.floor(dist); 
            const val = dataArray[idx] || 0; const targetHeight = (val / 255) * 100;
            lastHeights[i] += (targetHeight - lastHeights[i]) * 0.2;
            const currentHeight = Math.max(5, lastHeights[i]);
            bar.style.height = currentHeight + '%';
            bar.style.opacity = 0.3 + (lastHeights[i] / 150);
            if (currentHeight > 60) bar.style.background = 'var(--c-salmon)';
            else if (currentHeight > 10) bar.style.background = 'var(--progress-bar-bg1)';
            else bar.style.background = 'var(--progress-bar-bg1)';
        });
        
        // 原有的粒子脉冲
        if (particleContainer) {
            let pulse = average / 255; 
            pulse = Math.pow(pulse, 3);
            pulse = Math.min(1.0, pulse * 1.5);
            particleContainer.style.setProperty('--audio-pulse', pulse);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (document.activeElement === volumeSlider && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return; 
        switch(e.code) {
            case 'Space': e.preventDefault(); playPauseBtn.click(); break;
            case 'ArrowRight':
                e.preventDefault();
                if (isMvMode) {
                    if (mvPlayer.duration) { const newTime = Math.min(mvPlayer.duration, mvPlayer.currentTime + 5); mvPlayer.currentTime = newTime; updateUI(newTime); }
                } else {
                    if (audio.duration) { const newTime = Math.min(audio.duration, audio.currentTime + 5); audio.currentTime = newTime; updateUI(newTime); }
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (isMvMode) {
                    if (mvPlayer.duration) { const newTime = Math.max(0, mvPlayer.currentTime - 5); mvPlayer.currentTime = newTime; updateUI(newTime); }
                } else {
                    if (audio.duration) { const newTime = Math.max(0, audio.currentTime - 5); audio.currentTime = newTime; updateUI(newTime); }
                }
                break;
            case 'ArrowUp': e.preventDefault(); const newVolUp = Math.min(1, audio.volume + 0.1); audio.volume = newVolUp; audio.muted = false; break;
            case 'ArrowDown': e.preventDefault(); const newVolDown = Math.max(0, audio.volume - 0.1); audio.volume = newVolDown; break;
            case 'KeyM': toggleMute(); break;
        }
    });

    const starsContainer = document.querySelector('.shooting-stars-container');
    if(starsContainer) {
        for(let i=0; i<60; i++) {
            const s = document.createElement('div'); s.className = 'shooting-star';
            s.style.left = Math.random()*100 + '%'; s.style.top = Math.random()*100 + '%';
            s.style.animationDelay = Math.random()*5 + 's'; s.style.animationDuration = (5+Math.random()*5) + 's';
            starsContainer.appendChild(s);
        }
    }
    const particleContainer = document.querySelector('.card-particle-overlay');
    if (particleContainer) {
        const particleColors = ['rgba(245, 218, 223, 0.4)', 'rgba(175, 125, 172, 0.4)', 'rgba(242, 146, 110, 0.5)', 'rgba(255, 255, 255, 0.3)'];
        const particleCount = 400; 
        for (let i = 0; i < particleCount; i++) {
            const wrapper = document.createElement('div'); wrapper.className = 'card-particle-wrapper';
            const particle = document.createElement('div'); particle.className = 'card-particle';
            const randomColor = particleColors[Math.floor(Math.random() * particleColors.length)];
            particle.style.background = randomColor;
            wrapper.style.top = Math.random() * 100 + '%'; wrapper.style.left = Math.random() * 100 + '%';
            wrapper.style.animationDelay = (Math.random() * 15) + 's';
            const dx = (Math.random() - 0.5) * 200; const dy = (Math.random() - 0.5) * 200; 
            wrapper.style.setProperty('--dx', `${dx}px`); wrapper.style.setProperty('--dy', `${dy}px`);
            const scale = 0.5 + Math.random() * 0.5;
            particle.style.width = `${Math.floor(scale * 4)}px`; particle.style.height = `${Math.floor(scale * 4)}px`;
            wrapper.appendChild(particle); particleContainer.appendChild(wrapper);
        }
    }
    const snowflakeCanvas = document.getElementById('snowflake-canvas');
    let snowflakeThrottleTimer = null;
    function spawnSnowflake(x, y) {
        if (!snowflakeCanvas) return;
        const flake = document.createElement('div'); flake.className = 'mouse-snowflake';
        flake.style.left = x + 'px'; flake.style.top = y + 'px';
        const driftX = Math.random() * 80 - 40; const driftY = Math.random() * 50 + 100;
        flake.style.setProperty('--drift-x', `${driftX}px`); flake.style.setProperty('--drift-y', `${driftY}px`);
        snowflakeCanvas.appendChild(flake);
        setTimeout(() => { flake.remove(); }, 2000);
    }
    document.body.addEventListener('mousemove', (e) => {
        const currentMouseX = e.clientX; const currentMouseY = e.clientY;
        if (!snowflakeThrottleTimer) {
            snowflakeThrottleTimer = setTimeout(() => { spawnSnowflake(currentMouseX, currentMouseY); snowflakeThrottleTimer = null; }, 2);
        }
        if(window.innerWidth > 768) {
            let x = (window.innerWidth/2 - e.pageX) / 200; let y = (window.innerHeight/2 - e.pageY) / 200;
            playerCard.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
            const rect = playerCard.getBoundingClientRect();
            const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
            playerCard.style.setProperty('--mouse-x', `${mouseX}px`);
            playerCard.style.setProperty('--mouse-y', `${mouseY}px`);
        }
    });

    function applyRippleEffect() {
        const rippleElements = document.querySelectorAll('.btn, .playlist-song-list li, .nav-capsule a');
        rippleElements.forEach(el => {
            el.addEventListener('click', function(e) {
                const rect = el.getBoundingClientRect();
                const rippleX = e.clientX - rect.left; const rippleY = e.clientY - rect.top;
                const ripple = document.createElement('span'); ripple.classList.add('ripple');
                ripple.style.left = rippleX + 'px'; ripple.style.top = rippleY + 'px';
                const oldRipple = el.querySelector('.ripple');
if (oldRipple) oldRipple.remove();
                el.appendChild(ripple);
                ripple.addEventListener('animationend', () => { ripple.remove(); });
            });
        });
    }
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

    // --- (已修改) 11. Iframe 命令监听器 ---
    window.addEventListener('message', (event) => {
        // if (event.origin !== 'http://your-parent-domain.com') return;

        const data = event.data;
        if (typeof data !== 'object' || !data.type) return;

        // console.log('[IFRAME] Received command:', data);

        switch(data.type) {
            case 'togglePlay':
                playPauseBtn.click();
                break;
            case 'play':
                if (!isPlaying) playPauseBtn.click();
                break;
            case 'pause':
                if (isPlaying) playPauseBtn.click();
                break;
            case 'next':
                nextBtn.click();
                break;
            case 'prev':
                prevBtn.click();
                break;
            case 'seek':
                if (typeof data.time === 'number') {
                    if (isMvMode) mvPlayer.currentTime = data.time;
                    else audio.currentTime = data.time;
                    updateUI(data.time);
                }
                break;
            case 'setVolume':
                if (typeof data.volume === 'number') {
                    const newVol = Math.max(0, Math.min(1, data.volume));
                    audio.volume = newVol;
                    mvPlayer.volume = newVol;
                    audio.muted = (newVol === 0);
                    localStorage.setItem('playerVolume', newVol);
                }
                break;
            case 'loadAndPlay':
                const songToLoad = playlistData.find(s => s.id === data.id);
                if (songToLoad) {
                    loadSongToPlayer(songToLoad.id, true);
                } else {
                    console.warn(`[IFRAME] 找不到 ID 为: ${data.id} 的歌曲`);
                }
                break;
            
            // (=== 新增 ===)
            case 'loadAndPlayMV':
                const songToLoadMV = playlistData.find(s => s.id === data.id);
                if (songToLoadMV) {
                    // 1. 正常加载并播放
                    loadSongToPlayer(songToLoadMV.id, true);
                    
                    // 2. 检查是否有 MV 并切换
                    if (songToLoadMV.mv && !isMvMode) {
                        // (使用一个小延迟来确保播放器已准备好切换)
                        setTimeout(() => {
                            toggleMvMode();
                        }, 100); // 100ms 延迟
                    }
                } else {
                    console.warn(`[IFRAME] 找不到 ID 为: ${data.id} 的歌曲 (MV)`);
                }
                break;
            // (=== 新增结束 ===)

            case 'toggleFavorite':
                toggleFavorite(); // (修改) 直接调用函数
                break;
            case 'toggleRepeat':
                repeatBtn.click();
                break;
            case 'requestFullState':
                broadcastFullState();
                break;
            
            case 'requestPlaylist':
                window.parent.postMessage({
                    type: 'playlistUpdate',
                    playlist: playlistData,
                    currentSongId: currentSongId
                }, parentOrigin);
                break;

            // (关键修复) 响应父页面的“最近播放”请求
            case 'requestRecentlyPlayed':
                const recentIds = getRecentlyPlayed();
                // 将 id 映射为完整的 song 对象
                const recentSongs = recentIds.map(id => {
                    return playlistData.find(song => song.id === id);
                }).filter(song => song); // 过滤掉可能已删除的歌曲
                
                window.parent.postMessage({
                    type: 'recentlyPlayedUpdate',
                    playlist: recentSongs
                }, parentOrigin);
                break;
            
            // (关键修复) 响应父页面的“所有歌曲”请求
            case 'requestAllSongs':
                // (新增) 同时发送收藏夹ID列表
                const favIds = favoriteSongIds || [];
                window.parent.postMessage({
                    type: 'allSongsUpdate',
                    songs: playlistData, // 发送完整列表
                    favoriteIds: favIds // 发送收藏ID
                }, parentOrigin);
                break;
            // (=== 修复版 ===) 添加到下一首 (稳健逻辑)
            case 'addToNext':
                const targetId = data.id;
                
                // 0. 如果试图添加当前正在播放的歌，直接忽略
                if (targetId === currentSongId) {
                    console.log('[IFRAME] 已经是当前歌曲，无需添加');
                    return;
                }

                // 1. 先找到这首歌的数据
                const songToMove = playlistData.find(s => s.id === targetId);
                if (!songToMove) return;

                // 2. 创建一个新的列表，先把这首歌“剔除”出去
                // (这样我们就不用担心删除它后，当前歌曲的索引会不会变了)
                const listWithoutTarget = playlistData.filter(s => s.id !== targetId);

                // 3. 在剔除后的列表中，找到“当前正在播放歌曲”的位置
                const currentIdxInNewList = listWithoutTarget.findIndex(s => s.id === currentSongId);

                // 4. 把那首歌插入到当前歌曲的“后面” (index + 1)
                // 如果当前找不到(比如出错了)，就默认插到最前面(0+1=1)或0
                const insertIndex = (currentIdxInNewList === -1) ? 0 : currentIdxInNewList + 1;
                
                listWithoutTarget.splice(insertIndex, 0, songToMove);

                // 5. 更新主播放列表
                playlistData = listWithoutTarget;

                // 6. 保存顺序并更新 UI
                const newOrder = playlistData.map(s => s.id);
                localStorage.setItem('playerPlaylistOrder', JSON.stringify(newOrder));
                renderPlaylist();
                
                console.log(`[IFRAME] 歌曲《${songToMove.title}》已成功插队到下一首`);
                
                // (可选) 如果当前是随机播放模式，为了让用户感觉到生效，建议切换回循环模式
                // if (playMode === 'shuffle') {
                //     playMode = 'loop';
                //     updateRepeatButtonUI();
                // }
                break;
            case 'updateUserProfile':
                // 更新右上角头像
                const userProfileImg = document.querySelector('.user-profile img');
                if (userProfileImg && data.avatar) {
                    userProfileImg.src = data.avatar;
                }
                // 如果你想更新用户名，也可以加上：
                // const userNameEl = document.querySelector('.user-profile .name');
                // if (userNameEl) userNameEl.textContent = data.username;
                break;
        }
    });
   // ===============================================
    // 12. (新增) 用户资料同步逻辑
    // ===============================================
    
    function syncUserProfile(profileData) {
        // 如果没有传入数据，尝试从本地存储读取
        if (!profileData) {
            const saved = localStorage.getItem('music_user_profile');
            if (saved) {
                try {
                    profileData = JSON.parse(saved);
                } catch(e) {}
            }
        }

        // 如果有数据，更新播放器右上角的头像
        if (profileData && profileData.avatar) {
            const playerUserImg = document.querySelector('.user-profile img');
            if (playerUserImg) {
                playerUserImg.src = profileData.avatar;
                console.log('播放器头像已更新');
            }
        }
    }

    // A. 初始化时同步一次
    syncUserProfile();

    // B. 监听父页面的更新指令
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (data && data.type === 'updateUserProfile') {
            // 收到新资料，立即更新
            syncUserProfile(data.profile);
        }
        
        // ... (保留你原有的 message switch case 逻辑) ...
        // 可以在 switch 里面加一个 case，或者像上面这样单独判断
    });
   // 启动
    syncUserProfile();
    loadFavoritesFromStorage();
    loadAllSongs();
    applyRippleEffect();
    initNavPill();
});