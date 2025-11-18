/*
 * script.js
 * 《音乐世界》音乐播放器交互脚本
 *
 * 1. (新增) 动态内容加载
 * 2. DOMContentLoaded
 * 3. 交互 1: 导航栏滚动
 * 4. 交互 2: 登录弹窗
 * 5. 交互 3: 主题切换
 * ... (后续交互) ...
 */

// =======================================
// 1. (新增) 动态内容加载
// =======================================

/**
 * (新增) 辅助函数：获取所有歌曲的详细信息
 * 这段逻辑复制自 music-player.js，以确保数据源一致
 */
async function fetchAllSongInfo() {
    let songFolders = [];
    try {
        const response = await fetch('playlist.json');
        if (!response.ok) throw new Error('playlist.json 加载失败。');
        songFolders = await response.json();
    } catch (e) {
        console.error("加载 playlist.json 失败:", e);
        return []; // 返回空数组
    }

    let songList = [];
    for (let i = 0; i < songFolders.length; i++) {
        const folder = songFolders[i];
        const basePath = `songs/${folder}/`;
        try {
            const response = await fetch(`${basePath}info.json`);
            if (!response.ok) throw new Error(`配置缺失: ${folder}`);
            const info = await response.json();
            
            songList.push({
                id: i, // ID (基于 playlist.json 的顺序)
                title: info.title,
                artist: info.artist,
                cover: `${basePath}cover.jpg`, // 封面路径
            });
        } catch (error) {
            console.error(`加载失败 [${folder}]:`, error);
        }
    }
    return songList;
}

/**
 * (新增) 辅助函数：根据歌曲信息创建 HTML 卡片
 */
function createSongCardHTML(song) {
    // 关键：链接指向 mymusic.html 并附带播放 ID
    return `
    <a
      class="content-card"
      href="mymusic.html?play=${song.id}"
      data-title="${song.title}"
      data-artist="${song.artist}"
      data-img-src="${song.cover}"
    >
      <div class="card-image">
        <img src="${song.cover}" alt="${song.title} 专辑封面" />
        <div class="play-icon">
          <i class="fas fa-play"></i>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${song.title}</h3>
        <p class="card-artist">${song.artist}</p>
      </div>
    </a>`;
}

/**
 * (新增) 渲染动态内容到主页
 */
async function renderHomepageSections() {
    console.log("开始加载动态主页内容...");
    const allSongs = await fetchAllSongInfo();
    if (allSongs.length === 0) {
        console.warn("未能加载任何歌曲信息，主页内容将为空。");
        return;
    }

    const discoverTrack = document.querySelector('#discover .content-track');
    const newReleaseTrack = document.querySelector('#new-releases .content-track');

    if (discoverTrack) {
        // "猜你喜欢" -> 随机打乱所有歌曲
        const shuffledSongs = [...allSongs].sort(() => 0.5 - Math.random());
        discoverTrack.innerHTML = shuffledSongs.map(createSongCardHTML).join('');
    }

    if (newReleaseTrack) {
        // "新歌发行" -> 显示最后10首 (模拟最新)
        const newSongs = allSongs.slice(-10).reverse(); // 获取最后10首并倒序
        newReleaseTrack.innerHTML = newSongs.map(createSongCardHTML).join('');
    }
    console.log("动态内容渲染完毕。");
}


// 2. 确保所有 DOM 元素加载完毕后再执行脚本
document.addEventListener("DOMContentLoaded", async () => {

  // ========================================================
  // (关键修改) 首先加载动态内容，再初始化其他 JS 特效
  // ========================================================
  await renderHomepageSections();

  const header = document.getElementById("header");
  let vantaEffect = null;
  const snowflakeCanvas = document.getElementById('snowflake-canvas');

  // =======================================
  // 3. 交互 1: 导航栏滚动效果
  // =======================================
  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    });
  }

  // =======================================
  // 4. 交互 2: 登录弹窗
  // =======================================
  const loginModal = document.getElementById("loginModal");
  const showLoginBtn = document.getElementById("showLoginBtn");
  const closeLoginBtn = document.getElementById("closeLoginBtn");
  function showLoginModal() { if (loginModal) loginModal.classList.add("show"); }
  function closeLoginModal() { if (loginModal) loginModal.classList.remove("show"); }
  if (showLoginBtn) showLoginBtn.addEventListener("click", showLoginModal);
  if (closeLoginBtn) closeLoginBtn.addEventListener("click", closeLoginModal);
  if (loginModal) {
    loginModal.addEventListener("click", function (event) {
      if (event.target === loginModal) { closeLoginModal(); }
    });
  }

  // =======================================
  // 5. 交互 3: 主题切换
  // =======================================
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  if (themeToggleBtn) {
    const currentTheme = localStorage.getItem("music-theme");
    if (currentTheme === "dark") {
      document.body.classList.add("dark-mode");
    }

    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      let theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
      localStorage.setItem("music-theme", theme);
      initVanta(); // 主题切换时重建 Vanta
    });
  }

  // =======================================
  // 6. 交互 4: WebGL 动态背景 (Vanta.js)
  // =======================================
  const vantaContainer = document.getElementById('home');
  function initVanta() {
    if (vantaEffect) {
      vantaEffect.destroy();
    }
    if (vantaContainer && typeof VANTA !== 'undefined' && typeof THREE !== 'undefined') {
      const isDark = document.body.classList.contains('dark-mode');
      vantaEffect = VANTA.WAVES({
        el: vantaContainer,
        THREE: THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color: isDark ? 0x5aa4e6 : 0x423b63,
        shininess: 30.00,
        waveHeight: 15.00,
        waveSpeed: 0.8,
        zoom: 0.75
      });
    } else if (typeof VANTA === 'undefined' || typeof THREE === 'undefined') {
      console.warn("Vanta.js or Three.js is not loaded. WebGL background disabled.");
    }
  }
  initVanta(); // 首次初始化


  // =======================================
  // 7. 交互 5.1 (V3.1): 无限 Marquee (GSAP)
  // =======================================
  /**
   * V3.1: 初始化 GSAP 无限滚动 Marquee
   * @param {string} containerSelector 
   */
  function initInfiniteMarquee(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container || typeof gsap === 'undefined') {
      console.warn(`GSAP not loaded or container not found for Marquee: ${containerSelector}.`);
      return;
    }

    const track = container.querySelector(".content-track");
    const cards = Array.from(container.querySelectorAll(".content-card"));
    if (!track || cards.length === 0) {
        console.warn(`Marquee track (${containerSelector}) 为空, GSAP 动画已跳过。`);
        return; // (修改) 如果没有内容，则跳过
    }

    // 1. 克隆卡片
    let totalWidth = 0;
    const gap = parseInt(window.getComputedStyle(track).gap) || 20;
    cards.forEach(card => {
      totalWidth += card.offsetWidth + gap;
    });
    const originalTrackWidth = totalWidth;
    
    // (修改) 仅在需要时克隆
    if (originalTrackWidth > 0) {
        const minWidth = Math.max(window.innerWidth * 3, 5000);
        while (totalWidth < minWidth) {
          cards.forEach(card => {
            const clone = card.cloneNode(true);
            track.appendChild(clone);
          });
          totalWidth += originalTrackWidth;
        }
    } else {
        return; // 没有宽度，无法动画
    }


    // 2. 隐藏按钮 (以防万一 CSS 没生效)
    const prevBtn = container.querySelector(".carousel-btn.prev");
    const nextBtn = container.querySelector(".carousel-btn.next");
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';

    // 3. GSAP 动画
    const duration = originalTrackWidth / (250 / 5); // 假设 5 秒滚 250px

    const marqueeAnim = gsap.to(track, {
      x: `-=${originalTrackWidth}`, // 移动一个循环的距离
      duration: duration,
      ease: "none",
      repeat: -1, // 无限重复
    });

    // 4. 悬停时减速
    container.addEventListener('mouseenter', () => {
      gsap.to(marqueeAnim, { timeScale: 0.2, duration: 0.5 });
    });
    container.addEventListener('mouseleave', () => {
      gsap.to(marqueeAnim, { timeScale: 1, duration: 0.5 });
    });
  }

  // --- V3.1: 初始化 Marquees ---
  // (修改) 确保在动态内容加载后调用
  initInfiniteMarquee("#discover .content-carousel-container");
  initInfiniteMarquee("#new-releases .content-carousel-container");

  // =======================================
  // 8. 交互 6: 滚动监听 (侧边栏/导航)
  // =======================================
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  const navLinks = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll("section[id], footer[id]");
  if (sidebarLinks.length > 0 && sections.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const targetId = entry.target.id;
          sidebarLinks.forEach(link => {
            link.classList.toggle("active", link.dataset.target === targetId);
          });
          navLinks.forEach(link => {
            if (link.getAttribute('href') && link.getAttribute('href').startsWith("#")) {
              const isActive = link.getAttribute('href') === `#${targetId}`;
              link.classList.toggle("active", isActive);
              if (isActive) {
                movePill(link);
                activeNavItem = link;
              }
            }
          });
        }
      });
    }, { root: null, threshold: 0.5 });
    sections.forEach(section => { observer.observe(section); });
  }

  // =======================================
  // 9. 交互 7: 可拖动侧边栏
  // =======================================
  const sidebar = document.getElementById("sidebarNav");
  if (sidebar) {
    let isDragging = false;
    let offsetY = 0;
    sidebar.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains('sidebar-link') || e.target.closest('.sidebar-link')) {
        return;
      }
      isDragging = true;
      sidebar.classList.add("dragging");
      offsetY = e.clientY - sidebar.getBoundingClientRect().top;
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      let newTop = e.clientY - offsetY;
      const headerHeight = header ? header.offsetHeight : 60;
      const windowHeight = window.innerHeight;
      const sidebarHeight = sidebar.offsetHeight;
      if (newTop < headerHeight) { newTop = headerHeight; }
      if (newTop > windowHeight - sidebarHeight) { newTop = windowHeight - sidebarHeight; }
      sidebar.style.top = `${newTop}px`;
    });
    window.addEventListener("mouseup", () => {
      isDragging = false;
      sidebar.classList.remove("dragging");
    });
  }

  // =======================================
  // 10. 交互 8: 自定义锚点滚动
  // =======================================
  function smoothScrollToCenter(event, targetId) {
    event.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;
    if (targetId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (targetId === 'footer') {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    const header = document.getElementById("header");
    const headerHeight = header ? header.offsetHeight : 60;
    const targetRect = targetElement.getBoundingClientRect();
    const targetCenter = targetRect.top + window.scrollY + (targetRect.height / 2);
    const windowCenter = window.innerHeight / 2;
    const centerScrollY = targetCenter - windowCenter;
    const topScrollY = targetRect.top + window.scrollY - headerHeight - 20;
    let scrollToY;
    if (targetRect.height > window.innerHeight - headerHeight - 20) {
      scrollToY = topScrollY;
    } else {
      scrollToY = centerScrollY;
    }
    window.scrollTo({ top: scrollToY, behavior: "smooth" });
  }
  document.querySelectorAll('.nav-item[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').substring(1);
      if (targetId) { smoothScrollToCenter(e, targetId); }
    });
  });
  document.querySelectorAll('.sidebar-link[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').substring(1);
      if (targetId) { smoothScrollToCenter(e, targetId); }
    });
  });


  // =======================================
  // 11. 交互 9 (V2): 首页滚动吸附
  // =======================================
  let isSnapping = false;
  let snapTimeout;

  window.addEventListener('wheel', (e) => {
    if (isSnapping) {
      e.preventDefault();
      return;
    }

    const homeSection = document.getElementById('home');
    if (!homeSection) return;

    const homeRect = homeSection.getBoundingClientRect();
    const isAtHome = homeRect.top >= -100 && homeRect.bottom > window.innerHeight - 100;

    if (isAtHome && e.deltaY > 0) {
      isSnapping = true;
      e.preventDefault();

      const discoverSection = document.getElementById('discover');
      const header = document.getElementById("header");
      const headerHeight = header ? header.offsetHeight : 60;

      if (discoverSection) {
        const topScrollY = discoverSection.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
        window.scrollTo({
          top: topScrollY,
          behavior: 'smooth'
        });
      }

      clearTimeout(snapTimeout);
      snapTimeout = setTimeout(() => {
        isSnapping = false;
      }, 1000);
    }
  }, { passive: false });


  // =======================================
  // 12. 交互 10: 动态流星
  // =======================================
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

  // =======================================
  // 13. 交互 11: 3D 倾斜卡片
  // =======================================
  // (修改) 将此逻辑放入一个函数，以便在内容加载后调用
  function initTiltEffects() {
    document.querySelectorAll('.content-carousel-container[data-marquee="true"] .content-card').forEach(card => {
        const maxRotate = 12;
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const { width, height } = rect;
          const rotateX = maxRotate * ((y / height) - 0.5) * -1;
          const rotateY = maxRotate * ((x / width) - 0.5);
          card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = `rotateX(0deg) rotateY(0deg)`;
        });
    });
  }
  initTiltEffects(); // (修改) 调用函数

  // =======================================
  // 14. 交互 12: GSAP 卡片悬停
  // =======================================
  // (修改) 将此逻辑放入一个函数，以便在内容加载后调用
  function initGsapHoverEffects() {
    if (typeof gsap !== 'undefined') {
        document.querySelectorAll('.content-carousel-container[data-marquee="true"] .content-card').forEach(card => {
          const image = card.querySelector('.card-image');
          const content = card.querySelector('.card-content');
          const playIcon = card.querySelector('.play-icon');
          const hoverTimeline = gsap.timeline({ paused: true });

          hoverTimeline
            .to(image, {
              y: -5,
              scale: 1.03,
              boxShadow: "0 10px 30px var(--color-shadow)",
              duration: 0.3,
              ease: "power1.out"
            })
            .to(content, {
              y: -5,
              boxShadow: "0 10px 30px var(--color-shadow)",
              duration: 0.3,
              ease: "power1.out"
            }, "-=0.25")
            .to(playIcon, {
              opacity: 1,
              scale: 1.1,
              duration: 0.4,
              ease: "elastic.out(1, 0.4)"
            }, "-=0.2");

          card.addEventListener('mouseenter', () => { hoverTimeline.play(); });
          card.addEventListener('mouseleave', () => { hoverTimeline.reverse(); });
        });
    } else {
        console.warn("GSAP library not loaded. Hover effects will be disabled.");
    }
  }
  initGsapHoverEffects(); // (修改) 调用函数

  // =======================================
  // 15. 交互 13: 视口过渡 (View Transitions)
  // =======================================
  const mainContentArea = document.getElementById('mainContentArea');
  const detailPage = document.getElementById('detailPage');
  const detailImage = document.getElementById('detailImage');
  const detailTitle = document.getElementById('detailTitle');
  const detailArtist = document.getElementById('detailArtist');
  const closeDetailBtn = document.getElementById('closeDetailBtn');
  let lastActiveCardImage = null;
  let lastActiveCardTitle = null;
  
  // (修改) 移除旧的 .content-card 点击监听器，因为它现在是 <a> 标签
  
  if (closeDetailBtn) {
    closeDetailBtn.addEventListener('click', () => {
      if (!document.startViewTransition) {
        hideDetailPage();
        return;
      }
      document.startViewTransition(() => {
        hideDetailPage();
        if (lastActiveCardImage) lastActiveCardImage.classList.add('transition-active');
        if (lastActiveCardTitle) lastActiveCardTitle.classList.add('transition-active');
        lastActiveCardImage = null;
        lastActiveCardTitle = null;
      });
    });
  }
  function updateDetailPageContent(imgSrc, title, artist) {
    detailImage.innerHTML = `<img src="${imgSrc}" alt="${title}" />`;
    detailTitle.textContent = title;
    detailArtist.textContent = artist;
  }
  function showDetailPage() {
    mainContentArea.style.display = 'none';
    detailPage.classList.add('show');
    window.scrollTo(0, 0);
  }
  function hideDetailPage() {
    mainContentArea.style.display = 'block';
    detailPage.classList.remove('show');
  }

  // =======================================
  // 16. 交互 14: 导航栏滑动药丸
  // =======================================
  const navOptions = document.querySelector(".nav-options");
  const navPill = document.querySelector(".nav-pill");
  const pillNavItems = document.querySelectorAll('.nav-options .nav-item[href^="#"]');
  let activeNavItem = null;
  function movePill(targetItem) {
    if (!targetItem || !navPill || !navOptions) return;
    if (window.innerWidth <= 768) {
      navPill.style.opacity = '0';
      return;
    }
    const containerRect = navOptions.getBoundingClientRect();
    const targetRect = targetItem.getBoundingClientRect();
    const pillWidth = targetRect.width;
    const pillHeight = targetRect.height;
    const pillLeft = targetRect.left - containerRect.left;
    const pillTop = targetRect.top - containerRect.top;
    navPill.style.width = `${pillWidth}px`;
    navPill.style.height = `${pillHeight}px`;
    navPill.style.left = `${pillLeft}px`;
    navPill.style.top = `${pillTop}px`;
    navPill.style.opacity = '1';
  }
  const initialActiveItem = document.querySelector('.nav-options .nav-item[href="#home"]');
  if (initialActiveItem) {
    setTimeout(() => {
      movePill(initialActiveItem);
      activeNavItem = initialActiveItem;
    }, 100);
  }
  pillNavItems.forEach(item => {
    item.addEventListener('mouseenter', () => { movePill(item); });
  });
  if (navOptions) {
    navOptions.addEventListener('mouseleave', () => {
      if (activeNavItem) {
        movePill(activeNavItem);
      } else if (initialActiveItem) {
        movePill(initialActiveItem);
      }
    });
  }
  window.addEventListener('resize', () => {
    if (activeNavItem) {
      const oldTransition = navPill.style.transition;
      navPill.style.transition = 'none';
      movePill(activeNavItem);
      setTimeout(() => {
        navPill.style.transition = oldTransition;
      }, 50);
    }
  });

  // =======================================
  // 17. 交互 15 (V3): Swiper 3D Coverflow
  // =======================================
  if (typeof Swiper !== 'undefined') {
    new Swiper('.mv-swiper-container', {
      effect: 'coverflow', // 启用 Coverflow
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 'auto', // 自动计算数量
      loop: true, // 循环
      coverflowEffect: {
        rotate: 40, // 旋转角度
        stretch: 0,
        depth: 100, // 深度
        modifier: 1,
        slideShadows: true, // 开启阴影
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      breakpoints: {
        480: {
          coverflowEffect: {
            rotate: 30,
            depth: 80,
          },
        },
        768: {
          coverflowEffect: {
            rotate: 40,
            depth: 100,
          },
        }
      }
    });
  } else {
    console.warn("Swiper.js not loaded. MV Coverflow disabled.");
  }

  // =======================================
  // 18. 交互 16 (V3.3): 鼠标跟随雪花
  // =======================================
  if (snowflakeCanvas) {
    let snowflakeThrottleTimer = null; // 雪花专用的节流阀

    function spawnSnowflake(x, y) {
      const snowflake = document.createElement('div');
      snowflake.className = 'mouse-snowflake';
      snowflake.style.left = `${x}px`;
      snowflake.style.top = `${y}px`;
      const driftX = (Math.random() - 0.5) * 100;
      const driftY = (Math.random() * 50) + 100;
      snowflake.style.setProperty('--drift-x', `${driftX}px`);
      snowflake.style.setProperty('--drift-y', `${driftY}px`);
      snowflakeCanvas.appendChild(snowflake);
      setTimeout(() => {
        snowflake.remove();
      }, 2000); 
    }

    document.body.addEventListener('mousemove', (e) => {
      if (!snowflakeThrottleTimer) {
        snowflakeThrottleTimer = setTimeout(() => {
          spawnSnowflake(e.clientX, e.clientY);
          snowflakeThrottleTimer = null; 
        }, 50); 
      }
    });

  } 

  // =======================================
  // 19. (新增) 页面加载时处理锚点
  // =======================================
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1);
    if (targetId) {
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} };
        smoothScrollToCenter(fakeEvent, targetId);
      }, 500); 
    }
  }

}); // DOMContentLoaded 结束