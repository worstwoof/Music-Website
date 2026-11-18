document.addEventListener('DOMContentLoaded', () => {
    let playlistData = [];
    let currentSongId = null;
    let loadStatus = 'loading';
    let playAttempt = 0;
    let wantsToPlay = false;
    let noticeTimer;
    let isPlaying = false; 
    let isSeeking = false; 
    let isUserScrolling = false;
    let scrollTimeout = null;
    let lastVolume = 1;
    let playMode = 'loop';
    let lyricsData = []; 
    let currentLyricDataIndex = -1; 
    let draggedItemId = null; 
    let lastMessageTime = 0;
    // 跨窗口通信
    const IS_IN_IFRAME = (window.self !== window.top);
    const parentOrigin = window.location.origin;

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
    const colorThief = typeof ColorThief === 'function' ? new ColorThief() : null;
    const storedVolume = readSetting('playerVolume', 1);
    const initialVolume = Number.isFinite(storedVolume) ? Math.max(0, Math.min(1, storedVolume)) : 1;
    audio.volume = initialVolume;
    mvPlayer.volume = initialVolume;
    lastVolume = initialVolume || 1;
    favoriteSongIds = readSongIds('myFavoriteSongs');

    function sendToHost(data) {
        if (IS_IN_IFRAME) window.parent.postMessage(data, parentOrigin);
    }

    function showNotice(message) {
        if (IS_IN_IFRAME) {
            sendToHost({ type: 'playerNotice', message });
            return;
        }
        const notice = document.getElementById('player-notice');
        notice.textContent = message;
        notice.hidden = false;
        clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => { notice.hidden = true; }, 2600);
    }

    function currentMedia() {
        return isMvMode ? mvPlayer : audio;
    }

    function currentSong() {
        return playlistData.find(song => song.id === currentSongId);
    }

    function broadcastFullState() {
        const song = currentSong();
        const media = currentMedia();
        sendToHost({
            type: 'playerStateUpdate',
            song: song ? { id: song.id, title: song.title, artist: song.artist, cover: song.cover, album: song.album } : null,
            mode: isMvMode ? 'mv' : 'audio',
            isPlaying,
            currentTime: Number.isFinite(media.currentTime) ? media.currentTime : 0,
            duration: Number.isFinite(media.duration) ? media.duration : 0,
            volume: audio.volume,
            isMuted: audio.volume === 0,
            playMode,
            isFavorite: favoriteSongIds.includes(currentSongId)
        });
    }

    function replyReady() {
        if (loadStatus === 'ready') sendToHost({ type: 'playerReady' });
        if (loadStatus === 'error') sendToHost({ type: 'playerLoadError' });
    }

    async function loadAllSongs() {
        try {
            const response = await fetch('playlist.json');
            if (!response.ok) throw new Error('无法读取 playlist.json');
            const songs = await response.json();
            if (!Array.isArray(songs)) throw new Error('歌曲清单格式错误');
            const orderedIds = readSongIds('playerPlaylistOrder');
            const order = new Map(orderedIds.map((id, index) => [id, index]));
            playlistData = songs.sort((a, b) =>
                (order.get(a.id) ?? orderedIds.length) - (order.get(b.id) ?? orderedIds.length)
            );
            favoriteSongIds = favoriteSongIds.filter(id => playlistData.some(song => song.id === id));
            if (playlistData.length) loadSongToPlayer(playlistData[0].id, false);
            else titleElement.textContent = '曲库为空';
            loadStatus = 'ready';
            replyReady();
        } catch (error) {
            loadStatus = 'error';
            console.warn(error.message);
            titleElement.textContent = '曲库加载失败';
            artistElement.textContent = '请刷新页面后重试';
            replyReady();
        }
    }

    async function loadLyrics(song) {
        renderLyrics('');
        try {
            const response = await fetch('songs/' + encodeURIComponent(song.folder) + '/lyrics.lrc');
            if (!response.ok) return;
            const lyrics = await response.text();
            if (song.id === currentSongId) renderLyrics(lyrics);
        } catch {
            // 歌词读取失败时保留“暂无歌词”。
        }
    }

    function getRecentlyPlayed() {
        return readSongIds('recentlyPlayed');
    }

    function recordPlaying(id) {
        const recent = getRecentlyPlayed();
        if (recent[0] === id) return;
        saveSetting('recentlyPlayed', [id, ...recent.filter(item => item !== id)].slice(0, 50));
        sendToHost({ type: 'historyChanged' });
    }

    function pauseMedia() {
        playAttempt++;
        wantsToPlay = false;
        audio.pause();
        mvPlayer.pause();
        isPlaying = false;
    }

    function refreshMediaUI() {
        const media = currentMedia();
        totalTimeEl.textContent = formatTime(media.duration);
        updateUI(media.currentTime);
        updatePlayPauseIcon();
    }

    function setMediaMode(useMv) {
        isMvMode = useMv;
        mvPlayer.muted = !useMv;
        playerCard.classList.toggle('mv-mode', useMv);
        mvBtn.classList.toggle('active', useMv);
        mvIcon.src = useMv ? 'icon/24gl-musicAlbum.png' : 'icon/24gl-mv.png';
    }

    async function playCurrent() {
        if (currentSongId === null) {
            showNotice('请选择一首歌曲');
            return;
        }
        const media = currentMedia();
        const attempt = ++playAttempt;
        wantsToPlay = true;
        if (media === audio) setupAudioContext();

        try {
            await media.play();
            if (attempt !== playAttempt) return;
            isPlaying = true;
            recordPlaying(currentSongId);
            updatePlayPauseIcon();
        } catch (error) {
            if (attempt !== playAttempt || error.name === 'AbortError') return;
            isPlaying = false;
            updatePlayPauseIcon();
            if (error.name === 'NotAllowedError') {
                wantsToPlay = false;
                showNotice('浏览器暂未允许播放，请再点一次播放');
            } else if (media === mvPlayer) {
                fallBackToAudio();
            } else {
                wantsToPlay = false;
                showNotice('音频读取失败，请试试其他歌曲');
            }
        }
    }

    function fallBackToAudio() {
        if (!isMvMode) return;
        const resume = wantsToPlay;
        pauseMedia();
        setMediaMode(false);
        audio.currentTime = 0;
        refreshMediaUI();
        showNotice('MV 读取失败，已切回音频');
        if (resume) playCurrent();
    }

    function loadSongToPlayer(id, autoPlay = true, wantMv = isMvMode) {
        const song = playlistData.find(item => item.id === id);
        if (!song) {
            showNotice('这首歌不在当前曲库中');
            return;
        }

        const changedSong = id !== currentSongId;
        const useMv = wantMv && Boolean(song.mv);
        if (changedSong || isMvMode !== useMv || !autoPlay) {
            pauseMedia();
            currentSongId = id;
            if (changedSong) {
                audio.src = song.src;
                if (song.mv) {
                    mvPlayer.src = song.mv;
                } else if (mvPlayer.hasAttribute('src')) {
                    mvPlayer.removeAttribute('src');
                    mvPlayer.load();
                }
                titleElement.textContent = song.title;
                artistElement.textContent = song.artist;
                albumTitleElement.textContent = song.album || '';
                albumArtElement.src = song.cover;
                updateBackgroundTheme(albumArtElement);
                mvBtn.hidden = !song.mv;
                mvBtn.style.display = song.mv ? 'flex' : 'none';
                loadLyrics(song);
            }
            setMediaMode(useMv);
            currentMedia().currentTime = 0;
            refreshMediaUI();
            renderPlaylist();
            updateFavoriteButtonUI();
        }
        if (wantMv && !song.mv) showNotice('这首歌没有 MV，已使用音频');
        if (autoPlay) playCurrent();
    }

    function playNext() {
        if (!playlistData.length) return;
        const currentIndex = playlistData.findIndex(s => s.id === currentSongId);
        let newIndex = (currentIndex + 1) % playlistData.length;
        if (currentIndex === -1) newIndex = 0;
        const nextSong = playlistData[newIndex];
        loadSongToPlayer(nextSong.id, true);
    }
    function playPrev() {
        if (!playlistData.length) return;
        const currentIndex = playlistData.findIndex(s => s.id === currentSongId);
        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = playlistData.length - 1;
        if (currentIndex === -1) newIndex = 0;
        const prevSong = playlistData[newIndex];
        loadSongToPlayer(prevSong.id, true);
    }

    // ===============================================
    // --- 4.5. 播放模式逻辑 (已修改) ---
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
            case 'shuffle': repeatIcon.src = 'icon/24gl-shuffle.png'; break;
            default: repeatIcon.src = 'icon/24gl-repeat2.png'; break;
        }
        broadcastFullState();
    }
    function playShuffle() {
        if (!playlistData.length) return;
        if (playlistData.length <= 1) { playNext(); return; }
        let newId;
        do { newId = playlistData[Math.floor(Math.random() * playlistData.length)].id; } 
        while (newId === currentSongId);
        loadSongToPlayer(newId, true);
    }
    function handleSongEnd(event) {
        if (event.currentTarget !== currentMedia()) return;
        isPlaying = false;
        if (playMode === 'one') {
            currentMedia().currentTime = 0;
            playCurrent();
        } else if (playMode === 'shuffle') {
            playShuffle();
        } else {
            playNext();
        }
    }

    function handleNextClick() {
        if (playMode === 'shuffle') playShuffle();
        else playNext();
    }
    function updateFavoriteButtonUI() {
        const isFavorite = favoriteSongIds.includes(currentSongId);
        favoriteIcon.src = isFavorite ? 'icon/24gl-heart-filled.png' : 'icon/24gl-heart.png';
        favoriteBtn.classList.toggle('active', isFavorite);
        broadcastFullState();
    }

    function toggleFavorite(id = currentSongId) {
        if (!playlistData.some(song => song.id === id)) return;
        const index = favoriteSongIds.indexOf(id);
        if (index >= 0) favoriteSongIds.splice(index, 1);
        else favoriteSongIds.push(id);

        const saved = saveSetting('myFavoriteSongs', favoriteSongIds);
        updateFavoriteButtonUI();
        sendToHost({ type: 'favoritesChanged' });
        if (!saved) showNotice('浏览器无法保存收藏，刷新后可能丢失');
    }

    function updateBackgroundTheme(imgElement) {
        if (!colorThief) return;
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
        return result.sort((a, b) => a.time - b.time);
    }
    function renderLyrics(lrcString) {
        lyricsListElement.innerHTML = '';
        lyricsData = [];
        currentLyricDataIndex = -1;
        lyricsContainer.scrollTop = 0;
        const parsed = parseLrc(lrcString);
        if (!parsed.length) {
            lyricsListElement.innerHTML = '<li class="lyric-line active" style="text-align:center">暂无歌词</li>';
            return;
        }
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
                if (!seekTo(item.time)) return;
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
    function updateProgress() {
        if (isSeeking) return;
        const time = currentMedia().currentTime;
        updateUI(time);
        sendToHost({ type: 'timeUpdate', currentTime: time });
        if (isUserScrolling) return;
        let index = -1;
        for (let i = 0; i < lyricsData.length; i++) {
            if (time < lyricsData[i].time) break;
            index = i;
        }
        if (index !== currentLyricDataIndex) {
            currentLyricDataIndex = index;
            render3DLyrics(index);
        }
    }

    for (const media of [audio, mvPlayer]) {
        media.addEventListener('timeupdate', () => {
            if (media === currentMedia()) updateProgress();
        });
        media.addEventListener('loadedmetadata', () => {
            if (media === currentMedia()) refreshMediaUI();
        });
        media.addEventListener('error', () => {
            if (currentSongId === null || media !== currentMedia() || !media.currentSrc || !media.error) return;
            if (media === mvPlayer) fallBackToAudio();
            else {
                pauseMedia();
                refreshMediaUI();
                showNotice(media === audio ? '音频读取失败，请试试其他歌曲' : '视频读取失败');
            }
        });
    }

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
    function togglePlay() {
        if (currentMedia().paused) playCurrent();
        else {
            pauseMedia();
            updatePlayPauseIcon();
        }
    }
    playPauseBtn.addEventListener('click', togglePlay);

    function seekTo(seconds) {
        const media = currentMedia();
        if (!Number.isFinite(seconds) || !Number.isFinite(media.duration)) return false;
        media.currentTime = Math.max(0, Math.min(media.duration, seconds));
        updateProgress();
        return true;
    }

    function updateUI(time) {
        const duration = currentMedia().duration;
        if (Number.isFinite(duration) && duration > 0) progressBar.style.width = `${(time / duration) * 100}%`;
        currentTimeEl.textContent = formatTime(time);
    }
    function formatTime(s) {
        if (!Number.isFinite(s) || s < 0) return "0:00";
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
        const duration = currentMedia().duration;
        if (!Number.isFinite(duration)) return;
        const time = pct * duration;
        if (apply) seekTo(time);
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
        playlistData.splice(targetIndex, 0, draggedItem);
        savePlaylistOrder();
    }

    function sendPlaylist() {
        sendToHost({ type: 'playlistUpdate', playlist: playlistData, currentSongId });
    }

    function savePlaylistOrder() {
        if (!saveSetting('playerPlaylistOrder', playlistData.map(song => song.id))) {
            showNotice('浏览器无法保存播放顺序');
        }
        renderPlaylist();
        sendPlaylist();
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
    favoriteBtn.addEventListener('click', () => toggleFavorite());
    document.addEventListener('click', (event) => {
        if (playlistModal.classList.contains('show')) {
            const isClickOnButton = playlistBtn.contains(event.target) || playlistBtn === event.target;
            const isClickInModal = playlistModal.contains(event.target);
            if (!isClickOnButton && !isClickInModal) playlistModal.classList.remove('show');
        }
    });

    function applyVolume(value) {
        if (!Number.isFinite(value)) return;
        const volume = Math.max(0, Math.min(1, value));
        if (audio.volume > 0) lastVolume = audio.volume;
        audio.volume = volume;
        mvPlayer.volume = volume;
        if (!saveSetting('playerVolume', volume)) showNotice('浏览器无法保存音量');
        updateVolumeUI();
    }

    function toggleMute() {
        applyVolume(audio.volume === 0 ? lastVolume : 0);
    }

    function updateVolumeUI() {
        const volume = audio.volume;
        volumeSlider.value = volume * 100;
        volumeSlider.style.background = 'linear-gradient(to right, var(--progress-bar-fill) ' +
            volume * 100 + '%, var(--progress-bar-bg) ' + volume * 100 + '%)';
        if (volume === 0) volumeIcon.src = 'icon/24gl-volumeCross.png';
        else if (volume < 0.33) volumeIcon.src = 'icon/24gl-volumeLow.png';
        else if (volume < 0.66) volumeIcon.src = 'icon/24gl-volumeMiddle.png';
        else volumeIcon.src = 'icon/24gl-volumeHigh.png';
        broadcastFullState();
    }
    volumeSlider.addEventListener('input', () => applyVolume(Number(volumeSlider.value) / 100));
    volumeBtn.addEventListener('click', toggleMute);

    function toggleMvMode() {
        const song = currentSong();
        if (!song || !song.mv) {
            showNotice('这首歌没有 MV');
            return;
        }
        const resume = wantsToPlay;
        pauseMedia();
        setMediaMode(!isMvMode);
        currentMedia().currentTime = 0;
        refreshMediaUI();
        if (resume) playCurrent();
    }
    mvBtn.addEventListener('click', toggleMvMode);

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
            if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
        } catch(e) { console.log("Web Audio Init Failed:", e); }
    }
    // music-player.js - 修改 renderVisualizer 函数
    function renderVisualizer() {
        requestAnimationFrame(renderVisualizer);
        
        // 如果未播放，重置状态并通知主页归零
        if (!isPlaying || isMvMode) {
            visualizerBars.forEach(b => {
                b.style.height = '5%'; b.style.opacity = 1;
                b.style.background = 'var(--progress-bar-bg)'; 
            });
            if(particleContainer) particleContainer.style.setProperty('--audio-pulse', 0);
            
            // 停止时，也稍微节流一下发送归零信号，避免疯狂发送
            const now = Date.now();
            if (now - lastMessageTime > 200 && IS_IN_IFRAME) {
                sendToHost({ type: 'audioVisualizerData', amplitude: 0 });
                lastMessageTime = now;
            }
            return;
        }

        analyser.getByteFrequencyData(dataArray);
        
        // 1. 计算低音部分的平均音量
        let bassSum = 0; 
        const bassBins = 8; 
        for (let i = 0; i < bassBins; i++) bassSum += dataArray[i];
        let average = bassSum / bassBins; 
        
        // 2. 计算振幅
        let amplitude = (average / 255) * audio.volume; 

        // === 【修复点】节流发送数据给主页 ===
        // 只有当距离上次发送超过 50ms (约20帧/秒) 时才发送，既流畅又不卡顿
        const now = Date.now();
        if (now - lastMessageTime > 50) { 
            if (IS_IN_IFRAME) {
                sendToHost({ type: 'audioVisualizerData', amplitude });
            }
            lastMessageTime = now; // 更新时间戳
        }
        // ====================================

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
        for(let i=0; i<30; i++) {
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
    window.addEventListener('message', event => {
        if (!IS_IN_IFRAME || event.origin !== parentOrigin || event.source !== window.parent) return;
        const data = event.data;
        if (!data || typeof data.type !== 'string') return;
        if (data.type === 'requestReady') {
            replyReady();
            return;
        }
        if (loadStatus !== 'ready') return;

        switch (data.type) {
            case 'togglePlay': togglePlay(); break;
            case 'play': playCurrent(); break;
            case 'pause': pauseMedia(); updatePlayPauseIcon(); break;
            case 'next': handleNextClick(); break;
            case 'prev': playPrev(); break;
            case 'seek': seekTo(data.time); break;
            case 'setVolume': applyVolume(data.volume); break;
            case 'toggleMute': toggleMute(); break;
            case 'loadAndPlay':
            case 'loadAndPlayMV':
                if (Number.isSafeInteger(data.id) && data.id >= 0) {
                    loadSongToPlayer(data.id, true, data.type === 'loadAndPlayMV');
                }
                break;
            case 'toggleFavorite':
                if (data.id === undefined || Number.isSafeInteger(data.id)) toggleFavorite(data.id);
                break;
            case 'toggleRepeat': cyclePlayMode(); break;
            case 'requestFullState': broadcastFullState(); break;
            case 'requestPlaylist': sendPlaylist(); break;
            case 'requestRecentlyPlayed': {
                const songs = getRecentlyPlayed().map(id => playlistData.find(song => song.id === id));
                sendToHost({ type: 'recentlyPlayedUpdate', playlist: songs.filter(Boolean) });
                break;
            }
            case 'requestAllSongs':
                sendToHost({ type: 'allSongsUpdate', songs: playlistData, favoriteIds: favoriteSongIds });
                break;
            case 'addToNext': {
                if (data.id === currentSongId) return;
                const from = playlistData.findIndex(song => song.id === data.id);
                if (from < 0) return;
                const [song] = playlistData.splice(from, 1);
                const currentIndex = playlistData.findIndex(item => item.id === currentSongId);
                playlistData.splice(currentIndex + 1, 0, song);
                savePlaylistOrder();
                break;
            }
        }
    });

    document.getElementById('btn-minimize').addEventListener('click', () => {
        sendToHost({ type: 'closeFullPlayer' });
    });
    updateVolumeUI();
    loadAllSongs();
    applyRippleEffect();
    initNavPill();
});
