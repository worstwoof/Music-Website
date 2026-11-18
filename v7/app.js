function initTiltEffects() {
  if (typeof VanillaTilt === "undefined") return;
  // 移除旧的手写逻辑

  // 启用 Vanilla-tilt
  const cards = document.querySelectorAll(
    ".content-card, .music-card, .chart-column"
  );

  VanillaTilt.init(cards, {
    max: 10,
    speed: 400,
    glare: true, // 开启高光
    "max-glare": 0.4, // 高光强度
    scale: 1.02,
    perspective: 1000,
  });
}
// app.js
// =======================================
// 3D 环形 MV 墙
// =======================================

/**
 * 渲染 3D 环形 MV 旋转木马
 * @param {Array} allSongs 所有歌曲数据
 */
// app.js

/**
 * 渲染 3D 环形 MV 旋转木马 (修复版)
 */
function renderMvCarousel(allSongs) {
  const container = document.getElementById("mv-spinner");
  if (!container) return;

  // 1. 筛选 MV 数据
  let mvSongs = allSongs.filter((song) => song.mv);

  if (mvSongs.length === 0) {
    container.innerHTML = '<div style="...">暂无 MV 数据</div>';
    return;
  }

  // === 核心修改：增加密度 ===
  // 以前是补齐到 8 个，现在我们强制补齐到至少 12 个，甚至 14 个
  // 这样圆环会更圆，缝隙更小，更有包围感
  while (mvSongs.length < 12) {
    mvSongs = [...mvSongs, ...mvSongs];
  }
  // 如果不想太多，可以切一下，保持在 12-16 个之间
  if (mvSongs.length > 16) {
    mvSongs = mvSongs.slice(0, 16);
  }

  container.innerHTML = "";

  // 2. 计算几何参数
  const count = mvSongs.length;
  const anglePerItem = 360 / count;

  // 半径计算：(卡片宽 + 间隙)
  const cardWidth = 440;
  // 间隙 gap 设为 20 比较合适，太大会漏风
  const gap = 20;
  const radius = Math.round((cardWidth + gap) / 2 / Math.tan(Math.PI / count));

  // 3. 生成 DOM
  mvSongs.forEach((song, index) => {
    const card = document.createElement("div");
    card.className = "mv-item";

    const angle = index * anglePerItem;
    // 只设置初始角度和推远的距离，不影响旋转
    card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;

    card.innerHTML = `
            <img src="${song.cover}" alt="${song.title}">
            <div class="mv-overlay">
                <div class="play-btn-inner"><i class="fas fa-play"></i></div>
            </div>
            <div style="position:absolute; bottom:15px; left:15px; right:15px; text-align:center; color:white; text-shadow:0 2px 8px black; font-size:16px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${song.title}
            </div>
        `;

    // 点击事件
    card.addEventListener("click", (e) => {
      // 如果正在拖拽，拦截点击
      if (container.dataset.isDragging === "true") return;
      playMV(song.id);
    });

    container.appendChild(card);
  });

  // 4. 启动交互 (传入半径)
  initCarouselInteraction(container, radius);
}

/**
 * 3D 旋转交互逻辑 (完整版 - 无中断)
 */
/**
 * 3D 旋转交互逻辑 (带光影计算版)
 */
function initCarouselInteraction(element, radius) {
  let startX = 0;
  let currentRotation = 0;
  let isDown = false;

  // 惯性相关
  let velocity = 0;
  let lastX = 0;
  let animationId = null;

  // 自动播放速度
  const autoRotateSpeed = -0.2;

  // === 1. 获取所有卡片并计算基础角度 ===
  const items = element.querySelectorAll(".mv-item");
  const totalItems = items.length;
  const anglePerItem = 360 / totalItems;

  // === 2. 核心更新函数：包含位置和光影计算 ===
  const updateTransform = (rot) => {
    // 旋转整个容器
    element.style.transform = `translateZ(-${radius}px) rotateY(${rot}deg)`;

    // === 实时计算每张卡片的亮度 ===
    items.forEach((item, index) => {
      // 该卡片在圆环上的初始角度
      const itemAngle = index * anglePerItem;

      // 计算当前的总角度 (容器旋转 + 卡片初始角度)
      // 转换为弧度用于 Math.cos 计算
      const rad = (rot + itemAngle) * (Math.PI / 180);

      // 计算 Z 轴深度系数 (-1 到 1)
      // cos(0) = 1 (最近/最前), cos(180) = -1 (最远/最后)
      const zScore = Math.cos(rad);

      // 将 -1~1 映射到亮度范围 (例如：最暗 0.3 ~ 最亮 1.0)
      // 公式：min + (max - min) * ((zScore + 1) / 2)
      const minBrightness = 0.3; // 后排亮度 (30%)
      const maxBrightness = 1.0; // 前排亮度 (100%)
      let brightness =
        minBrightness + (maxBrightness - minBrightness) * ((zScore + 1) / 2);

      // 应用滤镜
      // 注意：我们在 style.css 里给 hover 加了 !important，这样鼠标放上去会变回高亮
      item.style.filter = `brightness(${brightness})`;

      // (可选) 让后排稍微透明一点，增加深邃感
      // item.style.opacity = 0.5 + 0.5 * ((zScore + 1) / 2);
    });
  };

  // 初始化
  updateTransform(0);

  // --- 动画循环 ---
  const loop = () => {
    if (isDown) {
      animationId = requestAnimationFrame(loop);
      return;
    }

    velocity *= 0.95; // 惯性衰减

    if (Math.abs(velocity) > 0.01) {
      currentRotation += velocity;
    } else {
      currentRotation += autoRotateSpeed;
    }

    updateTransform(currentRotation);
    animationId = requestAnimationFrame(loop);
  };

  loop();

  const onDown = (x) => {
    isDown = true;
    startX = x;
    lastX = x;
    velocity = 0;
    element.style.cursor = "grabbing";
    element.dataset.isDragging = "false";
    window.addEventListener("mousemove", onMoveMouse);
    window.addEventListener("touchmove", onMoveTouch, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
  };

  const handleMove = (x) => {
    if (!isDown) return;
    const delta = x - lastX;
    if (Math.abs(x - startX) > 5) element.dataset.isDragging = "true";
    velocity = delta * 0.2;
    currentRotation += velocity;
    updateTransform(currentRotation); // 拖拽时也实时更新光影
    lastX = x;
  };

  const onMoveMouse = (e) => handleMove(e.clientX);
  const onMoveTouch = (e) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };

  const onUp = () => {
    isDown = false;
    element.style.cursor = "grab";
    window.removeEventListener("mousemove", onMoveMouse);
    window.removeEventListener("touchmove", onMoveTouch);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchend", onUp);
    setTimeout(() => {
      element.dataset.isDragging = "false";
    }, 50);
  };

  const stage = element.parentElement;
  stage.addEventListener("mousedown", (e) => {
    e.preventDefault();
    onDown(e.clientX);
  });
  stage.addEventListener(
    "touchstart",
    (e) => {
      onDown(e.touches[0].clientX);
    },
    { passive: false }
  );
  document.addEventListener("mouseleave", () => {
    if (isDown) onUp();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[APP] 启动中...");

  // =======================================
  // 1. 全局变量与状态
  // =======================================
  const playerIframe = document.getElementById("player-iframe");
  let playerReady = false;
  let playerLoadFailed = false;
  let pendingPlay = null;

  function isPlayerMessage(event) {
    return event.origin === window.location.origin &&
      event.source === playerIframe.contentWindow;
  }

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
  // 切换视图主函数
  function switchView(pageName, targetAnchor = null) {
    // 1. 切换 active 类 (保持原有逻辑)
    views.forEach((view) => {
      if (view.id === `view-${pageName}`) {
        view.classList.add("active");
      } else {
        view.classList.remove("active");
      }
    });

    // 2. 更新导航栏状态 (保持原有逻辑)
    navLinks.forEach((link) => {
      if (link.dataset.page === pageName && !link.dataset.target) {
        link.classList.add("active");
        movePill(link);
      } else if (pageName === "home" && link.dataset.target === targetAnchor) {
        // 特殊处理
      } else {
        link.classList.remove("active");
      }
    });

    if (pageName === "home") {
      const homeNav = document.querySelector(
        '.nav-item[data-page="home"][data-target="home"]'
      );
      if (homeNav) {
        homeNav.classList.add("active");
        movePill(homeNav);
      }

      // 当切换回首页时，强制 Vanta 重新调整大小
      if (vantaEffect) {
        // 使用 setTimeout 给浏览器一点时间完成渲染（从 display:none 变成 block）
        setTimeout(() => {
          vantaEffect.resize();
        }, 10);
      }
    }

    // 3. 处理锚点滚动 (保持原有逻辑)
    if (targetAnchor && pageName === "home") {
      setTimeout(() => {
        const element = document.getElementById(targetAnchor);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition =
            elementPosition + window.pageYOffset - headerOffset;
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
      const page = link.dataset.page || "home"; // 侧边栏默认是home
      const target = link.dataset.target || null;

      // 如果是侧边栏，没有 data-page，默认切到 home 并滚动
      if (link.classList.contains("sidebar-link")) {
        switchView("home", target);
      } else {
        switchView(page, target);
      }
    });
  });

  // 药丸交互
  navLinks.forEach((item) => {
    item.addEventListener("mouseenter", () => movePill(item));
  });
  navOptions.addEventListener("mouseleave", () => {
    const active = document.querySelector(".nav-item.active");
    if (active) movePill(active);
  });

  initPill();

  // =======================================
  // 3. 全局特效 (Stars, Snow, Theme)
  // =======================================

  // 主题切换
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  if (themeToggleBtn) {
    let oldTheme = "light";
    try {
      if (localStorage.getItem("music-theme") === "dark") oldTheme = "dark";
    } catch {}
    const currentTheme = readSetting("music-theme", oldTheme);
    if (currentTheme === "dark") document.body.classList.add("dark-mode");
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      let theme = document.body.classList.contains("dark-mode")
        ? "dark"
        : "light";
      saveSetting("music-theme", theme);
      initVanta(); // 刷新 Vanta 颜色
    });
  }

  // Vanta.js 背景
  let vantaEffect = null;
  function initVanta() {
    const vantaContainer = document.getElementById("home");
    if (!vantaContainer) return;
    if (vantaEffect) vantaEffect.destroy();

    if (typeof VANTA !== "undefined" && typeof THREE !== "undefined") {
      const isDark = document.body.classList.contains("dark-mode");
      vantaEffect = VANTA.WAVES({
        el: vantaContainer,
        THREE: THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        color: isDark ? 0x5aa4e6 : 0x423b63,
        shininess: 30.0,
        waveHeight: 15.0,
        waveSpeed: 0.8,
        zoom: 0.75,
      });
    }
  }
  initVanta();

  // Starfield (Canvas) - 包含长按加速穿梭效果
  // app.js - 升级版星空特效 (3D视差 + 音乐律动 + 极速穿梭)
  function initStarfield() {
    const canvas = document.getElementById("starfield-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width,
      height,
      stars = [];

    // === 参数配置 ===
    let baseSpeed = 0.8; // 正常极慢巡航速度 (比之前稍微快一点点以便肉眼可见)
    let warpSpeed = 30; // 长按时的最大速度
    let currentSpeed = baseSpeed;
    let acceleration = 0.8; // 加速度
    let deceleration = 0.8; // 减速度
    let isWarping = false;

    // 3D 视差参数
    let mouseX = 0; // 鼠标X位置 (相对于中心)
    let mouseY = 0; // 鼠标Y位置 (相对于中心)
    let parallaxFactor = 0.05; // 视差强度 (越大随鼠标移动越明显)

    // 音乐律动参数
    let musicAmplitude = 0; // 当前音乐振幅 (0.0 ~ 1.0)

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    class Star {
      constructor() {
        this.init(true);
      }

      init(randomZ) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * width;

        this.x = Math.cos(angle) * radius;
        this.y = Math.sin(angle) * radius;
        this.z = randomZ ? Math.random() * width * 2 : width * 2;

        this.ox = this.x;
        this.oy = this.y;
        this.oz = this.z;

        // 颜色随机 (蓝/紫/白)
        this.r = Math.floor(Math.random() * 50 + 200);
        this.g = Math.floor(Math.random() * 50 + 200);
        this.b = 255;

        // 基础亮度 (避免完全不亮)
        this.baseAlpha = 0.2 + Math.random() * 0.8;
      }

      update() {
        this.oz -= currentSpeed;
        if (this.oz < 1) this.init(false);
      }

      draw() {
        const fov = 400;
        const scale = fov / (fov + this.oz);

        // === [核心] 3D 视差计算 ===
        // 原始位置 + (鼠标偏移 * 深度系数)
        // 深度系数 scale 越小(越远)，移动越少；越大(越近)，移动越多 -> 产生3D感
        const parallaxX = mouseX * parallaxFactor * (1 - scale);
        const parallaxY = mouseY * parallaxFactor * (1 - scale);

        const sx = (this.ox + parallaxX) * scale + width / 2;
        const sy = (this.oy + parallaxY) * scale + height / 2;

        // === [核心] 音乐律动计算 ===
        // 最终不透明度 = 距离衰减 * 基础亮度 * (1 + 音乐振幅增强)
        // 音乐振幅 musicAmplitude 范围约 0~1，这里 * 2 让闪烁更明显
        const distAlpha = 1 - this.oz / (width * 2);
        let finalAlpha = distAlpha * this.baseAlpha * (1 + musicAmplitude * 3);

        if (finalAlpha < 0) finalAlpha = 0;
        // 限制最大亮度为 1 (防止爆闪)
        if (finalAlpha > 1) finalAlpha = 1;

        // 大小随距离变化
        const size = (1 - this.oz / (width * 2)) * 1.1;

        ctx.beginPath();

        // 穿梭效果 (画线)
        if (currentSpeed > 2) {
          const prevScale = fov / (fov + this.oz + currentSpeed * 1.5);
          const prevSx = (this.ox + parallaxX) * prevScale + width / 2;
          const prevSy = (this.oy + parallaxY) * prevScale + height / 2;

          ctx.moveTo(prevSx, prevSy);
          ctx.lineTo(sx, sy);
          ctx.strokeStyle = `rgba(${this.r}, ${this.g}, ${this.b}, ${finalAlpha})`;
          ctx.lineWidth = size;
          ctx.stroke();
        } else {
          // 静止/慢速 (画点)
          // 加上音乐律动带来的光晕效果
          if (musicAmplitude > 0.1) {
            ctx.shadowBlur = 10 * musicAmplitude;
            ctx.shadowColor = `rgba(${this.r}, ${this.g}, ${this.b}, 0.8)`;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.arc(sx, sy, Math.max(0, size), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${this.r}, ${this.g}, ${this.b}, ${finalAlpha})`;
          ctx.fill();
        }
      }
    }

    function animate() {
      // 速度平滑过渡
      if (isWarping) {
        if (currentSpeed < warpSpeed) currentSpeed += acceleration;
      } else {
        if (currentSpeed > baseSpeed) {
          currentSpeed -= deceleration;
          if (currentSpeed < baseSpeed) currentSpeed = baseSpeed;
        }
      }

      ctx.clearRect(0, 0, width, height);

      stars.forEach((star) => {
        star.update();
        star.draw();
      });

      requestAnimationFrame(animate);
    }

    resize();
    for (let i = 0; i < 800; i++) stars.push(new Star());

    window.addEventListener("resize", resize);

    // === 1. 鼠标移动监听 (实现 3D 视角) ===
    window.addEventListener("mousemove", (e) => {
      // 计算鼠标相对于屏幕中心的坐标
      // 减去 width/2 和 height/2
      mouseX = e.clientX - width / 2;
      mouseY = e.clientY - height / 2;
    });

    // === 2. 监听音乐律动数据 ===
    window.addEventListener("message", (e) => {
      if (isPlayerMessage(e) && e.data?.type === "audioVisualizerData" &&
          Number.isFinite(e.data.amplitude)) {
        // 使用平滑过渡，避免亮度突变过于剧烈
        // 0.3 是平滑系数
        const target = e.data.amplitude;
        musicAmplitude += (target - musicAmplitude) * 0.3;

        // 防止极小数值
        if (musicAmplitude < 0.01) musicAmplitude = 0;
      }
    });

    // === 3. 长按加速交互 ===
    const startWarp = () => {
      isWarping = true;
    };
    const endWarp = () => {
      isWarping = false;
    };

    window.addEventListener("mousedown", startWarp);
    window.addEventListener("mouseup", endWarp);
    window.addEventListener("touchstart", startWarp, { passive: true });
    window.addEventListener("touchend", endWarp);

    // 额外处理：鼠标移出窗口时停止加速
    document.addEventListener("mouseleave", endWarp);

    animate();
  }
  initStarfield();
  // Shooting Stars & Snow (Simulated)
  const starsContainer = document.querySelector(".shooting-stars-container");
  if (starsContainer) {
    for (let i = 0; i < 60; i++) {
      const s = document.createElement("div");
      s.className = "shooting-star";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = Math.random() * 5 + "s";
      s.style.animationDuration = 5 + Math.random() * 5 + "s";
      starsContainer.appendChild(s);
    }
  }

  const snowflakeCanvas = document.getElementById("snowflake-canvas");
  let snowflakeTimer = null;
  document.addEventListener("mousemove", (e) => {
    if (!snowflakeTimer) {
      snowflakeTimer = setTimeout(() => {
        if (snowflakeCanvas) {
          const f = document.createElement("div");
          f.className = "mouse-snowflake";
          f.style.left = e.clientX + "px";
          f.style.top = e.clientY + "px";
          f.style.setProperty("--drift-x", (Math.random() - 0.5) * 100 + "px");
          f.style.setProperty("--drift-y", 100 + Math.random() * 100 + "px");
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
    try {
      // 1. 直接读取生成的 playlist.json
      const response = await fetch("playlist.json");
      if (!response.ok) throw new Error("playlist.json 加载失败");

      // 2. 因为 playlist.json 已经是完整的对象数组了，直接返回即可！
      // 不需要再循环 fetch 每一个 info.json 了，极大地提升了速度
      const allSongs = await response.json();

      return Array.isArray(allSongs) ? allSongs : [];
    } catch (e) {
      console.error("获取歌曲列表失败:", e);
      return [];
    }
  }

  async function renderHomepageSections() {
    const discoverTrack = document.querySelector("#discover .content-track");
    const newReleaseTrack = document.querySelector(
      "#new-releases .content-track"
    );

    // 骨架屏
    const skeletonHTML = new Array(5)
      .fill(
        `
          <div class="skeleton-card">
              <div class="skeleton-bg skeleton-image"></div>
              <div class="skeleton-bg skeleton-content"><div class="skeleton-line title"></div><div class="skeleton-line artist"></div></div>
          </div>`
      )
      .join("");
    if (discoverTrack) discoverTrack.innerHTML = skeletonHTML;
    if (newReleaseTrack) newReleaseTrack.innerHTML = skeletonHTML;

    const allSongs = await fetchAllSongInfo();
    if (allSongsCache.length === 0) allSongsCache = allSongs;
    if (!allSongs.length) {
      const empty = '<p class="empty-playlist-message">暂无歌曲，请检查曲库清单</p>';
      if (discoverTrack) discoverTrack.innerHTML = empty;
      if (newReleaseTrack) newReleaseTrack.innerHTML = empty;
    }

    const createCard = (song) => `
          <div class="content-card" onclick="playSong(${song.id})" data-id="${song.id}">
            <div class="card-image"><img src="${song.cover}" alt="${song.title}"><div class="play-icon"><i class="fas fa-play"></i></div></div>
            <div class="card-content"><h3 class="card-title">${song.title}</h3><p class="card-artist">${song.artist}</p></div>
          </div>`;

    if (discoverTrack && allSongs.length) {
      // ❌ 删除这一行 (这是随机打乱的代码)
      // const shuffled = [...allSongs].sort(() => 0.5 - Math.random());

      // ✅ 改成这样 (直接使用 allSongs，因为 JSON 里已经是 旧->新 的顺序了)
      // 如果你只想显示最老的前 20 首，可以用 allSongs.slice(0, 20)
      const oldestSongs = allSongs;

      // 渲染卡片
      discoverTrack.innerHTML = oldestSongs.map(createCard).join("");

      // 启动跑马灯特效
      initInfiniteMarquee("#discover .content-carousel-container");
    }

    if (newReleaseTrack && allSongs.length) {
      // 逻辑解释：
      // 1. slice(-10): 截取数组最后 10 个 (也就是 ID 最大的 10 个，即最新的 10 首歌)
      // 2. reverse(): 把这 10 个反转，变成 [最新, 次新, ..., 第10新]
      // 这样显示出来的就是：第一首是最新的，往右越来越旧

      // 如果你想显示所有歌曲，而不仅仅是 10 首，就改成：
      const newSongs = [...allSongs].reverse();

      newReleaseTrack.innerHTML = newSongs.map(createCard).join("");
      initInfiniteMarquee("#new-releases .content-carousel-container");
    }
    renderDynamicCharts(allSongs);

    renderMvCarousel(allSongs);
    // 初始化 3D 倾斜
    document.querySelectorAll(".content-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left,
          y = e.clientY - rect.top;
        card.style.transform = `rotateX(${
          (y / rect.height - 0.5) * -12
        }deg) rotateY(${(x / rect.width - 0.5) * 12}deg)`;
      });
      card.addEventListener(
        "mouseleave",
        () => (card.style.transform = `rotateX(0) rotateY(0)`)
      );
    });
  }

  function initInfiniteMarquee(selector) {
    const container = document.querySelector(selector);
    if (!container || typeof gsap === "undefined") return;
    const track = container.querySelector(".content-track");
    const cards = Array.from(track.children);
    if (!cards.length) return;

    let totalWidth = 0;
    const gap = 20;
    cards.forEach((c) => (totalWidth += c.offsetWidth + gap));

    // Clone to fill width
    while (totalWidth < Math.max(window.innerWidth * 2, 3000)) {
      cards.forEach((c) => track.appendChild(c.cloneNode(true)));
      totalWidth += cards[0].offsetWidth + gap * cards.length;
    }

    const anim = gsap.to(track, {
      x: `-=${totalWidth / 2}`,
      duration: totalWidth / 100,
      ease: "none",
      repeat: -1,
    });
    container.addEventListener("mouseenter", () =>
      gsap.to(anim, { timeScale: 0.2, duration: 0.5 })
    );
    container.addEventListener("mouseleave", () =>
      gsap.to(anim, { timeScale: 1, duration: 0.5 })
    );
  }

  // Swiper for MV
  if (typeof Swiper !== "undefined") {
    new Swiper(".mv-swiper-container", {
      effect: "coverflow",
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "auto",
      loop: true,
      coverflowEffect: {
        rotate: 40,
        stretch: 0,
        depth: 100,
        modifier: 1,
        slideShadows: true,
      },
      pagination: { el: ".swiper-pagination", clickable: true },
    });
  }

  // =======================================
  // 5. 我的音乐 (MyMusic) 逻辑
  // =======================================

  // 侧边栏导航切换 (MyMusic 内)
  const myMusicNavItems = document.querySelectorAll(".nav-item-music");
  const myMusicSections = document.querySelectorAll(
    "#view-mymusic .music-content-section"
  );

  myMusicNavItems.forEach((item) => {
    item.addEventListener("click", () => {
      // 移除所有 active 状态
      myMusicNavItems.forEach((n) => n.classList.remove("active"));
      myMusicSections.forEach((s) => s.classList.remove("active"));

      // 添加当前 active
      item.classList.add("active");
      const targetTab = item.dataset.tab;
      const activeSection = document.getElementById(`tab-${targetTab}`);
      if (activeSection) activeSection.classList.add("active");

      // 懒加载
      if (targetTab === "local" && !isDataLoaded.local)
        renderLocalMusic(allSongsCache);
    });
  });

  function renderFavorites() {
    const grid = document.querySelector("#favorites-grid");
    if (!grid) return;
    grid.innerHTML = "";
    document.getElementById("favorite-count").textContent = favoritesCache.length;
    if (!favoritesCache || favoritesCache.length === 0) {
      grid.innerHTML =
        '<p class="empty-playlist-message">还没有收藏的音乐哦</p>';
      return;
    }
    favoritesCache.forEach((id) => {
      const song = allSongsCache.find((s) => s.id === id);
      if (song) {
        const card = document.createElement("div");
        card.className = "music-card";
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
    const container = document.getElementById("recent-playlist-body");
    if (!container) return;
    container.innerHTML = "";
    if (!playlist || playlist.length === 0) {
      container.innerHTML =
        '<p class="empty-playlist-message">还没有播放记录哦</p>';
      return;
    }
    playlist.forEach((song, idx) => {
      const item = document.createElement("div");
      item.className = "playlist-item";
      item.dataset.songId = song.id;
      item.innerHTML = `
              <div class="playlist-number">${idx + 1}</div>
              <div class="playlist-title"><img src="${song.cover}"><div>${
        song.title
      }</div></div>
              <div class="playlist-artist">${song.artist}</div>
              <div class="playlist-album">${song.album || "-"}</div>
              <div class="playlist-duration">...</div>`;
      container.appendChild(item);
    });
  }

  function renderLocalMusic(allSongs) {
    isDataLoaded.local = true;
    const container = document.getElementById("local-music-container");
    if (!container) return;
    container.innerHTML = "";

    const grouped = allSongs.reduce((acc, song) => {
      const key = song.artist || "未知";
      if (!acc[key]) acc[key] = [];
      acc[key].push(song);
      return acc;
    }, {});

    for (const artist in grouped) {
      const h2 = document.createElement("h2");
      h2.textContent = artist;
      container.appendChild(h2);
      const grid = document.createElement("div");
      grid.className = "music-grid";
      grouped[artist].forEach((song) => {
        const card = document.createElement("div");
        card.className = "music-card";
        card.dataset.songId = song.id;
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
  document.getElementById("view-mymusic").addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-to-next-btn");
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = addBtn.closest(".music-card, .playlist-item");
      const id = parseInt(card.dataset.songId);
      postCommand({ type: "addToNext", id });
      showToast("已添加到下一首播放");
      return;
    }

    const card = e.target.closest(".music-card, .playlist-item");
    if (card) {
      const id = parseInt(card.dataset.songId);
      postCommand({ type: "loadAndPlay", id });
    }
  });

  // 编辑资料
  const saveProfileBtn = document.getElementById("saveProfileInPage");
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", () => {
      const name = document.getElementById("editUsername").value;
      const bio = document.getElementById("editBio").value;
      document.querySelector(".profile h2").textContent = name;
      document.querySelector(".profile p").textContent = bio;
      document.querySelector(".preview-avatar").nextElementSibling.textContent =
        name;
      alert("资料已更新");
    });
  }
  document.querySelectorAll(".avatar-option-edit").forEach((img) => {
    img.addEventListener("click", function () {
      document
        .querySelectorAll(".avatar-option-edit")
        .forEach((i) => i.classList.remove("selected"));
      this.classList.add("selected");
      document.querySelector(".profile-img").src = this.src;
      document.querySelector(".preview-avatar").src = this.src;
    });
  });

  // =======================================
  // 6. 持久化播放器通信 (Iframe Remote Control)
  // =======================================
  // 底部栏元素
  const bottomBar = {
    img: document.querySelector(".player-controls .now-playing img"),
    title: document.querySelector(".player-controls .track-info h4"),
    artist: document.querySelector(".player-controls .track-info p"),
    playBtn: document.getElementById("bottom-play-pause"),
    playIcon: document.getElementById("bottom-play-pause-icon"),
    progress: document.querySelector(".player-controls .progress"),
    progressBar: document.querySelector(".player-controls .progress-bar"),
    currTime: document.querySelector(".player-controls .time-current"),
    totalTime: document.querySelector(".player-controls .time-total"),
    favBtn: document.getElementById("bottom-btn-favorite"),
    favIcon: document.getElementById("bottom-favorite-icon"),
    repeatBtn: document.getElementById("bottom-btn-repeat"),
    repeatIcon: document.getElementById("bottom-repeat-icon"),
    volumeLevel: document.querySelector(".player-controls .volume-level"),
    volumeBar: document.querySelector(".player-controls .volume-bar"),
  };

  function sendToPlayer(command) {
    playerIframe.contentWindow?.postMessage(command, window.location.origin);
  }

  function postCommand(command) {
    if (playerReady) {
      sendToPlayer(command);
      return;
    }
    if (playerLoadFailed) {
      showToast("曲库未加载，请刷新页面后重试");
      return;
    }
    // 加载期间只保留最后一次点歌。
    if (command.type === "loadAndPlay" || command.type === "loadAndPlayMV") {
      pendingPlay = command;
    }
    showToast("播放器正在加载");
  }

  // 全局播放函数 (给 HTML onclick 使用)
  window.playSong = (id) => postCommand({ type: "loadAndPlay", id });
  // 辅助函数：根据歌名查找并播放
  window.playSongByTitle = (title) => {
    const song = allSongsCache.find((s) => s.title.includes(title));
    if (song) postCommand({ type: "loadAndPlay", id: song.id });
    return false;
  };

  window.playMV = (id) => {
    postCommand({ type: "loadAndPlayMV", id });
    openFullPlayer();
  };
  // 辅助函数：根据歌名播放MV
  window.playMVByName = (title) => {
    const song = allSongsCache.find((s) => s.title.includes(title));
    if (song) {
      postCommand({ type: "loadAndPlayMV", id: song.id });
      openFullPlayer();
    }
    return false;
  };

  // 格式化时间
  const formatTime = (s) => {
    if (isNaN(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60),
      sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" + sec : sec}`;
  };

  // 监听 Iframe 消息
  window.addEventListener("message", (event) => {
    if (!isPlayerMessage(event)) return;
    const data = event.data;
    if (!data || typeof data.type !== "string") return;

    switch (data.type) {
      case "closeFullPlayer":

        const fullPlayerModal = document.getElementById("full-player-modal");
        const bottomControls = document.querySelector(".player-controls");

        // 1. 隐藏全屏模态框
        if (fullPlayerModal) {
          fullPlayerModal.classList.remove("show");
        }

        // 2. 延迟显示底部小播放器 (配合 CSS 动画时间)
        if (bottomControls) {
          setTimeout(() => {
            // 如果你的布局是 flex 就写 flex，是 grid 就写 grid
            // 为了保险，也可以写 display = '' (清空内联样式，回归 CSS 定义)
            bottomControls.style.display = "grid";
          }, 400);
        }
        break;
      case "playerReady":
        if (playerReady) break;
        playerReady = true;
        playerLoadFailed = false;
        sendToPlayer({ type: "requestFullState" });
        sendToPlayer({ type: "requestAllSongs" });
        sendToPlayer({ type: "requestRecentlyPlayed" });
        if (pendingPlay) {
          sendToPlayer(pendingPlay);
          pendingPlay = null;
        }
        break;

      case "playerLoadError":
        playerReady = false;
        playerLoadFailed = true;
        pendingPlay = null;
        showToast("曲库加载失败，请刷新页面后重试");
        break;

      case "playerNotice":
        if (typeof data.message === "string") showToast(data.message);
        break;

      case "playerStateUpdate":
        updateBottomBar(data);
        break;

      case "timeUpdate":
        if (!isSeeking) {
          bottomBar.currTime.textContent = formatTime(data.currentTime);
          if (currentIframeState.duration) {
            bottomBar.progress.style.width = `${
              (data.currentTime / currentIframeState.duration) * 100
            }%`;
          }
        }
        break;

      case "allSongsUpdate":
        allSongsCache = data.songs;
        favoritesCache = data.favoriteIds || [];
        renderFavorites();
        // 如果当前在本地音乐标签，刷新它
        if (document.getElementById("tab-local").classList.contains("active")) {
          renderLocalMusic(allSongsCache);
        }
        break;

      case "recentlyPlayedUpdate":
        renderRecentlyPlayed(data.playlist);
        break;

      case "favoritesChanged":
        postCommand({ type: "requestAllSongs" }); // 刷新收藏
        break;

      case "historyChanged":
        postCommand({ type: "requestRecentlyPlayed" }); // 刷新历史
        break;

      case "playlistUpdate":
        cachedPlaylistData = data.playlist;
        renderBottomPlaylist(
          data.playlist,
          data.currentSongId,
          currentIframeState.isPlaying
        );
        break;
    }
  });

  function updateBottomBar(state) {
    currentIframeState = state;
    if (state.song) {
      bottomBar.img.src = state.song.cover;
      bottomBar.title.textContent = state.song.title;
      bottomBar.artist.textContent = state.song.artist;
      document
        .querySelector(".player-controls")
        .style.setProperty("--player-bg-image", `url("${state.song.cover}")`);
    }
    bottomBar.playIcon.src = state.isPlaying
      ? "icon/24gl-pause.png"
      : "icon/24gl-play.png";
    bottomBar.totalTime.textContent = formatTime(state.duration);
    if (!isSeeking) {
      bottomBar.currTime.textContent = formatTime(state.currentTime);
      const progress = state.duration ? state.currentTime / state.duration : 0;
      bottomBar.progress.style.width = (progress * 100) + "%";
    }

    if (state.isFavorite) {
      bottomBar.favIcon.src = "icon/24gl-heart-filled.png";
      bottomBar.favBtn.classList.add("active");
    } else {
      bottomBar.favIcon.src = "icon/24gl-heart.png";
      bottomBar.favBtn.classList.remove("active");
    }

    // Repeat Icon
    const rIcon =
      state.playMode === "one"
        ? "icon/24gl-repeatOnce2.png"
        : state.playMode === "shuffle"
        ? "icon/24gl-shuffle.png"
        : "icon/24gl-repeat2.png";
    bottomBar.repeatIcon.src = rIcon;

    if (!isDraggingVolume && bottomBar.volumeLevel) {
      bottomBar.volumeLevel.style.width = `${state.volume * 100}%`;
    }
    const visualizer = document.getElementById("mini-visualizer");
    if (visualizer) {
      if (state.isPlaying) {
        visualizer.classList.add("playing");
      } else {
        visualizer.classList.remove("playing");
      }
    }
  }

  // 底部栏事件绑定
  document
    .getElementById("bottom-btn-prev")
    .addEventListener("click", () => postCommand({ type: "prev" }));
  document
    .getElementById("bottom-btn-next")
    .addEventListener("click", () => postCommand({ type: "next" }));
  bottomBar.playBtn.addEventListener("click", () =>
    postCommand({ type: "togglePlay" })
  );
  bottomBar.favBtn.addEventListener("click", () =>
    postCommand({ type: "toggleFavorite" })
  );
  bottomBar.repeatBtn.addEventListener("click", () =>
    postCommand({ type: "toggleRepeat" })
  );
  document.getElementById("bottom-btn-volume").addEventListener("click", () =>
    postCommand({ type: "toggleMute" })
  );

  // 进度条拖拽
  bottomBar.progressBar.addEventListener("mousedown", (e) => {
    isSeeking = true;
    bottomBar.progressBar.classList.add("seeking");
    handleSeek(e);
  });
  document.addEventListener("mousemove", (e) => {
    if (isSeeking) handleSeek(e);
  });
  document.addEventListener("mouseup", (e) => {
    if (isSeeking) {
      isSeeking = false;
      bottomBar.progressBar.classList.remove("seeking");
      const rect = bottomBar.progressBar.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      postCommand({ type: "seek", time: currentIframeState.duration * pct });
    }
  });
  function handleSeek(e) {
    const rect = bottomBar.progressBar.getBoundingClientRect();
    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    bottomBar.progress.style.width = `${pct * 100}%`;
  }

  // 音量拖拽
  bottomBar.volumeBar.addEventListener("mousedown", (e) => {
    isDraggingVolume = true;
    handleVol(e);
  });
  document.addEventListener("mousemove", (e) => {
    if (isDraggingVolume) handleVol(e);
  });
  document.addEventListener("mouseup", () => (isDraggingVolume = false));
  function handleVol(e) {
    const rect = bottomBar.volumeBar.getBoundingClientRect();
    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    bottomBar.volumeLevel.style.width = `${pct * 100}%`;
    postCommand({ type: "setVolume", volume: pct });
  }

  // =======================================
  // 7. 模态框逻辑
  // =======================================

  // 全屏播放器
  const fullPlayerModal = document.getElementById("full-player-modal");
  const bottomControls = document.querySelector(".player-controls");

  function openFullPlayer() {
    fullPlayerModal.classList.add("show");
    bottomControls.style.display = "none";
  }
  bottomControls.addEventListener("click", (e) => {
    if (e.target.closest(".btn") || e.target.closest(".time-control")) return;
    openFullPlayer();
  });
  const closePlayerBtn = document.getElementById("close-player-modal");
  if (closePlayerBtn) {
    closePlayerBtn.addEventListener("click", () => {
      fullPlayerModal.classList.remove("show");
      setTimeout(() => (bottomControls.style.display = "grid"), 400);
    });
  }

  // 底部播放列表
  const plModal = document.getElementById("bottom-playlist-modal");
  const plOverlay = document.getElementById("bottom-playlist-modal-overlay");
  document
    .getElementById("bottom-btn-playlist")
    .addEventListener("click", () => {
      postCommand({ type: "requestPlaylist" });
      plOverlay.style.display = "block";
      plModal.style.display = "flex";
      setTimeout(() => {
        plOverlay.classList.add("show");
        plModal.classList.add("show");
      }, 10);
    });
  function closePl() {
    plOverlay.classList.remove("show");
    plModal.classList.remove("show");
    setTimeout(() => {
      plOverlay.style.display = "none";
      plModal.style.display = "none";
    }, 300);
  }
  document
    .getElementById("bottom-btn-close-modal")
    .addEventListener("click", closePl);
  plOverlay.addEventListener("click", (e) => {
    if (e.target === plOverlay) closePl();
  });

  function renderBottomPlaylist(list, currId, playing) {
    const ul = document.getElementById("bottom-playlist-song-list");
    ul.innerHTML = "";
    list.forEach((s) => {
      const li = document.createElement("li");
      if (s.id === currId) {
        li.classList.add("playing");
        li.innerHTML = `<div class="song-title-wrapper"><span class="song-item-title">${
          s.title
        }</span><div class="playing-icon-container"><span class="playing-bar" style="animation-play-state:${
          playing ? "running" : "paused"
        }"></span><span class="playing-bar" style="animation-play-state:${
          playing ? "running" : "paused"
        }"></span><span class="playing-bar" style="animation-play-state:${
          playing ? "running" : "paused"
        }"></span></div></div><span class="song-item-artist">${
          s.artist
        }</span>`;
      } else {
        li.innerHTML = `<div class="song-title-wrapper"><span class="song-item-title">${s.title}</span></div><span class="song-item-artist">${s.artist}</span>`;
      }
      li.onclick = () => {
        postCommand({ type: "loadAndPlay", id: s.id });
        closePl();
      };
      ul.appendChild(li);
    });
  }

  document.getElementById("open-local-profile").addEventListener("click", () => {
    switchView("mymusic");
    document.querySelector('.nav-item-music[data-tab="edit-profile"]').click();
  });

  // 智能搜索
  const searchInput = document.querySelector(".search-input");
  const searchDrop = document.getElementById("search-dropdown");
  searchInput.addEventListener("input", (e) => {
    const kw = e.target.value.toLowerCase().trim();
    if (!kw) {
      searchDrop.classList.remove("show");
      return;
    }

    const matches = allSongsCache.filter(
      (s) =>
        s.title.toLowerCase().includes(kw) ||
        s.artist.toLowerCase().includes(kw)
    );
    searchDrop.innerHTML = matches.length
      ? matches
          .map(
            (s) => `
          <div class="search-item" data-song-id="${s.id}" onclick="playSong(${s.id}); document.querySelector('.search-input').value=''; document.getElementById('search-dropdown').classList.remove('show');">
              <img src="${s.cover}"><div class="search-item-info"><div class="search-item-title">${s.title}</div><div class="search-item-artist">${s.artist}</div></div>
          </div>
      `
          )
          .join("")
      : '<div class="search-empty">无结果</div>';
    searchDrop.classList.add("show");
  });
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchDrop.contains(e.target))
      searchDrop.classList.remove("show");
  });

  // 磁吸按钮
  document.querySelectorAll(".player-controls .btn").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.4}px, ${y * 0.4}px)`;
      btn.style.transition = "transform 0s";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0,0)";
      btn.style.transition = "transform 0.5s cubic-bezier(0.23,1,0.32,1)";
    });
  });

  // Toast
  let toastTimer;
  function showToast(msg) {
    const t = document.getElementById("toast-notification");
    document.getElementById("toast-message").textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
  }

  // =======================================
  // 8. 初始化
  // =======================================
  renderHomepageSections();

  // 歌曲右键菜单
  const contextMenu = document.getElementById("context-menu");
  let contextMenuTargetId = null;

  // 1. 监听全局右键点击
  document.addEventListener("contextmenu", (e) => {
    // 查找是否点击在歌曲卡片或列表项上
    const card = e.target.closest(
      ".music-card, .content-card, .playlist-item, .search-item"
    );

    const rawId = card?.dataset.songId ?? card?.dataset.id;
    const id = Number(rawId);
    if (rawId === undefined || rawId === "" || !Number.isSafeInteger(id) || id < 0) {
      contextMenu.classList.remove("show");
      return;
    }

    e.preventDefault();
    contextMenuTargetId = id;
    const x = Math.max(0, Math.min(e.clientX, window.innerWidth - 160));
    const y = Math.max(0, Math.min(e.clientY, window.innerHeight - 180));
    contextMenu.style.left = x + "px";
    contextMenu.style.top = y + "px";
    contextMenu.classList.add("show");
  });

  // 2. 点击菜单项
  contextMenu.addEventListener("click", (e) => {
    const item = e.target.closest(".menu-item");
    if (!item || contextMenuTargetId === null) return;

    const action = item.dataset.action;

    if (action === "play") {
      postCommand({ type: "loadAndPlay", id: contextMenuTargetId });
    } else if (action === "next") {
      postCommand({ type: "addToNext", id: contextMenuTargetId });
      showToast("已添加到下一首播放");
    } else if (action === "fav") {
      postCommand({ type: "toggleFavorite", id: contextMenuTargetId });
    }
    contextMenuTargetId = null;

    contextMenu.classList.remove("show");
  });

  // 3. 点击其他地方关闭菜单
  document.addEventListener("click", () =>
    contextMenu.classList.remove("show")
  );

  const volumeArea = document.querySelector(".player-controls .right-buttons");

  volumeArea.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault(); // 防止页面滚动

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
      postCommand({ type: "setVolume", volume: newVolume });

      // 可选：显示一个小 Toast 提示当前音量
      // showToast(`音量: ${Math.round(newVolume * 100)}%`);
    },
    { passive: false }
  );
  // =======================================
  // 21. 全局键盘快捷键
  // =======================================
  document.addEventListener("keydown", (e) => {
    // 如果焦点在输入框内，不触发快捷键
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    switch (e.code) {
      case "Space": // 空格：播放/暂停
        e.preventDefault(); // 防止页面滚动
        postCommand({ type: "togglePlay" });
        break;
      case "ArrowRight": // 右箭头：下一首 (或者你可以改为快进)
        // 如果按下了 Ctrl/Cmd，则是下一首，否则是快进5秒
        if (e.ctrlKey || e.metaKey) {
          postCommand({ type: "next" });
        } else {
          // 需要扩展 iframe 支持 seek 相对时间，这里简化为下一首
          postCommand({ type: "next" });
        }
        break;
      case "ArrowLeft": // 左箭头：上一首
        postCommand({ type: "prev" });
        break;
      case "ArrowUp": // 上箭头：增加音量
        e.preventDefault();
        // 这里需要获取当前音量，稍微复杂，或者直接发送 'volumeUp' 命令让 iframe 处理
        // 简单处理：提示用户使用鼠标
        break;
    }
  });
  // =======================================
  // 22. 拖拽交互
  // =======================================
  function initDragAndDrop() {
    // 1. 让所有歌曲卡片可拖拽
    const cards = document.querySelectorAll(".content-card, .music-card");
    cards.forEach((card) => {
      card.setAttribute("draggable", true);
      card.addEventListener("dragstart", (e) => {
        const songId = card.dataset.id || card.dataset.songId; // 兼容不同页面的属性名
        if (songId) {
          e.dataTransfer.setData("text/plain", songId);
          e.dataTransfer.effectAllowed = "copy";
          // 可以设置一个拖拽时的幽灵图
        }
      });
    });

    // 2. 定义放置区域：底部播放器 (拖进去立即播放)
    const playerDropZone = document.querySelector(".player-controls");

    playerDropZone.addEventListener("dragover", (e) => {
      e.preventDefault(); // 必须阻止默认行为才能 drop
      playerDropZone.style.borderColor = "var(--color-brand-3)"; // 高亮提示
      playerDropZone.style.transform = "scale(1.02)";
    });

    playerDropZone.addEventListener("dragleave", (e) => {
      playerDropZone.style.borderColor = "transparent";
      playerDropZone.style.transform = "scale(1)";
    });

    playerDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      playerDropZone.style.borderColor = "transparent";
      playerDropZone.style.transform = "scale(1)";

      const songId = e.dataTransfer.getData("text/plain");
      if (songId) {
        postCommand({ type: "loadAndPlay", id: parseInt(songId) });
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

    const title = document.getElementById("hero-greeting");
    if (title) title.textContent = greeting;
  }
  setGreeting();
  /* --- app.js --- */

  // =======================================
  // 24. 全局 3D 视差效果
  // =======================================
  function initGlobalParallax() {
    const layeredElements = [
      { el: document.querySelector(".vanta-hero-content"), speed: 0.03 }, // 标题动得慢
      { el: document.querySelector(".sidebar-nav"), speed: -0.02 }, // 侧边栏反向微动
      { el: document.querySelector(".shooting-stars-container"), speed: 0.01 }, // 背景层
    ];
    function throttle(func, limit) {
      let inThrottle;
      return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    }
    document.addEventListener(
      "mousemove",
      throttle((e) => {
        // 计算鼠标相对于屏幕中心的百分比 (-0.5 到 0.5)
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;

        layeredElements.forEach((item) => {
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
      }, 20)
    );
  }
  /* --- app.js --- */
  /* --- app.js --- */


  // =======================================
  // 25. 首页 Vanta 滚动吸附 (Hero -> Discover)
  // =======================================
  let isHeroScrolling = false;

  window.addEventListener(
    "wheel",
    (e) => {
      // 如果正在全屏播放器或模态框中，禁用吸附
      if (
        document.body.classList.contains("modal-open") ||
        document.getElementById("full-player-modal").classList.contains("show")
      ) {
        return;
      }

      // 获取滚动位置
      const scrollY = window.scrollY;
      const headerHeight = document.getElementById("header").offsetHeight;

      // 逻辑：如果在顶部附近 (Vanta区)，且向下滚动
      if (scrollY < 50 && e.deltaY > 0 && !isHeroScrolling) {
        e.preventDefault(); // 阻止默认的卡顿滚动
        isHeroScrolling = true;

        const discoverSection = document.getElementById("discover");
        if (discoverSection) {
          // 计算目标位置 (减去导航栏高度，留出一点呼吸空间)
          const targetTop = discoverSection.offsetTop - headerHeight - 20;

          window.scrollTo({
            top: targetTop,
            behavior: "smooth",
          });

          // 锁定一小段时间，防止连续触发
          setTimeout(() => {
            isHeroScrolling = false;
          }, 1000);
        }
      }
    },
    { passive: false }
  ); // passive: false 允许我们使用 preventDefault

  // =======================================
  // 26. 排行榜数据同步
  // =======================================
  function renderDynamicCharts(allSongs) {
    if (!allSongs || allSongs.length === 0) return;

    // 辅助函数：生成列表 HTML
    const createListHTML = (songs) => {
      return songs
        .map(
          (song, index) => `
                <li>
                    <span>${index + 1}.</span>
                    <a href="#" onclick="playSong(${
                      song.id
                    }); return false;" title="${song.title} - ${song.artist}">
                        ${
                          song.title
                        } <span style="color:var(--text-secondary); font-size:0.8em;">- ${
            song.artist
          }</span>
                    </a>
                </li>
            `
        )
        .join("");
    };

    // 1. 热歌榜 (随机打乱取前5)
    const hotSongs = [...allSongs].sort(() => 0.5 - Math.random()).slice(0, 5);
    document.getElementById("chart-hot").innerHTML = createListHTML(hotSongs);

    // 2. 新歌榜 (取最后5首，假设最后加入的是新的)
    const newSongs = [...allSongs].reverse().slice(0, 5);
    document.getElementById("chart-new").innerHTML = createListHTML(newSongs);

    // 3. 飙升榜 (另一种随机逻辑)
    const soaringSongs = [...allSongs]
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    document.getElementById("chart-soaring").innerHTML =
      createListHTML(soaringSongs);

    // 4. 古风/怀旧榜 (取前5首)
    const retroSongs = allSongs.slice(0, 5);
    document.getElementById("chart-retro").innerHTML =
      createListHTML(retroSongs);
  }

  initTiltEffects();
  initGlobalParallax();
  initLocalProfile(showToast);
  playerIframe.addEventListener("load", () => sendToPlayer({ type: "requestReady" }));
  sendToPlayer({ type: "requestReady" });
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("页面隐藏，暂停动画以节省资源");

    // 1. 暂停 Vanta 背景
    if (window.vantaEffect && window.vantaEffect.destroy) {
      // 注意：vanta destroy 后需要重新 init，或者有些版本支持 pause
      // 简单做法：暂停 requestAnimationFrame 循环
      window.isPageVisible = false;
    } else {
      window.isPageVisible = false;
    }
  } else {
    console.log("页面可见，恢复动画");
    window.isPageVisible = true;

    // 重新启动你的动画循环 (如果在 loop 里加了判断)
    // animateStarfield(); // 如果需要重启
  }
});

// =======================================
// 网页模块整页滚动
// =======================================
function initFastSectionScroll() {
  // 1. 配置参数（加速核心）
  const config = {
    duration: 500, // 滚动时长
    scrollThreshold: 35, // 降低触发阈值，更灵敏
    headerOffset: 80, // 导航栏偏移
    easeFactor: 0.15, // 加速系数（值越大加速越快）
  };

  // 2. 获取所有滚动模块（根据实际结构调整选择器）
  const sections = Array.from(document.querySelectorAll("section, #home"));
  let currentIndex = 0;
  let isScrolling = false;

  // 3. 计算模块位置
  const getSectionPositions = () =>
    sections.map((section) => ({
      top:
        section.getBoundingClientRect().top +
        window.scrollY -
        config.headerOffset,
      element: section,
    }));

  // 4. 快速平滑滚动核心函数
  const scrollToSection = (index) => {
    if (index < 0 || index >= sections.length || isScrolling) return;

    isScrolling = true;
    currentIndex = index;
    const targetY = getSectionPositions()[index].top;
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    // 加速缓动函数（快起快落）
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / config.duration, 1);
      const easedProgress = easeOut(progress);
      window.scrollTo(0, startY + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isScrolling = false;
      }
    };

    requestAnimationFrame(animate);
  };

  // 5. 监听滚动事件（鼠标滚轮+触摸）
  window.addEventListener(
    "wheel",
    (e) => {
      if (isScrolling) return;
      e.deltaY > config.scrollThreshold
        ? scrollToSection(currentIndex + 1) // 下滚
        : e.deltaY < -config.scrollThreshold &&
          scrollToSection(currentIndex - 1); // 上滚
    },
    { passive: false }
  );

  // 6. 移动端触摸支持
  let touchStartY = 0;
  window.addEventListener(
    "touchstart",
    (e) => {
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (e) => {
      if (isScrolling) return;
      const touchDiff = touchStartY - e.changedTouches[0].clientY;
      touchDiff > config.scrollThresholdThreshold
        ? scrollToSection(currentIndex + 1) // 上滑
        : touchDiff < -config.scrollThreshold &&
          scrollToSection(currentIndex - 1); // 下滑
    },
    { passive: true }
  );

  // 7. 窗口 resize 时重新校准
  window.addEventListener("resize", () => {
    const positions = getSectionPositions();
    currentIndex = positions.findIndex(
      (pos) => window.scrollY >= pos.top - 50 && window.scrollY < pos.top + 50
    );
    currentIndex = currentIndex === -1 ? 0 : currentIndex;
  });
}

// 在初始化区域调用
initFastSectionScroll();

// =======================================
// 侧边导航栏拖拽功能
// =======================================

// 侧边栏拖动功能
const sidebar = document.getElementById("sidebarNav");
let isDragging = false;
let startY;
let startTop;

sidebar.addEventListener("mousedown", (e) => {
  isDragging = true;
  sidebar.classList.add("dragging");
  startY = e.clientY;
  startTop = parseInt(window.getComputedStyle(sidebar).top);
  e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const deltaY = e.clientY - startY;
  sidebar.style.top = `${startTop + deltaY}px`;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  sidebar.classList.remove("dragging");
});

// 侧边栏激活状态
const sidebarLinks = document.querySelectorAll(".sidebar-link");
const sections = document.querySelectorAll("section[id]");

window.addEventListener("scroll", () => {
  let current = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (window.scrollY >= sectionTop - 300) {
      current = section.getAttribute("id");
    }
  });

  sidebarLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("data-target") === current) {
      link.classList.add("active");
    }
  });
});

function initCarouselControls() {
  if (typeof gsap === "undefined") return;
  // 为每个轮播容器添加唯一标识，避免重复初始化
  document
    .querySelectorAll(".content-carousel-container:not([data-initialized])")
    .forEach((container) => {
      container.setAttribute("data-initialized", "true"); // 标记已初始化

      const prevBtn = container.querySelector(".prev-btn");
      const nextBtn = container.querySelector(".next-btn");
      if (!prevBtn || !nextBtn) return;

      prevBtn.classList.add("carousel-btn");
      nextBtn.classList.add("carousel-btn");

      const track = container.querySelector(".content-track");
      const cards = track.querySelectorAll(".content-card");
      if (!cards.length) return;

      // 计算卡片宽度（包含间距）- 使用getBoundingClientRect更精确
      const cardRect = cards[0].getBoundingClientRect();
      const cardWidth = cardRect.width + 20; // 20px是间距
      let currentPosition = 0;
      let marqueeAnim = null;
      let isAnimating = false; // 防止动画叠加

      // 计算最大滚动距离
      const getMaxScroll = () => {
        return Math.max(
          0,
          cards.length * cardWidth - container.getBoundingClientRect().width
        );
      };

      // 更新按钮状态
      const updateButtonState = () => {
        const maxScroll = getMaxScroll();
        const isAtStart = currentPosition <= 0;
        const isAtEnd = currentPosition >= maxScroll;

        prevBtn.disabled = isAtStart;
        nextBtn.disabled = isAtEnd;
        prevBtn.toggleAttribute("disabled", isAtStart);
        nextBtn.toggleAttribute("disabled", isAtEnd);
      };

      // 初始化自动滚动（跑马灯）- 降低速度减少卡顿
      const initMarquee = () => {
        if (marqueeAnim) marqueeAnim.kill();

        const totalWidth = cards.length * cardWidth;
        const duration = totalWidth / 60; // 降低速度（原100→60）

        marqueeAnim = gsap.to(track, {
          x: `-=${totalWidth / 3}`, // 减少滚动距离（原1/2→1/3）
          duration: duration,
          ease: "none",
          repeat: -1,
          onUpdate: () => {
            currentPosition = Math.abs(gsap.getProperty(track, "x"));
            updateButtonState();
          },
          // 启用硬件加速
          willChange: "transform",
        });
      };

      // 滚动动画 - 单次滚动1张卡片，优化性能
      const scrollToPosition = (position) => {
        if (isAnimating) return; // 防止连续点击导致卡顿

        // 暂停自动播放
        if (marqueeAnim) marqueeAnim.pause();

        isAnimating = true;
        const maxScroll = getMaxScroll();
        currentPosition = Math.max(0, Math.min(position, maxScroll));

        gsap.to(track, {
          x: -currentPosition,
          duration: 0.4, // 缩短动画时间减少卡顿
          ease: "power2.out",
          // 启用硬件加速
          willChange: "transform",
          onComplete: () => {
            isAnimating = false;
            updateButtonState();
            initMarquee(); // 恢复自动播放
          },
        });
      };

      // 绑定按钮事件 - 单次滚动1张卡片（更少的距离）
      prevBtn.addEventListener(
        "click",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          scrollToPosition(currentPosition - cardWidth); // 保持单次滚动1张
        },
        { passive: true }
      );

      nextBtn.addEventListener(
        "click",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          scrollToPosition(currentPosition + cardWidth); // 保持单次滚动1张
        },
        { passive: true }
      );

      // 窗口大小改变时优化
      const handleResize = () => {
        // 使用requestAnimationFrame避免频繁触发
        requestAnimationFrame(() => {
          const maxScroll = getMaxScroll();
          currentPosition = Math.min(currentPosition, maxScroll);
          gsap.set(track, { x: -currentPosition });
          updateButtonState();
          initMarquee();
        });
      };

      // 防抖处理窗口resize
      let resizeTimeout;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 100);
      });

      // 鼠标悬停控制 - 更平滑的速度过渡
      container.addEventListener("mouseenter", () => {
        if (marqueeAnim) {
          gsap.to(marqueeAnim, {
            timeScale: 0.1,
            duration: 0.8,
            ease: "power2.inOut",
          });
        }
      });

      container.addEventListener("mouseleave", () => {
        if (marqueeAnim) {
          gsap.to(marqueeAnim, {
            timeScale: 1,
            duration: 0.8,
            ease: "power2.inOut",
          });
        }
      });

      // 初始化
      updateButtonState();
      initMarquee();
    });
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
  // 确保内容渲染完成后初始化
  setTimeout(initCarouselControls, 600); // 适当缩短超时时间

  // 监听动态添加的轮播容器
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (
          node.nodeType === 1 &&
          node.classList.contains("content-carousel-container")
        ) {
          // 延迟初始化，确保子元素加载完成
          setTimeout(() => initCarouselControls(), 200);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
});
