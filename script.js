document.addEventListener('DOMContentLoaded', async () => {

    // ===============================================
    // --- 1. 核心配置区 ---
    // ===============================================
    // (保持不变, 我们将从 playlist.json 加载)

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

    // === (新增) 1. 加载已保存的音量 ===
    const savedVolume = localStorage.getItem('playerVolume');
    if (savedVolume !== null) {
        const volumeValue = parseFloat(savedVolume);
        // 应用到两个播放器
        audio.volume = volumeValue;
        mvPlayer.volume = volumeValue;
        audio.muted = (volumeValue === 0);
        lastVolume = volumeValue > 0 ? volumeValue : 1;
        // (UI 将在 audio.onloadedmetadata 中被更新)
    }

    // ===============================================
    // --- 3. 自动加载系统 (已修改) ---
    // ===============================================
    
    async function loadAllSongs() {
        console.log("开始加载歌曲...");
        
        // 1. 加载 `playlist.json`
        let songFolders = [];
        try {
            const response = await fetch('playlist.json');
            if (!response.ok) throw new Error('playlist.json 加载失败。');
            songFolders = await response.json();
        } catch (e) {
            console.error(e);
            titleElement.innerHTML = "加载错误";
            artistElement.textContent = "请检查 `playlist.json` 是否存在。";
            return;
        }

        // 2. 遍历 `songFolders` 加载歌曲详情
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
                } catch (e) { /* 忽略歌词加载失败 */ }

                playlistData.push({
                    id: i, // (重要) ID 必须是固定的
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
        
        // === (新增) 3. 应用已保存的播放列表顺序 ===
        const savedOrder = localStorage.getItem('playerPlaylistOrder');
        if (savedOrder) {
            try {
                const orderedIds = JSON.parse(savedOrder);
                // 创建一个查找表 (Map)，用于快速排序
                const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
                
                // 过滤掉已保存但 playlist.json 中已删除的歌曲
                const newPlaylistData = playlistData.filter(song => orderMap.has(song.id));

                // 根据保存的顺序排序
                newPlaylistData.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));

                // 找出 `playlist.json` 中新增的歌曲 (不在 savedOrder 中)
                const newSongs = playlistData.filter(song => !orderMap.has(song.id));
                
                // 组合：已排序的 + 新增的
                playlistData = [...newPlaylistData, ...newSongs];
                
                console.log("成功加载并应用了已保存的播放列表顺序。");
            } catch (e) {
                console.warn("解析已保存的播放列表顺序失败。", e);
            }
        }

        console.log(`成功加载 ${playlistData.length} 首歌曲`);
        
        // 4. 加载第一首歌
        if (playlistData.length > 0) {
            loadSongToPlayer(playlistData[0].id, false); 
            renderPlaylist();
        }
    }

    // ===============================================
    // --- 4. 核心播放逻辑 ---
    // ===============================================
    function loadSongToPlayer(id, autoPlay = true) {
        // (修改) 确保我们通过 `id` 查找
        const song = playlistData.find(s => s.id === id);
        if (!song) {
            console.warn(`歌曲 ID ${id} 未在 playlistData 中找到。`);
            return;
        }

        currentSongId = song.id;
        audio.crossOrigin = "anonymous";
        
        // ... (loadSongToPlayer 的其余部分保持不变) ...
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
        renderPlaylist();
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
    }

    function playNext() {
        // (保持不变, 此逻辑已支持排序后的列表)
        const currentIndex = playlistData.findIndex(s => s.id === currentSongId);
        let newIndex = (currentIndex + 1) % playlistData.length;
        if (currentIndex === -1) newIndex = 0;
        const nextSong = playlistData[newIndex];
        loadSongToPlayer(nextSong.id, true);
    }

    function playPrev() {
        // (保持不变, 此逻辑已支持排序后的列表)
        const currentIndex = playlistData.findIndex(s => s.id === currentSongId);
        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = playlistData.length - 1;
        if (currentIndex === -1) newIndex = 0;
        const prevSong = playlistData[newIndex];
        loadSongToPlayer(prevSong.id, true);
    }

    // ===============================================
    // --- 4.5. 播放模式逻辑 ---
    // ===============================================
    
    // ... (播放模式, 收藏功能 保持不变) ...
    function cyclePlayMode() {
        if (playMode === 'loop') playMode = 'one';
        else if (playMode === 'one') playMode = 'shuffle';
        else playMode = 'loop';
        updateRepeatButtonUI();
    }
    function updateRepeatButtonUI() {
        switch(playMode) {
            case 'one': repeatIcon.src = 'icon/24gl-repeatOnce2.png'; break;
            case 'shuffle': repeatIcon.src = 'icon/24gl-shuffle.png'; break;
            default: repeatIcon.src = 'icon/24gl-repeat2.png'; break;
        }
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
    }
    function toggleFavorite() {
        const songId = currentSongId;
        const index = favoriteSongIds.indexOf(songId);
        if (index > -1) favoriteSongIds.splice(index, 1);
        else favoriteSongIds.push(songId);
        saveFavoritesToStorage();
        updateFavoriteButtonUI(songId);
    }
    
    // ===============================================
    // --- 5. 视觉进阶：背景与黑胶光晕自适应 ---
    // ===============================================
    
    // ... (背景主题 保持不变) ...
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
    // --- 6. LRC 歌词解析与渲染 ---
    // ===============================================
    
    // ... (歌词逻辑 保持不变) ...
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
        if (isMvMode || isSeeking) return;
        updateUI(audio.currentTime);
        if (!isUserScrolling) {
            let idx = -1;
            for (let i = 0; i < lyricsData.length; i++) {
                if (audio.currentTime >= lyricsData[i].time) idx = i; else break;
            }
            if (idx !== -1 && idx !== currentLyricDataIndex) {
                currentLyricDataIndex = idx;
                render3DLyrics(currentLyricDataIndex);
            }
        }
    });
    mvPlayer.addEventListener('timeupdate', () => {
        if (!isMvMode || isSeeking) return;
        updateUI(mvPlayer.currentTime);
        if (!isUserScrolling) {
            let idx = -1;
            for (let i = 0; i < lyricsData.length; i++) {
                if (mvPlayer.currentTime >= lyricsData[i].time) idx = i; else break;
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
    // --- 7. 基础 UI 控制 ---
    // ===============================================
    
    // ... (播放/暂停, 进度条 保持不变) ...
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

        // === (新增) 控制播放列表图标的动画 ===
        const playingBars = document.querySelectorAll('.playing-bar');
        if (playingBars.length) {
            // 1. 获取当前的播放状态
            const animationState = isPlaying ? 'running' : 'paused';
            
            // 2. 应用到所有 bar
            playingBars.forEach(bar => {
                bar.style.animationPlayState = animationState;
            });
        }
        // ======================================
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
    
    // ===============================================
    // --- 7.3. 播放列表与拖拽 ---
    // ===============================================

    function renderPlaylist() {
        songListUl.innerHTML = ''; 
        
        playlistData.forEach(song => {
            const li = document.createElement('li');
            
            let playingIndicator = ''; // (新增) 用于存放图标 HTML

            if (song.id === currentSongId) {
                li.classList.add('playing'); // (保持) 保留 .playing 类, 用于状态识别
                
                // (新增) 创建图标的 HTML
                playingIndicator = `
                    <div class="playing-icon-container">
                        <span class="playing-bar"></span>
                        <span class="playing-bar"></span>
                        <span class="playing-bar"></span>
                    </div>
                `;
            }

            // (修改) 将图标 HTML 插入到 标题 后面，并用 div 包裹
            li.innerHTML = `
                <div class="song-title-wrapper">
                    <span class="song-item-title">${song.title}</span>
                    ${playingIndicator}
                </div>
                <span class="song-item-artist">${song.artist}</span>
            `;

            // (保持) 您所有的拖拽和点击事件监听器保持不变
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

    /**
     * (修改) 拖拽释放
     */
    function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const droppedOnId = parseInt(e.currentTarget.dataset.songId);
        if (draggedItemId === droppedOnId) return;

        const draggedIndex = playlistData.findIndex(s => s.id === draggedItemId);
        const targetIndex = playlistData.findIndex(s => s.id === droppedOnId);
        if (draggedIndex === -1 || targetIndex === -1) return;

        const [draggedItem] = playlistData.splice(draggedIndex, 1);
        const newTargetIndex = playlistData.findIndex(s => s.id === droppedOnId); // 重新计算索引
        
        if (draggedIndex < newTargetIndex) playlistData.splice(newTargetIndex + 1, 0, draggedItem);
        else playlistData.splice(newTargetIndex, 0, draggedItem);

        // === (新增) 2. 保存新的播放列表顺序 ===
        const newOrder = playlistData.map(song => song.id);
        localStorage.setItem('playerPlaylistOrder', JSON.stringify(newOrder));
        console.log("播放列表顺序已保存。");

        renderPlaylist(); // 重新渲染
    }

    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        draggedItemId = null;
        document.querySelectorAll('.playlist-song-list li.drag-over').forEach(li => {
            li.classList.remove('drag-over');
        });
    }
    
    // ... (播放列表弹窗逻辑 保持不变) ...
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
        // (修改) 确保在音频加载后，根据保存的音量更新UI
        updateVolumeUI(); 
    };
    mvPlayer.onloadedmetadata = () => {
        if (isMvMode) totalTimeEl.textContent = formatTime(mvPlayer.duration);
    };
    
    document.addEventListener('click', (event) => {
        if (playlistModal.classList.contains('show')) {
            const isClickOnButton = playlistBtn.contains(event.target) || playlistBtn === event.target;
            const isClickInModal = playlistModal.contains(event.target);
            if (!isClickOnButton && !isClickInModal) playlistModal.classList.remove('show');
        }
    });

    // ===============================================
    // --- 7.5. 音量控制 (已修改) ---
    // ===============================================

    /**
     * (修改) 音量滑块改变
     */
    function handleVolumeChange() {
        const value = volumeSlider.value / 100;
        audio.volume = value;
        mvPlayer.volume = value;
        audio.muted = (value === 0);

        // === (新增) 3. 保存音量 ===
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
            lastVolume = audio.volume; // 保存当前音量
            newVolume = 0;
            audio.muted = true;
            audio.volume = newVolume;
            mvPlayer.volume = newVolume;
        }
        
        // === (新增) 3. 保存音量 ===
        // (静音时保存 0，取消静音时保存恢复的音量)
        localStorage.setItem('playerVolume', newVolume);
    }

    function updateVolumeUI() {
        // (保持不变, 此函数现在会自动读取启动时设置的音量)
        const volume = audio.muted ? 0 : audio.volume;
        if (!audio.muted && volume > 0) lastVolume = volume;
        volumeSlider.value = volume * 100;
        volumeSlider.style.background = `linear-gradient(to right, var(--progress-bar-fill) ${volume * 100}%, var(--progress-bar-bg) ${volume * 100}%)`;
        if (volume === 0) volumeIcon.src = 'icon/24gl-volumeCross.png';
        else if (volume < 0.33) volumeIcon.src = 'icon/24gl-volumeLow.png';
        else if (volume < 0.66) volumeIcon.src = 'icon/24gl-volumeMiddle.png';
        else volumeIcon.src = 'icon/24gl-volumeHigh.png';
    }
    
    volumeSlider.addEventListener('input', handleVolumeChange);
    volumeBtn.addEventListener('click', toggleMute);
    audio.addEventListener('volumechange', updateVolumeUI);

    // ===============================================
    // --- 7.8. MV 控制 ---
    // ===============================================
    
    // ... (MV 逻辑 保持不变) ...
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

    // ===============================================
    // --- 8. 音频频谱 ---
    // ===============================================
    
    // ... (频谱逻辑 保持不变) ...
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
    function renderVisualizer() {
        requestAnimationFrame(renderVisualizer);
        if (!isPlaying) {
            visualizerBars.forEach(b => {
                b.style.height = '5%'; b.style.opacity = 1;
                b.style.background = 'var(--progress-bar-bg)'; 
            });
            if(particleContainer) particleContainer.style.setProperty('--audio-pulse', 0);
            return;
        }
        analyser.getByteFrequencyData(dataArray);
        let bassSum = 0; const bassBins = 8;
        for (let i = 0; i < bassBins; i++) bassSum += dataArray[i];
        let average = bassSum / bassBins; const center = 14.5; 
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
        if (particleContainer) {
            let pulse = average / 255; 
            pulse = Math.pow(pulse, 3);
            pulse = Math.min(1.0, pulse * 1.5);
            particleContainer.style.setProperty('--audio-pulse', pulse);
        }
    }

    // ===============================================
    // --- 9. 启动特效 & 快捷键 ---
    // ===============================================
    
    // ... (快捷键 保持不变) ...
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

    // ... (特效 保持不变) ...
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

    // ... (波纹, 导航栏 保持不变) ...
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

   // 启动
    loadFavoritesFromStorage(); // (保持不变)
    loadAllSongs(); // (修改) 现在会加载保存的音量和顺序
    applyRippleEffect();
    initNavPill();
});