/*
 * app.js
 * 《音乐世界》SPA 主逻辑脚本
 * 包含：视图切换、全局特效、持久化播放器通信、页面逻辑合并
 */
function initTiltEffects() {
    // 移除旧的手写逻辑
    
    // 启用 Vanilla-tilt
    const cards = document.querySelectorAll(".content-card, .music-card, .chart-column");
    
    VanillaTilt.init(cards, {
        max: 12,
        speed: 400,
        glare: true,          // 开启高光
        "max-glare": 0.4,     // 高光强度
        scale: 1.02,
        perspective: 1000
    });
}
// app.js

function initFluidEffect() {
    const canvas = document.createElement('canvas');
    canvas.id = 'fluid-canvas';
    // 设置样式，确保在 Vanta 和 星空 之间，或者替代日间渐变
    Object.assign(canvas.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1, // 最底层
        pointerEvents: 'none' // 鼠标穿透，但库本身需要监听鼠标，这里需要特殊处理
    });
    document.body.appendChild(canvas);

    // 初始化流体
    // 注意：这个库通常会接管整个屏幕的鼠标事件，可能需要调整 z-index 允许点击
    // 这里我们用一个简单的配置
    webglFluidSimulation(canvas, {
        IMMEDIATE: true, // 立即加载
        TRIGGER: 'hover', // 鼠标滑过触发
        SIM_RESOLUTION: 128, // 分辨率，越低性能越好
        DYE_RESOLUTION: 512,
        DENSITY_DISSIPATION: 1, // 消失速度
        VELOCITY_DISSIPATION: 0.2,
        PRESSURE: 0.8,
        PRESSURE_ITERATIONS: 20,
        CURL: 30,
        SPLAT_RADIUS: 0.25,
        SPLAT_FORCE: 6000,
        SHADING: true,
        COLORFUL: true, // 彩色模式
        SUNRAYS: true, // 光线投射
    });
    
    // 控制显示逻辑：日间显示流体，夜间显示星空
    const updateBackground = () => {
        const isDark = document.body.classList.contains('dark-mode');
        canvas.style.opacity = isDark ? 0 : 0.6; // 日间半透明，夜间隐藏
    };
    
    // 监听主题切换按钮
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        setTimeout(updateBackground, 100);
    });
    updateBackground();
}

// 记得在 DOMContentLoaded 里调用 initFluidEffect();
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[APP] 启动中...");

  // =======================================
  // 1. 全局变量与状态
  // =======================================
  let allSongsCache = [];
  let favoritesCache = [];
  let recentlyPlayedCache = [];
  let isDataLoaded = {
    favorites: false,
    recent: false,
    local: false,
  };
  
  // 播放器状态
  let currentIframeState = {};
  let cachedPlaylistData = [];
  let isSeeking = false;
  let isDraggingVolume = false;

  // =======================================
  // 2. 视图切换系统 (SPA Router)
  // =======================================
  const navLinks = document.querySelectorAll(".nav-item");
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  const views = document.querySelectorAll(".spa-view");
  const navPill = document.querySelector(".nav-pill");
  const navOptions = document.querySelector(".nav-options");

  // 初始化 Pill
  function initPill() {
    const activeItem = document.querySelector(".nav-item.active");
    if (activeItem) movePill(activeItem);
  }

  function movePill(targetItem) {
    if (!targetItem || !navPill || !navOptions) return;
    if (window.innerWidth <= 768) {
      navPill.style.opacity = "0";
      return;
    }
    const containerRect = navOptions.getBoundingClientRect();
    const targetRect = targetItem.getBoundingClientRect();
    navPill.style.width = `${targetRect.width}px`;
    navPill.style.height = `${targetRect.height}px`;
    navPill.style.left = `${targetRect.left - containerRect.left}px`;
    navPill.style.top = `${targetRect.top - containerRect.top}px`;
    navPill.style.opacity = "1";
  }

  // 切换视图主函数
  function switchView(pageName, targetAnchor = null) {
    // 1. 切换 active 类
    views.forEach((view) => {
      if (view.id === `view-${pageName}`) {
        view.classList.add("active");
      } else {
        view.classList.remove("active");
      }
    });

    // 2. 更新导航栏状态
    navLinks.forEach((link) => {
        // 简单的匹配逻辑，只点亮 page 对应的 tab
        if (link.dataset.page === pageName && !link.dataset.target) {
             link.classList.add("active");
             movePill(link);
        } else if (pageName === 'home' && link.dataset.target === targetAnchor) {
             // 特殊处理：如果是首页的锚点链接被点击，保持 active
        } else {
            link.classList.remove("active");
        }
    });
    
    // 保持 Home 高亮，如果是在 home 页面内的锚点
    if(pageName === 'home') {
        const homeNav = document.querySelector('.nav-item[data-page="home"][data-target="home"]');
        if(homeNav) {
            homeNav.classList.add('active');
            movePill(homeNav);
        }
    }

    // 3. 处理锚点滚动
    if (targetAnchor && pageName === 'home') {
      setTimeout(() => {
        const element = document.getElementById(targetAnchor);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // 绑定导航点击事件
  [...navLinks, ...sidebarLinks].forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.page || 'home'; // 侧边栏默认是home
      const target = link.dataset.target || null;
      
      // 如果是侧边栏，没有 data-page，默认切到 home 并滚动
      if(link.classList.contains('sidebar-link')) {
           switchView('home', target);
      } else {
           switchView(page, target);
      }
    });
  });
  
  // 药丸交互
  navLinks.forEach(item => {
      item.addEventListener('mouseenter', () => movePill(item));
  });
  navOptions.addEventListener('mouseleave', () => {
      const active = document.querySelector(".nav-item.active");
      if(active) movePill(active);
  });
  
  initPill();


  // =======================================
  // 3. 全局特效 (Stars, Snow, Theme)
  // =======================================
  
  // 主题切换
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  if (themeToggleBtn) {
      const currentTheme = localStorage.getItem("music-theme");
      if (currentTheme === "dark") document.body.classList.add("dark-mode");
      themeToggleBtn.addEventListener("click", () => {
          document.body.classList.toggle("dark-mode");
          let theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
          localStorage.setItem("music-theme", theme);
          initVanta(); // 刷新 Vanta 颜色
      });
  }

  // Vanta.js 背景
  let vantaEffect = null;
  function initVanta() {
      const vantaContainer = document.getElementById('home');
      if (!vantaContainer) return;
      if (vantaEffect) vantaEffect.destroy();
      
      if (typeof VANTA !== 'undefined' && typeof THREE !== 'undefined') {
          const isDark = document.body.classList.contains('dark-mode');
          vantaEffect = VANTA.WAVES({
              el: vantaContainer,
              THREE: THREE,
              mouseControls: true, touchControls: true, gyroControls: false,
              minHeight: 200.00, minWidth: 200.00, scale: 1.00, scaleMobile: 1.00,
              color: isDark ? 0x5aa4e6 : 0x423b63,
              shininess: 30.00, waveHeight: 15.00, waveSpeed: 0.8, zoom: 0.75,
          });
      }
  }
  initVanta();

  // Starfield (Canvas)
  function initStarfield() {
      const canvas = document.getElementById('starfield-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let width, height, stars = [];
      let speed = 0.1;
      
      function resize() {
          width = window.innerWidth; height = window.innerHeight;
          canvas.width = width; canvas.height = height;
      }
      class Star {
          constructor() { this.init(true); }
          init(randomZ) {
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.sqrt(Math.random()) * width * 1.5;
              this.x = Math.cos(angle) * radius; this.y = Math.sin(angle) * radius;
              this.z = randomZ ? Math.random() * width * 2 : width * 2;
              this.ox = this.x; this.oy = this.y; this.oz = this.z;
          }
          update() {
              this.oz -= speed;
              if (this.oz < 1) this.init(false);
          }
          draw() {
              const fov = 400;
              const scale = fov / (fov + this.oz);
              const sx = this.ox * scale + width / 2;
              const sy = this.oy * scale + height / 2;
              const size = (1 - this.oz / (width * 2)) * 1.2;
              let opacity = (1 - this.oz / (width * 2)) * 0.8;
              if (opacity < 0) opacity = 0;
              ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, size), 0, Math.PI * 2);
              ctx.fillStyle = `rgba(180, 200, 230, ${opacity})`; ctx.fill();
          }
      }
      function animate() {
          ctx.clearRect(0, 0, width, height);
          stars.forEach(star => { star.update(); star.draw(); });
          requestAnimationFrame(animate);
      }
      resize();
      for (let i = 0; i < 2000; i++) stars.push(new Star());
      window.addEventListener('resize', resize);
      animate();
  }
  initStarfield();

  // Shooting Stars & Snow (Simulated)
  const starsContainer = document.querySelector('.shooting-stars-container');
  if (starsContainer) {
      for (let i = 0; i < 60; i++) {
          const s = document.createElement('div'); s.className = 'shooting-star';
          s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
          s.style.animationDelay = Math.random() * 5 + 's'; s.style.animationDuration = (5 + Math.random() * 5) + 's';
          starsContainer.appendChild(s);
      }
  }
  
  const snowflakeCanvas = document.getElementById('snowflake-canvas');
  let snowflakeTimer = null;
  document.addEventListener('mousemove', (e) => {
      if (!snowflakeTimer) {
          snowflakeTimer = setTimeout(() => {
              if(snowflakeCanvas) {
                  const f = document.createElement('div'); f.className = 'mouse-snowflake';
                  f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px';
                  f.style.setProperty('--drift-x', (Math.random()-0.5)*100 + 'px');
                  f.style.setProperty('--drift-y', (100+Math.random()*100) + 'px');
                  snowflakeCanvas.appendChild(f);
                  setTimeout(() => f.remove(), 2000);
              }
              snowflakeTimer = null;
          }, 50);
      }
  });

  // =======================================
  // 4. 首页 (Homepage) 逻辑
  // =======================================
  
  // Header Scroll
  const header = document.getElementById("header");
  window.addEventListener("scroll", () => {
      if (window.scrollY > 50) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
  });

  // 加载歌曲数据并渲染首页卡片
  async function fetchAllSongInfo() {
      let songFolders = [];
      try {
          const response = await fetch('playlist.json');
          songFolders = await response.json();
      } catch (e) { return []; }
      
      let list = [];
      for (let i = 0; i < songFolders.length; i++) {
          const folder = songFolders[i];
          try {
              const res = await fetch(`songs/${folder}/info.json`);
              const info = await res.json();
              list.push({ id: i, title: info.title, artist: info.artist, cover: `songs/${folder}/cover.jpg` });
          } catch (e) {}
      }
      return list;
  }

  async function renderHomepageSections() {
      const discoverTrack = document.querySelector('#discover .content-track');
      const newReleaseTrack = document.querySelector('#new-releases .content-track');
      
      // 骨架屏
      const skeletonHTML = new Array(5).fill(`
          <div class="skeleton-card">
              <div class="skeleton-bg skeleton-image"></div>
              <div class="skeleton-bg skeleton-content"><div class="skeleton-line title"></div><div class="skeleton-line artist"></div></div>
          </div>`).join('');
      if (discoverTrack) discoverTrack.innerHTML = skeletonHTML;
      if (newReleaseTrack) newReleaseTrack.innerHTML = skeletonHTML;

      const allSongs = await fetchAllSongInfo();
      allSongsCache = allSongs; // 缓存全局使用

      const createCard = (song) => `
          <div class="content-card" onclick="playSong(${song.id})" data-id="${song.id}">
            <div class="card-image"><img src="${song.cover}" alt="${song.title}"><div class="play-icon"><i class="fas fa-play"></i></div></div>
            <div class="card-content"><h3 class="card-title">${song.title}</h3><p class="card-artist">${song.artist}</p></div>
          </div>`;

      if (discoverTrack && allSongs.length) {
          const shuffled = [...allSongs].sort(() => 0.5 - Math.random());
          discoverTrack.innerHTML = shuffled.map(createCard).join('');
          initInfiniteMarquee("#discover .content-carousel-container");
      }
      if (newReleaseTrack && allSongs.length) {
          const newSongs = allSongs.slice(-10).reverse();
          newReleaseTrack.innerHTML = newSongs.map(createCard).join('');
          initInfiniteMarquee("#new-releases .content-carousel-container");
      }
      
      // 初始化 3D 倾斜
      document.querySelectorAll('.content-card').forEach(card => {
          card.addEventListener('mousemove', (e) => {
              const rect = card.getBoundingClientRect();
              const x = e.clientX - rect.left, y = e.clientY - rect.top;
              card.style.transform = `rotateX(${(y/rect.height-0.5)*-12}deg) rotateY(${(x/rect.width-0.5)*12}deg)`;
          });
          card.addEventListener('mouseleave', () => card.style.transform = `rotateX(0) rotateY(0)`);
      });
  }
  
  function initInfiniteMarquee(selector) {
      const container = document.querySelector(selector);
      if(!container || typeof gsap === 'undefined') return;
      const track = container.querySelector(".content-track");
      const cards = Array.from(track.children);
      if(!cards.length) return;
      
      let totalWidth = 0;
      const gap = 20;
      cards.forEach(c => totalWidth += c.offsetWidth + gap);
      
      // Clone to fill width
      while(totalWidth < Math.max(window.innerWidth * 2, 3000)) {
          cards.forEach(c => track.appendChild(c.cloneNode(true)));
          totalWidth += cards[0].offsetWidth + gap * cards.length;
      }
      
      const anim = gsap.to(track, { x: `-=${totalWidth/2}`, duration: totalWidth/100, ease: "none", repeat: -1 });
      container.addEventListener('mouseenter', () => gsap.to(anim, { timeScale: 0.2, duration: 0.5 }));
      container.addEventListener('mouseleave', () => gsap.to(anim, { timeScale: 1, duration: 0.5 }));
  }

  // Swiper for MV
  if (typeof Swiper !== 'undefined') {
      new Swiper('.mv-swiper-container', {
          effect: 'coverflow', grabCursor: true, centeredSlides: true, slidesPerView: 'auto', loop: true,
          coverflowEffect: { rotate: 40, stretch: 0, depth: 100, modifier: 1, slideShadows: true },
          pagination: { el: '.swiper-pagination', clickable: true }
      });
  }

  // =======================================
  // 5. 我的音乐 (MyMusic) 逻辑
  // =======================================
  
  // 侧边栏导航切换 (MyMusic 内)
  const myMusicNavItems = document.querySelectorAll('.nav-item-music');
  const myMusicSections = document.querySelectorAll('#view-mymusic .music-content-section');
  
  myMusicNavItems.forEach((item) => {
      item.addEventListener('click', () => {
          // 移除所有 active 状态
          myMusicNavItems.forEach(n => n.classList.remove('active'));
          myMusicSections.forEach(s => s.classList.remove('active'));
          
          // 添加当前 active
          item.classList.add('active');
          const targetTab = item.dataset.tab;
          const activeSection = document.getElementById(`tab-${targetTab}`);
          if(activeSection) activeSection.classList.add('active');
          
          // 懒加载
          if(targetTab === 'local' && !isDataLoaded.local) renderLocalMusic(allSongsCache);
      });
  });

  function renderFavorites() {
      const grid = document.querySelector('#favorites-grid');
      if (!grid) return;
      grid.innerHTML = '';
      if (!favoritesCache || favoritesCache.length === 0) {
          grid.innerHTML = '<p class="empty-playlist-message">还没有收藏的音乐哦</p>';
          return;
      }
      favoritesCache.forEach(id => {
          const song = allSongsCache.find(s => s.id === id);
          if (song) {
              const card = document.createElement('div');
              card.className = 'music-card';
              card.dataset.songId = song.id;
              card.innerHTML = `
                  <img src="${song.cover}" class="album-cover">
                  <div class="music-info"><div class="music-title">${song.title}</div><div class="music-artist">${song.artist}</div></div>
                  <button class="add-to-next-btn" title="添加到下一首"><i class="fas fa-plus"></i></button>`;
              grid.appendChild(card);
          }
      });
  }

  function renderRecentlyPlayed(playlist) {
      const container = document.getElementById('recent-playlist-body');
      if (!container) return;
      container.innerHTML = '';
      if (!playlist || playlist.length === 0) {
          container.innerHTML = '<p class="empty-playlist-message">还没有播放记录哦</p>';
          return;
      }
      playlist.forEach((song, idx) => {
          const item = document.createElement('div');
          item.className = 'playlist-item';
          item.dataset.songId = song.id;
          item.innerHTML = `
              <div class="playlist-number">${idx + 1}</div>
              <div class="playlist-title"><img src="${song.cover}"><div>${song.title}</div></div>
              <div class="playlist-artist">${song.artist}</div>
              <div class="playlist-album">${song.album || '-'}</div>
              <div class="playlist-duration">...</div>`;
          container.appendChild(item);
      });
  }

  function renderLocalMusic(allSongs) {
      isDataLoaded.local = true;
      const container = document.getElementById('local-music-container');
      if (!container) return;
      container.innerHTML = '';
      
      const grouped = allSongs.reduce((acc, song) => {
          const key = song.artist || '未知';
          if (!acc[key]) acc[key] = [];
          acc[key].push(song);
          return acc;
      }, {});

      for (const artist in grouped) {
          const h2 = document.createElement('h2'); h2.textContent = artist; container.appendChild(h2);
          const grid = document.createElement('div'); grid.className = 'music-grid';
          grouped[artist].forEach(song => {
              const card = document.createElement('div'); card.className = 'music-card'; card.dataset.songId = song.id;
              card.innerHTML = `
                  <img src="${song.cover}" class="album-cover">
                  <div class="music-info"><div class="music-title">${song.title}</div><div class="music-artist">${song.artist}</div></div>
                  <button class="add-to-next-btn" title="添加到下一首"><i class="fas fa-plus"></i></button>`;
              grid.appendChild(card);
          });
          container.appendChild(grid);
      }
  }

  // 事件委托：MyMusic 点击播放
  document.getElementById('view-mymusic').addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-to-next-btn');
      if (addBtn) {
          e.preventDefault(); e.stopPropagation();
          const card = addBtn.closest('.music-card, .playlist-item');
          const id = parseInt(card.dataset.songId);
          postCommand({ type: 'addToNext', id });
          showToast("已添加到下一首播放");
          return;
      }

      const card = e.target.closest('.music-card, .playlist-item');
      if (card) {
          const id = parseInt(card.dataset.songId);
          postCommand({ type: 'loadAndPlay', id });
      }
  });

  // 编辑资料
  const saveProfileBtn = document.getElementById('saveProfileInPage');
  if(saveProfileBtn) {
      saveProfileBtn.addEventListener('click', () => {
          const name = document.getElementById('editUsername').value;
          const bio = document.getElementById('editBio').value;
          document.querySelector('.profile h2').textContent = name;
          document.querySelector('.profile p').textContent = bio;
          document.querySelector('.preview-avatar').nextElementSibling.textContent = name;
          alert('资料已更新');
      });
  }
  document.querySelectorAll('.avatar-option-edit').forEach(img => {
      img.addEventListener('click', function() {
          document.querySelectorAll('.avatar-option-edit').forEach(i => i.classList.remove('selected'));
          this.classList.add('selected');
          document.querySelector('.profile-img').src = this.src;
          document.querySelector('.preview-avatar').src = this.src;
      });
  });


  // =======================================
  // 6. 持久化播放器通信 (Iframe Remote Control)
  // =======================================
  const playerIframe = document.getElementById('player-iframe');
  
  // 底部栏元素
  const bottomBar = {
      img: document.querySelector('.player-controls .now-playing img'),
      title: document.querySelector('.player-controls .track-info h4'),
      artist: document.querySelector('.player-controls .track-info p'),
      playBtn: document.getElementById('bottom-play-pause'),
      playIcon: document.getElementById('bottom-play-pause-icon'),
      progress: document.querySelector('.player-controls .progress'),
      progressBar: document.querySelector('.player-controls .progress-bar'),
      currTime: document.querySelector('.player-controls .time-current'),
      totalTime: document.querySelector('.player-controls .time-total'),
      favBtn: document.getElementById('bottom-btn-favorite'),
      favIcon: document.getElementById('bottom-favorite-icon'),
      repeatBtn: document.getElementById('bottom-btn-repeat'),
      repeatIcon: document.getElementById('bottom-repeat-icon'),
      volumeLevel: document.querySelector('.player-controls .volume-level'),
      volumeBar: document.querySelector('.player-controls .volume-bar')
  };

  function postCommand(cmd) {
      if (playerIframe && playerIframe.contentWindow) {
          playerIframe.contentWindow.postMessage(cmd, '*');
      }
  }
  
  // 全局播放函数 (给 HTML onclick 使用)
  window.playSong = (id) => postCommand({ type: 'loadAndPlay', id });
  // 辅助函数：根据歌名查找并播放
  window.playSongByTitle = (title) => {
      const song = allSongsCache.find(s => s.title.includes(title));
      if (song) postCommand({ type: 'loadAndPlay', id: song.id });
      return false;
  };
  
  window.playMV = (id) => {
      postCommand({ type: 'loadAndPlayMV', id });
      openFullPlayer();
  };
  // 辅助函数：根据歌名播放MV
  window.playMVByName = (title) => {
      const song = allSongsCache.find(s => s.title.includes(title));
      if (song) {
          postCommand({ type: 'loadAndPlayMV', id: song.id });
          openFullPlayer();
      }
      return false;
  };

  // 格式化时间
  const formatTime = s => {
      if(isNaN(s)||s<0) return "0:00";
      const m=Math.floor(s/60), sec=Math.floor(s%60);
      return `${m}:${sec<10?'0'+sec:sec}`;
  };

  // 监听 Iframe 消息
  window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      switch(data.type) {
          case 'playerReady':
              console.log('[APP] Player Iframe Ready');
              postCommand({ type: 'requestFullState' });
              postCommand({ type: 'requestAllSongs' });
              postCommand({ type: 'requestRecentlyPlayed' });
              break;

          case 'playerStateUpdate':
              updateBottomBar(data);
              break;
          
          case 'timeUpdate':
              if (!isSeeking) {
                  bottomBar.currTime.textContent = formatTime(data.currentTime);
                  if (currentIframeState.duration) {
                      bottomBar.progress.style.width = `${(data.currentTime / currentIframeState.duration)*100}%`;
                  }
              }
              break;

          case 'allSongsUpdate':
              allSongsCache = data.songs;
              favoritesCache = data.favoriteIds || [];
              renderFavorites();
              // 如果当前在本地音乐标签，刷新它
              if(document.getElementById('tab-local').classList.contains('active')) {
                  renderLocalMusic(allSongsCache);
              }
              break;

          case 'recentlyPlayedUpdate':
              renderRecentlyPlayed(data.playlist);
              break;
          
          case 'favoritesChanged':
              postCommand({ type: 'requestAllSongs' }); // 刷新收藏
              break;

          case 'historyChanged':
              postCommand({ type: 'requestRecentlyPlayed' }); // 刷新历史
              break;
          
          case 'playlistUpdate':
              cachedPlaylistData = data.playlist;
              renderBottomPlaylist(data.playlist, data.currentSongId, currentIframeState.isPlaying);
              break;
      }
  });

  function updateBottomBar(state) {
      currentIframeState = state;
      if (state.song) {
          bottomBar.img.src = state.song.cover;
          bottomBar.title.textContent = state.song.title;
          bottomBar.artist.textContent = state.song.artist;
          document.querySelector('.player-controls').style.setProperty('--player-bg-image', `url("${state.song.cover}")`);
          
      }
      bottomBar.playIcon.src = state.isPlaying ? 'icon/24gl-pause.png' : 'icon/24gl-play.png';
      bottomBar.totalTime.textContent = formatTime(state.duration);
      
      if (state.isFavorite) {
          bottomBar.favIcon.src = 'icon/24gl-heart-filled.png';
          bottomBar.favBtn.classList.add('active');
      } else {
          bottomBar.favIcon.src = 'icon/24gl-heart.png';
          bottomBar.favBtn.classList.remove('active');
      }
      
      // Repeat Icon
      const rIcon = state.playMode === 'one' ? 'icon/24gl-repeatOnce2.png' : (state.playMode === 'shuffle' ? 'icon/24gl-shuffle.png' : 'icon/24gl-repeat2.png');
      bottomBar.repeatIcon.src = rIcon;
      
      if(!isDraggingVolume && bottomBar.volumeLevel) {
          bottomBar.volumeLevel.style.width = `${state.volume * 100}%`;
      }
      const visualizer = document.getElementById('mini-visualizer');
    if (visualizer) {
        if (state.isPlaying) {
            visualizer.classList.add('playing');
        } else {
            visualizer.classList.remove('playing');
        }
    }
}

  // 底部栏事件绑定
  document.getElementById('bottom-btn-prev').addEventListener('click', () => postCommand({ type: 'prev' }));
  document.getElementById('bottom-btn-next').addEventListener('click', () => postCommand({ type: 'next' }));
  bottomBar.playBtn.addEventListener('click', () => postCommand({ type: 'togglePlay' }));
  bottomBar.favBtn.addEventListener('click', () => postCommand({ type: 'toggleFavorite' }));
  bottomBar.repeatBtn.addEventListener('click', () => postCommand({ type: 'toggleRepeat' }));
  
  // 进度条拖拽
  bottomBar.progressBar.addEventListener('mousedown', (e) => {
      isSeeking = true;
      bottomBar.progressBar.classList.add('seeking');
      handleSeek(e);
  });
  document.addEventListener('mousemove', (e) => { if(isSeeking) handleSeek(e); });
  document.addEventListener('mouseup', (e) => {
      if(isSeeking) {
          isSeeking = false;
          bottomBar.progressBar.classList.remove('seeking');
          const rect = bottomBar.progressBar.getBoundingClientRect();
          let pct = (e.clientX - rect.left) / rect.width;
          pct = Math.max(0, Math.min(1, pct));
          postCommand({ type: 'seek', time: currentIframeState.duration * pct });
      }
  });
  function handleSeek(e) {
      const rect = bottomBar.progressBar.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      bottomBar.progress.style.width = `${pct * 100}%`;
  }

  // 音量拖拽
  bottomBar.volumeBar.addEventListener('mousedown', (e) => { isDraggingVolume = true; handleVol(e); });
  document.addEventListener('mousemove', (e) => { if(isDraggingVolume) handleVol(e); });
  document.addEventListener('mouseup', () => isDraggingVolume = false);
  function handleVol(e) {
      const rect = bottomBar.volumeBar.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      bottomBar.volumeLevel.style.width = `${pct * 100}%`;
      postCommand({ type: 'setVolume', volume: pct });
  }

  // =======================================
  // 7. 模态框逻辑
  // =======================================
  
  // 全屏播放器
  const fullPlayerModal = document.getElementById('full-player-modal');
  const bottomControls = document.querySelector('.player-controls');
  
  function openFullPlayer() {
      fullPlayerModal.classList.add('show');
      bottomControls.style.display = 'none';
  }
  bottomControls.addEventListener('click', (e) => {
      if(e.target.closest('.btn') || e.target.closest('.time-control')) return;
      openFullPlayer();
  });
  document.getElementById('close-player-modal').addEventListener('click', () => {
      fullPlayerModal.classList.remove('show');
      setTimeout(() => bottomControls.style.display = 'grid', 400);
  });

  // 底部播放列表
  const plModal = document.getElementById('bottom-playlist-modal');
  const plOverlay = document.getElementById('bottom-playlist-modal-overlay');
  document.getElementById('bottom-btn-playlist').addEventListener('click', () => {
      postCommand({ type: 'requestPlaylist' });
      plOverlay.style.display = 'block';
      plModal.style.display = 'flex';
      setTimeout(() => { plOverlay.classList.add('show'); plModal.classList.add('show'); }, 10);
  });
  function closePl() {
      plOverlay.classList.remove('show'); plModal.classList.remove('show');
      setTimeout(() => { plOverlay.style.display = 'none'; plModal.style.display = 'none'; }, 300);
  }
  document.getElementById('bottom-btn-close-modal').addEventListener('click', closePl);
  plOverlay.addEventListener('click', (e) => { if(e.target === plOverlay) closePl(); });

  function renderBottomPlaylist(list, currId, playing) {
      const ul = document.getElementById('bottom-playlist-song-list');
      ul.innerHTML = '';
      list.forEach(s => {
          const li = document.createElement('li');
          if(s.id === currId) {
              li.classList.add('playing');
              li.innerHTML = `<div class="song-title-wrapper"><span class="song-item-title">${s.title}</span><div class="playing-icon-container"><span class="playing-bar" style="animation-play-state:${playing?'running':'paused'}"></span><span class="playing-bar" style="animation-play-state:${playing?'running':'paused'}"></span><span class="playing-bar" style="animation-play-state:${playing?'running':'paused'}"></span></div></div><span class="song-item-artist">${s.artist}</span>`;
          } else {
              li.innerHTML = `<div class="song-title-wrapper"><span class="song-item-title">${s.title}</span></div><span class="song-item-artist">${s.artist}</span>`;
          }
          li.onclick = () => { postCommand({ type: 'loadAndPlay', id: s.id }); closePl(); };
          ul.appendChild(li);
      });
  }

  // 登录弹窗
  const loginModal = document.getElementById('loginModal');
  document.getElementById('showLoginBtn').addEventListener('click', () => loginModal.classList.add('show'));
  document.getElementById('closeLoginBtn').addEventListener('click', () => loginModal.classList.remove('show'));
  
  // 智能搜索
  const searchInput = document.querySelector('.search-input');
  const searchDrop = document.getElementById('search-dropdown');
  searchInput.addEventListener('input', (e) => {
      const kw = e.target.value.toLowerCase().trim();
      if(!kw) { searchDrop.classList.remove('show'); return; }
      
      const matches = allSongsCache.filter(s => s.title.toLowerCase().includes(kw) || s.artist.toLowerCase().includes(kw));
      searchDrop.innerHTML = matches.length ? matches.map(s => `
          <div class="search-item" onclick="playSong(${s.id}); document.querySelector('.search-input').value=''; document.getElementById('search-dropdown').classList.remove('show');">
              <img src="${s.cover}"><div class="search-item-info"><div class="search-item-title">${s.title}</div><div class="search-item-artist">${s.artist}</div></div>
          </div>
      `).join('') : '<div class="search-empty">无结果</div>';
      searchDrop.classList.add('show');
  });
  document.addEventListener('click', (e) => {
      if(!searchInput.contains(e.target) && !searchDrop.contains(e.target)) searchDrop.classList.remove('show');
  });

  // 磁吸按钮
  document.querySelectorAll('.player-controls .btn').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width/2;
          const y = e.clientY - rect.top - rect.height/2;
          btn.style.transform = `translate(${x*0.4}px, ${y*0.4}px)`;
          btn.style.transition = 'transform 0s';
      });
      btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'translate(0,0)';
          btn.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
      });
  });

  // Toast
  window.showToast = (msg) => {
      const t = document.getElementById('toast-notification');
      document.getElementById('toast-message').textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
  };

  // =======================================
  // 8. 初始化
  // =======================================
  renderHomepageSections();

  // 在 DOMContentLoaded 内部
const contextMenu = document.getElementById('context-menu');
let contextMenuTargetId = null;

// 1. 监听全局右键点击
document.addEventListener('contextmenu', (e) => {
    // 查找是否点击在歌曲卡片或列表项上
    const card = e.target.closest('.music-card, .content-card, .playlist-item, .search-item');
    
    if (card) {
        e.preventDefault(); // 阻止默认菜单
        
        // 获取歌曲ID (这取决于你的 HTML 是否有 data-id 或 href 包含 id)
        // 假设你的卡片结构里有 data-id 或 onclick 里包含 id
        // 这里我们需要从 DOM 解析 ID，或者 data-song-id 属性
        // 建议你在生成 HTML 时给所有卡片加 data-song-id="..."
        let songId = card.dataset.songId; 
        
        // 兼容：如果是 <a> 标签 href="...?play=123"
        if (!songId && card.tagName === 'A') {
             const urlParams = new URLSearchParams(card.search);
             songId = urlParams.get('play');
        }
        
        if (songId) {
            contextMenuTargetId = parseInt(songId);
            
            // 计算菜单位置 (防止溢出屏幕)
            let x = e.clientX;
            let y = e.clientY;
            const menuWidth = 160;
            const menuHeight = 180;
            
            if (x + menuWidth > window.innerWidth) x -= menuWidth;
            if (y + menuHeight > window.innerHeight) y -= menuHeight;

            contextMenu.style.left = `${x}px`;
            contextMenu.style.top = `${y}px`;
            contextMenu.classList.add('show');
        }
    } else {
        contextMenu.classList.remove('show');
    }
});

// 2. 点击菜单项
contextMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-item');
    if (!item || !contextMenuTargetId) return;
    
    const action = item.dataset.action;
    
    if (action === 'play') {
        postCommand({ type: 'loadAndPlay', id: contextMenuTargetId });
    } else if (action === 'next') {
        postCommand({ type: 'addToNext', id: contextMenuTargetId });
        showToast("已添加到下一首播放");
    } else if (action === 'fav') {
         // 需要逻辑支持收藏特定ID，目前 toggleFavorite 是针对当前播放的
         // 简单处理：先播放再收藏，或者你需要扩展 iframe 的通信协议支持 `toggleFavoriteById`
         postCommand({ type: 'loadAndPlay', id: contextMenuTargetId }); 
         setTimeout(() => postCommand({ type: 'toggleFavorite' }), 500); 
    } else if (action === 'download') {
        alert('下载功能演示：开始下载歌曲...');
    }
    
    contextMenu.classList.remove('show');
});

// 3. 点击其他地方关闭菜单
document.addEventListener('click', () => contextMenu.classList.remove('show'));

const volumeArea = document.querySelector('.player-controls .right-buttons');

volumeArea.addEventListener('wheel', (e) => {
    e.preventDefault(); // 防止页面滚动
    
    // 获取当前音量 (你需要维护一个 currentVolume 变量或者从 state 获取)
    let newVolume = currentIframeState.volume || 0.5;
    
    // 滚轮向下(deltaY > 0) 减音量，向上 加音量
    if (e.deltaY > 0) {
        newVolume -= 0.05;
    } else {
        newVolume += 0.05;
    }
    
    // 限制 0-1
    newVolume = Math.max(0, Math.min(1, newVolume));
    
    // 发送命令
    postCommand({ type: 'setVolume', volume: newVolume });
    
    // 可选：显示一个小 Toast 提示当前音量
    // showToast(`音量: ${Math.round(newVolume * 100)}%`);
}, { passive: false });
// =======================================
// 21. (新增) 全局键盘快捷键
// =======================================
document.addEventListener('keydown', (e) => {
    // 如果焦点在输入框内，不触发快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch(e.code) {
        case 'Space': // 空格：播放/暂停
            e.preventDefault(); // 防止页面滚动
            postCommand({ type: 'togglePlay' });
            break;
        case 'ArrowRight': // 右箭头：下一首 (或者你可以改为快进)
            // 如果按下了 Ctrl/Cmd，则是下一首，否则是快进5秒
            if (e.ctrlKey || e.metaKey) {
                postCommand({ type: 'next' });
            } else {
                // 需要扩展 iframe 支持 seek 相对时间，这里简化为下一首
                postCommand({ type: 'next' });
            }
            break;
        case 'ArrowLeft': // 左箭头：上一首
            postCommand({ type: 'prev' });
            break;
        case 'ArrowUp': // 上箭头：增加音量
            e.preventDefault();
            // 这里需要获取当前音量，稍微复杂，或者直接发送 'volumeUp' 命令让 iframe 处理
            // 简单处理：提示用户使用鼠标
            break;
    }
});
// =======================================
// 22. (新增) 拖拽交互
// =======================================
function initDragAndDrop() {
    // 1. 让所有歌曲卡片可拖拽
    const cards = document.querySelectorAll('.content-card, .music-card');
    cards.forEach(card => {
        card.setAttribute('draggable', true);
        card.addEventListener('dragstart', (e) => {
            const songId = card.dataset.id || card.dataset.songId; // 兼容不同页面的属性名
            if(songId) {
                e.dataTransfer.setData('text/plain', songId);
                e.dataTransfer.effectAllowed = 'copy';
                // 可以设置一个拖拽时的幽灵图
            }
        });
    });

    // 2. 定义放置区域：底部播放器 (拖进去立即播放)
    const playerDropZone = document.querySelector('.player-controls');
    
    playerDropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // 必须阻止默认行为才能 drop
        playerDropZone.style.borderColor = 'var(--color-brand-3)'; // 高亮提示
        playerDropZone.style.transform = 'scale(1.02)';
    });

    playerDropZone.addEventListener('dragleave', (e) => {
        playerDropZone.style.borderColor = 'transparent';
        playerDropZone.style.transform = 'scale(1)';
    });

    playerDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        playerDropZone.style.borderColor = 'transparent';
        playerDropZone.style.transform = 'scale(1)';
        
        const songId = e.dataTransfer.getData('text/plain');
        if (songId) {
            postCommand({ type: 'loadAndPlay', id: parseInt(songId) });
            showToast("已开始播放拖拽的歌曲");
        }
    });
}

// 注意：每次动态加载完内容（如 renderHomepageSections）后，都需要重新调用 initDragAndDrop()
function setGreeting() {
    const hour = new Date().getHours();
    let greeting = "当音乐触动你";
    if (hour >= 5 && hour < 12) greeting = "早上好，开启充满活力的一天";
    else if (hour >= 12 && hour < 18) greeting = "下午好，来杯咖啡配音乐";
    else if (hour >= 18 && hour < 23) greeting = "晚上好，享受静谧时光";
    else greeting = "夜深了，让音乐伴你入眠";
    
    const title = document.getElementById('hero-greeting');
    if (title) title.textContent = greeting;
}
setGreeting();
/* --- app.js --- */

// =======================================
// 24. (新增) 全局 3D 视差效果
// =======================================
function initGlobalParallax() {
    const layeredElements = [
        { el: document.querySelector('.vanta-hero-content'), speed: 0.03 }, // 标题动得慢
        { el: document.querySelector('.sidebar-nav'), speed: -0.02 },       // 侧边栏反向微动
        { el: document.querySelector('.shooting-stars-container'), speed: 0.01 }, // 背景层
    ];

    document.addEventListener('mousemove', (e) => {
        // 计算鼠标相对于屏幕中心的百分比 (-0.5 到 0.5)
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;

        layeredElements.forEach(item => {
            if (item.el) {
                // 根据速度系数移动元素
                const moveX = x * window.innerWidth * item.speed;
                const moveY = y * window.innerHeight * item.speed;
                
                // 使用 translate3d 开启硬件加速
                // 注意：如果元素本身有 transform，这里可能会覆盖，需要小心
                // 对于 vanta-hero-content，我们使用 transform
                item.el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
            }
        });
    });
}
/* --- app.js --- */


initTiltEffects()
// 记得调用它
initFluidEffect();
initGlobalParallax();
});