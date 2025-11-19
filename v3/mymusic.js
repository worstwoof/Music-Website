// 辅助函数：显示 Toast 提示
    function showToast(message) {
        const toast = document.getElementById('toast-notification');
        const msgSpan = document.getElementById('toast-message');
        if (toast && msgSpan) {
            msgSpan.textContent = message;
            toast.classList.add('show');
            
            // 2秒后自动消失
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2000);
        }
    }

// ==================== 流星效果 ====================
const starsContainer = document.querySelector('.shooting-stars-container');
if (starsContainer) {
    for (let i = 0; i < 60; i++) {
        const s = document.createElement('div');
        s.className = 'shooting-star';
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.animationDelay = Math.random() * 5 + 's';
        s.style.animationDuration = (5 + Math.random() * 5) + 's';
        starsContainer.appendChild(s);
    }
}

// ==================== 雪花粒子效果 ====================
const snowflakeCanvas = document.getElementById('snowflake-canvas');
let snowflakeThrottleTimer = null;

function spawnSnowflake(x, y) {
    const snowflake = document.createElement('div');
    snowflake.className = 'mouse-snowflake';
    snowflake.style.left = x + 'px';
    snowflake.style.top = y + 'px';
    
    const driftX = (Math.random() - 0.5) * 100;
    const driftY = 100 + Math.random() * 100;
    snowflake.style.setProperty('--drift-x', driftX + 'px');
    snowflake.style.setProperty('--drift-y', driftY + 'px');
    
    snowflakeCanvas.appendChild(snowflake);
    
    setTimeout(() => {
        snowflake.remove();
    }, 2000);
}

// ==================== 流星拖尾效果 ====================
let trailThrottleTimer = null;
let lastMouseX = 0;
let lastMouseY = 0;

function createTrailParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'trail-particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    document.body.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, 800);
}

document.body.addEventListener('mousemove', (e) => {
    const currentMouseX = e.clientX;
    const currentMouseY = e.clientY;
    
    if (!snowflakeThrottleTimer) {
        snowflakeThrottleTimer = setTimeout(() => {
            spawnSnowflake(currentMouseX, currentMouseY);
            snowflakeThrottleTimer = null;
        }, 50);
    }
    
    if (!trailThrottleTimer) {
        trailThrottleTimer = setTimeout(() => {
            const dx = currentMouseX - lastMouseX;
            const dy = currentMouseY - lastMouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                createTrailParticle(currentMouseX, currentMouseY);
            }
            
            lastMouseX = currentMouseX;
            lastMouseY = currentMouseY;
            trailThrottleTimer = null;
        }, 30);
    }
});


/* ==============================================
   === (V13) 启动脚本 (修复新功能加载) ===
   ============================================== */

document.addEventListener('DOMContentLoaded', () => {

    console.log('[调试] DOMContentLoaded 已触发。正在启动所有功能...');

    // (修改) 缓存所有歌曲和收藏的ID
    let allSongsCache = [];
    let favoritesCache = []; // (修改) 现在只存储收藏的 ID
    let recentlyPlayedCache = [];
    let isDataLoaded = {
        favorites: false,
        recent: false,
        local: false
    };

    // ====================
    // 1. 导航栏滚动效果
    // ====================
    const header = document.getElementById("header");
    if (header) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 50) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }
        });
    }

    // ====================
    // 2. 导航栏滑动指示器
    // ====================
const navOptions = document.querySelector(".nav-options");
    const navPill = document.querySelector(".nav-pill");
    const pillNavItems = document.querySelectorAll('.nav-options .nav-item'); // (修改) 选择所有 nav-item
    let activeNavItem = null;

    function movePill(targetItem) {
      if (!targetItem || !navPill || !navOptions) return;
      if (window.innerWidth <= 768) { // 移动端隐藏
        navPill.style.opacity = '0';
        return;
      }
      const containerRect = navOptions.getBoundingClientRect();
      const targetRect = targetItem.getBoundingClientRect();
      const pillWidth = targetRect.width;
      const pillHeight = targetRect.height;
      // (修改) 计算 left 和 top
      const pillLeft = targetRect.left - containerRect.left;
      const pillTop = targetRect.top - containerRect.top;

      navPill.style.width = `${pillWidth}px`;
      navPill.style.height = `${pillHeight}px`;
      navPill.style.left = `${pillLeft}px`;
      navPill.style.top = `${pillTop}px`;
      navPill.style.opacity = '1';
    }

    // (修改) 寻找 .active 类，而不是 href="#home"
    // (修复) 查找 'mymusic.html' 的激活项
    const initialActiveItem = document.querySelector('.nav-options .nav-item[href="mymusic.html"]'); 
    
    if (initialActiveItem) {
        // (新增) 立即添加 active 类，以防 HTML 中忘记添加
        initialActiveItem.classList.add('active');
        
      setTimeout(() => {
        movePill(initialActiveItem);
        activeNavItem = initialActiveItem;
      }, 100); // 延迟执行以确保布局稳定
    }

    pillNavItems.forEach(item => {
      // 鼠标进入时，药丸跟随
      item.addEventListener('mouseenter', () => { movePill(item); });
      
      // (新增) 点击时，更新激活项
      item.addEventListener('click', () => {
          // (修复) 只有当它不是当前激活项时才更新
          if (item !== activeNavItem) {
             activeNavItem = item;
          }
      });
    });

    if (navOptions) {
      // 鼠标离开导航栏时，药丸回到 "active" 项
      navOptions.addEventListener('mouseleave', () => {
        if (activeNavItem) {
          movePill(activeNavItem);
        } else if (initialActiveItem) {
          // 如果没有激活项（理论上不应该），回到初始项
          movePill(initialActiveItem);
        }
      });
    }

    window.addEventListener('resize', () => {
      // 窗口缩放时，无动画地重置药丸位置
      const currentActive = activeNavItem || initialActiveItem;
      if (currentActive && navPill) {
        const oldTransition = navPill.style.transition;
        navPill.style.transition = 'none'; // 暂时禁用动画
        movePill(currentActive);
        
        // 强制浏览器重新计算样式
        navPill.offsetHeight; 
        
        // 恢复动画
        setTimeout(() => {
          navPill.style.transition = oldTransition;
        }, 50);
      }
    });

    // =======================================
    // 2.5. (新增) 主题切换 (从 homepage.js 同步)
    // =======================================
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    if (themeToggleBtn) {
      // 1. 页面加载时检查本地存储
      // (修改) 使用与 homepage 相同的 localStorage key
      const currentTheme = localStorage.getItem("music-theme"); 
      if (currentTheme === "dark") {
        document.body.classList.add("dark-mode");
      }

      // 2. 监听点击事件
      themeToggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        // 3. 保存用户选择
        let theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
        localStorage.setItem("music-theme", theme);
        
        // (注意: 已移除 homepage.js 中的 initVanta() 调用，因为它在此页面不存在)
      });
    }

// ====================
    // 3. (升级版) 智能实时搜索功能
    // ====================
    const searchInput = document.querySelector(".search-input");
    const searchDropdown = document.getElementById("search-dropdown");

    if (searchInput && searchDropdown) {
        
        // A. 监听输入事件
        searchInput.addEventListener("input", (e) => {
            const keyword = e.target.value.trim().toLowerCase();
            
            // 1. 如果输入为空，隐藏下拉框
            if (keyword.length === 0) {
                searchDropdown.classList.remove("show");
                searchDropdown.innerHTML = "";
                return;
            }

            // 2. 过滤歌曲 (匹配歌名 或 歌手)
            // 注意：确保 allSongsCache 已经加载 (iframe 通信已完成)
            const matches = allSongsCache.filter(song => {
                return (song.title && song.title.toLowerCase().includes(keyword)) || 
                       (song.artist && song.artist.toLowerCase().includes(keyword));
            });

            // 3. 渲染结果
            renderSearchResults(matches, keyword);
        });

        // B. 渲染函数
        function renderSearchResults(songs, keyword) {
            searchDropdown.innerHTML = ""; // 清空旧结果

            if (songs.length === 0) {
                searchDropdown.innerHTML = `<div class="search-empty">未找到相关音乐</div>`;
            } else {
                songs.forEach(song => {
                    const item = document.createElement("div");
                    item.className = "search-item";
                    
                    // 高亮匹配文字 (简单的正则替换)
                    // 提示：这是一个纯视觉优化，如果觉得复杂可以去掉 highlight 逻辑
                    const regex = new RegExp(`(${keyword})`, 'gi');
                    const highlightTitle = song.title.replace(regex, '<span class="highlight-text">$1</span>');
                    const highlightArtist = song.artist.replace(regex, '<span class="highlight-text">$1</span>');

                    item.innerHTML = `
                        <img src="${song.cover}" alt="${song.title}">
                        <div class="search-item-info">
                            <span class="search-item-title">${highlightTitle}</span>
                            <span class="search-item-artist">${highlightArtist}</span>
                        </div>
                    `;

                    // C. 点击事件：播放音乐
                    item.addEventListener("click", () => {
                        console.log(`[搜索] 选中播放: ${song.title} (ID: ${song.id})`);
                        
                        // 1. 发送播放命令给 iframe
                        postCommand({ type: 'loadAndPlay', id: song.id });
                        
                        // 2. 唤起全屏播放器 (这是你现有的逻辑)
                        if (fullPlayerModal) {
                            fullPlayerModal.classList.add('show');
                            bottomPlayerControls.style.display = 'none';
                        }

                        // 3. 清空并隐藏搜索框
                        searchInput.value = "";
                        searchDropdown.classList.remove("show");
                    });

                    searchDropdown.appendChild(item);
                });
            }
            
            // 显示下拉框
            searchDropdown.classList.add("show");
        }

        // D. 点击外部关闭下拉框 (UX 优化)
        document.addEventListener("click", (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove("show");
            }
        });

        // E. 聚焦输入框时，如果有内容则再次显示
        searchInput.addEventListener("focus", () => {
            if (searchInput.value.trim().length > 0) {
                // 触发一次 input 事件来重新搜索/显示
                searchInput.dispatchEvent(new Event('input'));
            }
        });
    }

    // ====================
    // 4. 侧边栏导航切换 (已修复)
    // ====================
    const navMenuItems = document.querySelectorAll('.nav-item-music');
    const contentSections = document.querySelectorAll('.content-section');

    navMenuItems.forEach((item, index) => {
        item.addEventListener('click', function() {
            navMenuItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            
            this.classList.add('active');
            
            const activeSection = contentSections[index];
            if (activeSection) {
                activeSection.classList.add('active');
                
                // (关键修复) 检查 ID 并加载相应内容
                const sectionId = activeSection.id;
                
                // (修改) "最近播放" 和 "收藏" 不再在这里触发加载
                // 它们由 iframe 的消息触发
                
                if (sectionId === 'local' && !isDataLoaded.local) {
                    loadLocalMusic();
                }
            }
        });
    });

    if (contentSections.length > 0) {
        contentSections[0].classList.add('active');
    }

    // ====================
    // 5. 播放器功能 (已修改)
    // ====================
    
function attachCardClickListeners() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.addEventListener('click', function(event) {
            // A. 检查是否点击了【添加到下一首】按钮
            const addBtn = event.target.closest('.add-to-next-btn');
            if (addBtn) {
                event.preventDefault();
                event.stopPropagation(); // 阻止冒泡，防止触发播放
                
                const card = addBtn.closest('.music-card, .playlist-item');
                const songId = card.dataset.songId;
                
                if (songId) {
                    console.log(`[父页面] 请求将歌曲 ID ${songId} 添加到下一首`);
                    postCommand({ type: 'addToNext', id: parseInt(songId) });
                    showToast("已添加到下一首播放"); // 显示提示
                }
                return; // 结束，不执行下面的播放逻辑
            }

            // B. 原有的播放逻辑 (点击卡片其他区域)
            const card = event.target.closest('.music-card, .playlist-item');
            if (!card) return;
            
            if (event.target.closest('a')) event.preventDefault(); 

            const playerIframe = document.getElementById('player-iframe');
            const songId = card.dataset.songId; 
            
            if (songId !== undefined && playerIframe) {
                playerIframe.contentWindow.postMessage({ 
                    type: 'loadAndPlay', 
                    id: parseInt(songId) 
                }, '*'); 
            }
        });
    }
    // ====================
    // 6. 编辑资料功能
    // ====================
    const editProfileInPageBtn = document.getElementById('saveProfileInPage');
    const avatarOptionsEdit = document.querySelectorAll('.avatar-option-edit');
    const previewAvatar = document.querySelector('.preview-avatar');
    const previewName = document.querySelector('.profile-preview h3');
    const previewBio = document.querySelector('.preview-bio');
    const editUsernameInput = document.getElementById('editUsername');
    const editBioInput = document.getElementById('editBio');

    let selectedAvatarEdit = previewAvatar ? previewAvatar.src : '';

    avatarOptionsEdit.forEach(option => {
        option.addEventListener('click', function() {
            avatarOptionsEdit.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedAvatarEdit = this.src;
            if (previewAvatar) {
                previewAvatar.src = this.src;
            }
        });
    });

    if (editProfileInPageBtn) {
        editProfileInPageBtn.addEventListener('click', function() {
            const newUsername = editUsernameInput.value.trim();
            const newBio = editBioInput.value.trim();
            
            if (newUsername) {
                if (previewName) previewName.textContent = newUsername;
                if (previewBio) previewBio.textContent = newBio || '这个人很懒，什么都没有写...';
                if (previewAvatar) previewAvatar.src = selectedAvatarEdit;
                
                const profileName = document.querySelector('.profile h2');
                const profileImg = document.querySelector('.profile-img');
                const profileBio = document.querySelector('.profile p');

                if (profileName) profileName.textContent = newUsername;
                if (profileImg) profileImg.src = selectedAvatarEdit;
                if (profileBio) profileBio.textContent = newBio || '音乐爱好者';
                
                alert('资料更新成功！');
            } else {
                alert('请输入用户名！');
            }
        });
    }

    if (editUsernameInput) {
        editUsernameInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (value && previewName) {
                previewName.textContent = value;
            }
        });
    }

    if (editBioInput) {
        editBioInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (previewBio) {
                previewBio.textContent = value || '这个人很懒，什么都没有写...';
            }
        });
    }

    // ====================
    // 7. 登录弹窗功能
    // ====================
    const loginModal = document.getElementById("loginModal");
    const showLoginBtn = document.querySelector('.login-register');
    const closeLoginBtn = document.querySelector('#loginModal .close-modal');
    const loginForm = document.getElementById("loginForm");

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', function() {
            loginModal.style.display = "flex";
        });
    }
    if (closeLoginBtn) {
        closeLoginBtn.addEventListener('click', function() {
            loginModal.style.display = "none";
        });
    }
    if (loginModal) {
        loginModal.addEventListener("click", function(event) {
            if (event.target === loginModal) {
                loginModal.style.display = "none";
            }
        });
    }
    if (loginForm) {
        loginForm.addEventListener("submit", function(event) {
            event.preventDefault();
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            alert(`登录成功！欢迎 ${username}`);
            loginModal.style.display = "none";
        });
    }

    // ====================
    // 8. 动态加载 (已修改)
    // ====================

    // (新增) 主函数：从 Iframe 获取所有歌曲数据
    function loadAllSongsData() {
        console.log('[父页面] 正在向 Iframe 请求所有歌曲数据...');
        postCommand({ type: 'requestAllSongs' });
    }

    // (重大修改) 渲染收藏
    // (修改) 不再接收参数，而是从缓存中读取
    function renderFavorites() {
        console.log('[父页面] 正在渲染 收藏...');
        const musicGrid = document.querySelector('#favorites-grid');
        if (!musicGrid) return;

        musicGrid.innerHTML = ''; // 清空
        
        // (修改) 检查 `favoritesCache` (ID 列表) 是否为空
        if (!favoritesCache || favoritesCache.length === 0) {
            musicGrid.innerHTML = '<p class="empty-playlist-message">还没有收藏的音乐哦</p>';
            return;
        }

        // (修改) 遍历 ID 列表，并从 `allSongsCache` 中查找歌曲信息
        favoritesCache.forEach(songId => {
            const songInfo = allSongsCache.find(song => song.id === songId);
            
            if (songInfo) {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.dataset.songId = songInfo.id;
                
                card.innerHTML = `
                    <img src="${songInfo.cover}" alt="${songInfo.title} 专辑封面" class="album-cover">
                    <div class="music-info">
                        <div class="music-title">${songInfo.title}</div>
                        <div class="music-artist">${songInfo.artist}</div>
                    </div>
                    <button class="add-to-next-btn" title="添加到下一首播放">
                        <i class="fas fa-plus"></i>
                    </button>
                `;
                musicGrid.appendChild(card);
            }
        });
        isDataLoaded.favorites = true;
    }

    // (新增) 请求最近播放
    function loadRecentlyPlayed() {
        console.log('[父页面] 正在向 Iframe 请求最近播放列表...');
        postCommand({ type: 'requestRecentlyPlayed' });
    }
    
    // (新增) 渲染最近播放
    function renderRecentlyPlayed(playlist) {
        console.log('[父页面] 正在渲染 最近播放...');
        recentlyPlayedCache = playlist;
        isDataLoaded.recent = true;
        
        const container = document.getElementById('recent-playlist-body');
        if (!container) return;
        
        container.innerHTML = ''; // 清空
        
        // (修改) 检查传入的 playlist 是否为空
        if (!playlist || playlist.length === 0) {
            container.innerHTML = '<p class="empty-playlist-message">还没有播放记录哦</p>';
            return;
        }
        
        playlist.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.songId = song.id;
            
            item.innerHTML = `
                <div class="playlist-number">${index + 1}</div>
                <div class="playlist-title">
                    <img src="${song.cover}" alt="${song.title}">
                    <div>${song.title}</div>
                </div>
                <div class="playlist-artist">${song.artist}</div>
                <div class="playlist-album">${song.album}</div>
                <div class="playlist-duration">...</div> 
            `;
            container.appendChild(item);
        });
    }

    // (新增) 请求本地音乐 (即所有歌曲)
    function loadLocalMusic() {
        console.log('[父页面] 正在加载本地音乐...');
        // 如果数据已缓存，直接渲染
        if (allSongsCache.length > 0) {
            renderLocalMusic(allSongsCache);
        } else {
            // 否则去 iframe 请求
            postCommand({ type: 'requestAllSongs' });
        }
    }

// (新增) 渲染本地音乐 (按歌手分类) - 【已修复按钮缺失问题】
    function renderLocalMusic(allSongs) {
        console.log('[父页面] 正在渲染 本地音乐 (按歌手)...');
        isDataLoaded.local = true;
        
        const container = document.getElementById('local-music-container');
        if (!container) return;
        
        container.innerHTML = ''; // 清空
        
        // 1. 按歌手分组
        const groupedByArtist = allSongs.reduce((acc, song) => {
            const artist = song.artist || '未知艺术家';
            if (!acc[artist]) {
                acc[artist] = [];
            }
            acc[artist].push(song);
            return acc;
        }, {});
        
        // 2. 生成 HTML
        for (const artist in groupedByArtist) {
            // A. 添加歌手标题
            const title = document.createElement('h2');
            title.textContent = artist;
            container.appendChild(title);
            
            // B. 创建该歌手的网格
            const grid = document.createElement('div');
            grid.className = 'music-grid';
            
            // C. 填充歌曲卡片
            groupedByArtist[artist].forEach(songInfo => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.dataset.songId = songInfo.id;
                
                // 【关键】这里加入了 button.add-to-next-btn
                card.innerHTML = `
                    <img src="${songInfo.cover}" alt="${songInfo.title} 专辑封面" class="album-cover">
                    <div class="music-info">
                        <div class="music-title">${songInfo.title}</div>
                        <div class="music-artist">${songInfo.artist}</div>
                    </div>
                    <button class="add-to-next-btn" title="添加到下一首播放">
                        <i class="fas fa-plus"></i>
                    </button>
                `;
                grid.appendChild(card);
            });
            
            container.appendChild(grid);
        }
    }

    // ====================
    // 9. 连接全屏播放器
    // ====================
    const bottomPlayerControls = document.querySelector('.player-controls');
    const fullPlayerModal = document.getElementById('full-player-modal');
    const closePlayerModalBtn = document.getElementById('close-player-modal');
    const playerIframe = document.getElementById('player-iframe');

    if (bottomPlayerControls) {
        bottomPlayerControls.style.cursor = 'pointer'; 
        bottomPlayerControls.addEventListener('click', function(event) {
            
            if (event.target.closest('.left-buttons') || 
                event.target.closest('.center-buttons') || 
                event.target.closest('.right-buttons') ||
                event.target.closest('.time-control') ||
                event.target.closest('.now-playing')) {
                return; 
            }
            
            if (fullPlayerModal) {
                fullPlayerModal.classList.add('show');
                bottomPlayerControls.style.display = 'none';
            }
        });
    }

    if (closePlayerModalBtn) {
        closePlayerModalBtn.addEventListener('click', function() {
            if (fullPlayerModal && bottomPlayerControls) {
                fullPlayerModal.classList.remove('show');
                setTimeout(() => {
                    bottomPlayerControls.style.display = 'grid';
                }, 400); 
            }
        });
    }
    
    // ====================
    // 10. Iframe 通信 (父页面/遥控器)
    // ====================
    
    // --- A. 获取所有 UI 元素 ---
    const bottomPlayPauseBtn = document.getElementById('bottom-play-pause');
    const bottomPlayPauseIcon = document.getElementById('bottom-play-pause-icon');
    const bottomNextBtn = document.getElementById('bottom-btn-next');
    const bottomPrevBtn = document.getElementById('bottom-btn-prev');
    const bottomHeartBtn = document.getElementById('bottom-btn-favorite');
    const bottomHeartIcon = document.getElementById('bottom-favorite-icon');
    const bottomRepeatBtn = document.getElementById('bottom-btn-repeat');
    const bottomRepeatIcon = document.getElementById('bottom-repeat-icon');

    const bottomNowPlayingImg = document.querySelector('.player-controls .now-playing img');
    const bottomTrackTitle = document.querySelector('.player-controls .track-info h4');
    const bottomTrackArtist = document.querySelector('.player-controls .track-info p');
    
    const bottomProgress = document.querySelector('.player-controls .progress');
    const bottomProgressBar = document.querySelector('.player-controls .progress-bar');
    const bottomCurrentTime = document.querySelector('.player-controls .time-current');
    const bottomTotalTime = document.querySelector('.player-controls .time-total');

    const bottomVolumeBar = document.querySelector('.player-controls .right-buttons .volume-bar');
    const bottomVolumeLevel = document.querySelector('.player-controls .right-buttons .volume-level');
    const bottomVolumeBtn = document.getElementById('bottom-btn-volume');
    const bottomVolumeIcon = document.getElementById('bottom-volume-icon');
    
    const bottomPlaylistBtn = document.getElementById('bottom-btn-playlist');
    const bottomPlaylistModalOverlay = document.getElementById('bottom-playlist-modal-overlay');
    const bottomPlaylistModal = document.getElementById('bottom-playlist-modal');
    const bottomPlaylistCloseBtn = document.getElementById('bottom-btn-close-modal');
    const bottomPlaylistListUl = document.getElementById('bottom-playlist-song-list');

    let currentIframeState = {}; 
    let cachedPlaylistData = [];
    let isSeeking = false;
    let isDraggingVolume = false;

    // --- B. 格式化时间的辅助函数 ---
    function formatTime(s) {
        if (isNaN(s) || s < 0) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0'+sec : sec}`;
    }

    // --- C. (已更新) 更新底部栏 UI 的函数 ---
    function updateBottomBarUI(state) {
        if (!state) return;
        
        // (新增) 检查歌曲是否变化
        const songChanged = (!currentIframeState.song || (state.song && currentIframeState.song.id !== state.song.id));
        
        currentIframeState = state; 

        // 歌曲信息
        if (state.song) {
            if (bottomNowPlayingImg) bottomNowPlayingImg.src = state.song.cover;
            if (bottomTrackTitle) bottomTrackTitle.textContent = state.song.title;
            if (bottomTrackArtist) bottomTrackArtist.textContent = state.song.artist;
            if (bottomPlayerControls) { 
                bottomPlayerControls.style.setProperty('--player-bg-image', `url("${state.song.cover}")`);
            }
        }
        
        // 播放/暂停
        if (bottomPlayPauseIcon) {
            if (state.isPlaying) {
                bottomPlayPauseIcon.src = 'icon/24gl-pause.png';
            } else {
                bottomPlayPauseIcon.src = 'icon/24gl-play.png';
            }
        }

        if (!isSeeking) {
            updateBottomBarTime(state.currentTime, state.duration);
        }
        
        // 收藏
        // 收藏 (修复版：增加 classList 操作)
        if (bottomHeartIcon) {
            if (state.isFavorite) {
                bottomHeartIcon.src = 'icon/24gl-heart-filled.png';
                // 【关键修复】添加 .active 类，触发 CSS 动画
                if (bottomHeartBtn) bottomHeartBtn.classList.add('active'); 
            } else {
                bottomHeartIcon.src = 'icon/24gl-heart.png';
                // 【关键修复】移除 .active 类
                if (bottomHeartBtn) bottomHeartBtn.classList.remove('active');
            }
        }
        
        // 循环/随机
        if (bottomRepeatIcon) {
            if (state.playMode === 'shuffle') {
                bottomRepeatIcon.src = 'icon/24gl-shuffle.png';
            } else if (state.playMode === 'one') {
                bottomRepeatIcon.src = 'icon/24gl-repeatOnce2.png';
            } else {
                bottomRepeatIcon.src = 'icon/24gl-repeat2.png';
            }
        }

        if (!isDraggingVolume) {
            if (bottomVolumeLevel) bottomVolumeLevel.style.width = `${state.volume * 100}%`;
            if (bottomVolumeIcon) {
                if (state.isMuted || state.volume === 0) {
                    bottomVolumeIcon.src = 'icon/24gl-volumeCross.png';
                } else if (state.volume < 0.33) {
                    bottomVolumeIcon.src = 'icon/24gl-volumeLow.png';
                } else if (state.volume < 0.66) {
                    bottomVolumeIcon.src = 'icon/24gl-volumeMiddle.png';
                } else {
                    bottomVolumeIcon.src = 'icon/24gl-volumeHigh.png';
                }
            }
        }
    }
    
    function updateBottomBarTime(time, duration) {
        if (bottomCurrentTime) bottomCurrentTime.textContent = formatTime(time);
        if (bottomTotalTime) bottomTotalTime.textContent = formatTime(duration);
        if (bottomProgress && duration > 0) {
            bottomProgress.style.width = `${(time / duration) * 100}%`;
        } else if (bottomProgress) {
            bottomProgress.style.width = '0%';
        }
    }

    // --- D. 渲染底部播放列表的函数 ---
    function renderBottomPlaylist(playlist, currentSongId, isPlaying) {
        if (!bottomPlaylistListUl) return;
        bottomPlaylistListUl.innerHTML = '';
        
        playlist.forEach(song => {
            const li = document.createElement('li');
            li.dataset.songId = song.id;
            
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

            li.addEventListener('click', () => {
                postCommand({ type: 'loadAndPlay', id: song.id });
                hideBottomPlaylist();
            });
            
            bottomPlaylistListUl.appendChild(li);
        });
    }

    // 显示/隐藏 模态框的函数
    function showBottomPlaylist() {
        postCommand({ type: 'requestPlaylist' });
        bottomPlaylistModalOverlay.style.display = 'block';
        bottomPlaylistModal.style.display = 'flex';
        setTimeout(() => {
            bottomPlaylistModalOverlay.classList.add('show');
            bottomPlaylistModal.classList.add('show');
        }, 10);
    }
    
    function hideBottomPlaylist() {
        bottomPlaylistModalOverlay.classList.remove('show');
        bottomPlaylistModal.classList.remove('show');
        setTimeout(() => {
            bottomPlaylistModalOverlay.style.display = 'none';
            bottomPlaylistModal.style.display = 'none';
        }, 300);
    }


    // --- E. (已更新) 监听来自 Iframe 的消息 ---
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (typeof data !== 'object' || !data.type) return;

        switch(data.type) {
            // (=== 关键修复：添加 'playerReady' 监听器 ===)
            case 'playerReady':
                console.log('[父页面] Iframe is ready. Requesting initial data and checking URL.');
                
                // 1. (已移动) 现在才请求数据
                postCommand({ type: 'requestFullState' });
                loadAllSongsData();
                loadRecentlyPlayed();

                // 2. (已移动) 现在才检查 URL 参数
                const urlParams = new URLSearchParams(window.location.search);
                const songIdToPlay = urlParams.get('play');
                const isMvRequest = urlParams.get('mv') === 'true';
                
                if (songIdToPlay !== null) {
                    const songIdInt = parseInt(songIdToPlay);
                    console.log(`[父页面] URL 请求播放 ID: ${songIdInt}`);
                    
                    if (isMvRequest) {
                        console.log('[父页面] ...并请求立即播放 MV');
                        postCommand({ type: 'loadAndPlayMV', id: songIdInt });
                    } else {
                        postCommand({ type: 'loadAndPlay', id: songIdInt });
                    }
                    
                    // 自动打开全屏播放器
                    const fullPlayerModal = document.getElementById('full-player-modal');
                    const bottomPlayerControls = document.querySelector('.player-controls');
                    if (fullPlayerModal && bottomPlayerControls) {
                        fullPlayerModal.classList.add('show');
                        bottomPlayerControls.style.display = 'none';
                    }
                    
                    // 清理 URL
                    if (window.history.replaceState) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }
                break;
            // (=== 修复结束 ===)

            case 'playerStateUpdate':
                updateBottomBarUI(data);
                
                // (修改) 更新底部播放列表
                if (cachedPlaylistData.length > 0 && bottomPlaylistModal.classList.contains('show')) {
                     const currentSongId = data.song ? data.song.id : -1;
                     renderBottomPlaylist(cachedPlaylistData, currentSongId, data.isPlaying);
                }
                
                // (新增) 更新“最近播放”列表中的高亮
                if (isDataLoaded.recent) {
                    const recentItems = document.querySelectorAll('#recent-playlist-body .playlist-item');
                    recentItems.forEach(item => {
                        if (data.song && item.dataset.songId == data.song.id) {
                            item.classList.add('playing-item');
                        } else {
                            item.classList.remove('playing-item');
                        }
                    });
                }
                break;
            
            case 'timeUpdate':
                if (!isSeeking) {
                    currentIframeState.currentTime = data.currentTime; 
                    updateBottomBarTime(data.currentTime, currentIframeState.duration);
                }
                break;
            
            case 'playlistUpdate':
                cachedPlaylistData = data.playlist; 
                const isPlaying = (currentIframeState && currentIframeState.isPlaying) ? currentIframeState.isPlaying : false;
                renderBottomPlaylist(cachedPlaylistData, data.currentSongId, isPlaying);
                break;

            // (修改) 收到所有歌曲
            case 'allSongsUpdate':
                console.log('[父页面] 收到所有歌曲数据', data.songs);
                allSongsCache = data.songs;
                
                // 缓存新的收藏ID列表
                favoritesCache = data.favoriteIds || []; 
                
                // (关键修复) 收到此消息时，始终重新渲染收藏夹
                // (因为它也响应 'favoritesChanged' 事件)
                renderFavorites(); 
                
                // 检查是否需要渲染本地音乐
                if (document.getElementById('local').classList.contains('active') && !isDataLoaded.local) {
                    renderLocalMusic(allSongsCache);
                }
                break;
            
            // (新增) 收到最近播放
            case 'recentlyPlayedUpdate':
                console.log('[父页面] 收到最近播放数据', data.playlist);
                renderRecentlyPlayed(data.playlist); // (修改) 直接调用渲染
                break;
                
            // (新增) 响应 "historyChanged" 消息
            case 'historyChanged':
                console.log('[父页面] 播放历史已更新，请求新列表...');
                loadRecentlyPlayed(); // 请求新的“最近播放”列表
                break;
            
            // (新增) 响应 "favoritesChanged" 消息
            case 'favoritesChanged':
                console.log('[父页面] 收藏夹已更新，请求所有歌曲和收藏...');
                // 重新请求所有数据（包括新的收藏ID列表）
                loadAllSongsData(); 
                // (修改) 收到 'allSongsUpdate' 后，会自动调用 renderFavorites
                break;
            // (新增) 渲染本地音乐 (按歌手分类) - 【已修复按钮缺失问题】
    function renderLocalMusic(allSongs) {
        console.log('[父页面] 正在渲染 本地音乐 (按歌手)...');
        isDataLoaded.local = true;
        
        const container = document.getElementById('local-music-container');
        if (!container) return;
        
        container.innerHTML = ''; // 清空
        
        // 1. 按歌手分组
        const groupedByArtist = allSongs.reduce((acc, song) => {
            const artist = song.artist || '未知艺术家';
            if (!acc[artist]) {
                acc[artist] = [];
            }
            acc[artist].push(song);
            return acc;
        }, {});
        
        // 2. 生成 HTML
        for (const artist in groupedByArtist) {
            // A. 添加歌手标题
            const title = document.createElement('h2');
            title.textContent = artist;
            container.appendChild(title);
            
            // B. 创建该歌手的网格
            const grid = document.createElement('div');
            grid.className = 'music-grid';
            
            // C. 填充歌曲卡片
            groupedByArtist[artist].forEach(songInfo => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.dataset.songId = songInfo.id;
                
                // 【关键】这里加入了 button.add-to-next-btn
                card.innerHTML = `
                    <img src="${songInfo.cover}" alt="${songInfo.title} 专辑封面" class="album-cover">
                    <div class="music-info">
                        <div class="music-title">${songInfo.title}</div>
                        <div class="music-artist">${songInfo.artist}</div>
                    </div>
                    <button class="add-to-next-btn" title="添加到下一首播放">
                        <i class="fas fa-plus"></i>
                    </button>
                `;
                grid.appendChild(card);
            });
            
            container.appendChild(grid);
        }
    }
        }
    });

    // --- F. 向 Iframe 发送命令 ---
    function postCommand(command) {
        if (playerIframe && playerIframe.contentWindow) {
            playerIframe.contentWindow.postMessage(command, '*');
        } else {
            console.error('[父页面] Iframe 尚未准备好');
        }
    }

    // --- G. 绑定底部栏的控制事件 ---
    if (bottomPlayPauseBtn) bottomPlayPauseBtn.addEventListener('click', () => postCommand({ type: 'togglePlay' }));
    if (bottomNextBtn) bottomNextBtn.addEventListener('click', () => postCommand({ type: 'next' }));
    if (bottomPrevBtn) bottomPrevBtn.addEventListener('click', () => postCommand({ type: 'prev' }));
    if (bottomHeartBtn) bottomHeartBtn.addEventListener('click', () => postCommand({ type: 'toggleFavorite' }));
    if (bottomRepeatBtn) bottomRepeatBtn.addEventListener('click', () => postCommand({ type: 'toggleRepeat' }));

    function handleProgressDrag(e) {
        if (!currentIframeState.duration) return; 
        const rect = bottomProgressBar.getBoundingClientRect();
        let pct = (e.clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        updateBottomBarTime(pct * currentIframeState.duration, currentIframeState.duration);
    }
    
    if (bottomProgressBar) {
        bottomProgressBar.addEventListener('mousedown', function(e) {
            isSeeking = true;
            bottomProgressBar.classList.add('seeking'); 
            handleProgressDrag(e);
        });
    }
    
    document.addEventListener('mousemove', function(e) {
        if (isSeeking) {
            handleProgressDrag(e);
        }
    });
    
    document.addEventListener('mouseup', function(e) {
        if (isSeeking) {
            isSeeking = false;
            bottomProgressBar.classList.remove('seeking');
            const rect = bottomProgressBar.getBoundingClientRect();
            let pct = (e.clientX - rect.left) / rect.width;
            if (e.clientX < rect.left) pct = 0;
            if (e.clientX > rect.right) pct = 1;
            pct = Math.max(0, Math.min(1, pct));
            const newTime = currentIframeState.duration * pct;
            postCommand({ type: 'seek', time: newTime });
        }
    });
    
    function handleVolumeDrag(e) {
        const rect = bottomVolumeBar.getBoundingClientRect();
        let pct = (e.clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        if (bottomVolumeLevel) bottomVolumeLevel.style.width = `${pct * 100}%`;
        postCommand({ type: 'setVolume', volume: pct });
    }

    if (bottomVolumeBar) {
        bottomVolumeBar.addEventListener('mousedown', function(e) {
            isDraggingVolume = true;
            handleVolumeDrag(e);
            e.preventDefault();
        });
    }

    document.addEventListener('mousemove', function(e) {
        if (isDraggingVolume) {
            handleVolumeDrag(e);
        }
    });

    document.addEventListener('mouseup', function(e) {
        if (isDraggingVolume) {
            isDraggingVolume = false;
        }
    });
    
    if (bottomVolumeBtn) {
        bottomVolumeBtn.addEventListener('click', function() {
            const currentVolume = currentIframeState.volume || 0;
            const isMuted = currentIframeState.isMuted || false;
            let newVolume = 0;
            if (isMuted || currentVolume === 0) {
                newVolume = 0.7;
            }
            postCommand({ type: 'setVolume', volume: newVolume });
        });
    }

    if (bottomPlaylistBtn) {
        bottomPlaylistBtn.addEventListener('click', showBottomPlaylist);
    }
    if (bottomPlaylistCloseBtn) {
        bottomPlaylistCloseBtn.addEventListener('click', hideBottomPlaylist);
    }
    if (bottomPlaylistModalOverlay) {
        bottomPlaylistModalOverlay.addEventListener('click', function(event) {
            if (event.target === bottomPlaylistModalOverlay) {
                hideBottomPlaylist();
            }
        });
    }

    // --- H. (关键修复) Iframe 加载后 ---
    if (playerIframe) {
        playerIframe.addEventListener('load', () => {
            console.log('[父页面] Iframe 已加载。等待 playerReady 信号...');
            // 启动逻辑已全部移至 'playerReady' case，
            // 以防止竞态条件。
        });
    }
// ====================
    // 12. (新增) 磁吸按钮特效 (Magnetic Buttons)
    // ====================
    function initMagneticButtons() {
        // 1. 选择底部播放器的所有按钮
        const magneticBtns = document.querySelectorAll('.player-controls .btn');
        
        magneticBtns.forEach(btn => {
            // 2. 监听鼠标移动
            btn.addEventListener('mousemove', function(e) {
                const rect = btn.getBoundingClientRect();
                
                // 计算鼠标相对于按钮中心的位置
                // (e.clientX - rect.left) 是鼠标在按钮内的 X 坐标
                // (rect.width / 2) 是按钮中心的 X 坐标
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                // 3. 应用位移 (乘以一个系数 0.4，表示移动幅度是鼠标距离的 40%)
                // 这样按钮不会完全跟着鼠标跑，而是有一种"拉扯感"
                btn.style.transform = `translate(${x * 0.4}px, ${y * 0.4}px)`;
                
                // 暂时移除过渡，让跟随更跟手 (无延迟)
                btn.style.transition = 'transform 0s'; 
            });

            // 4. 监听鼠标离开
            btn.addEventListener('mouseleave', function() {
                // 复位
                btn.style.transform = 'translate(0px, 0px)';
                
                // 离开时加上弹性过渡，让复位有一个"回弹"的效果
                btn.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
            });
        });
    }

    // 立即启动磁吸效果
    initMagneticButtons();
    // ====================
    // 11. 启动
    // ====================
    
    // (新增) 立即渲染空状态
    renderFavorites(); // 将显示 "还没有收藏的音乐哦"
    renderRecentlyPlayed([]); // 将显示 "还没有播放记录哦"
    
    attachCardClickListeners(); // 启用事件委托

}); // 最终的 DOMContentLoaded 在这里结束