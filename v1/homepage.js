/*
 * script.js
 * 《音乐世界》音乐播放器交互脚本
 *
 * 1. DOMContentLoaded
 * 2. 交互 1: 导航栏滚动
 * 3. 交互 2: 登录弹窗
 * 4. 交互 3: 主题切换
 * 5. 交互 4: WebGL 动态背景 (Vanta.js)
 * (交互 5: 标准轮播 已被 Marquee 取代)
 * 6. 交互 5.1 (V3.1): 无限 Marquee (GSAP)
 * 7. 交互 6: 滚动监听 (侧边栏/导航)
 * 8. 交互 7: 可拖动侧边栏
 * 9. 交互 8: 自定义锚点滚动
 * 10. 交互 9 (V2): 首页滚动吸附 (已恢复)
 * 11. 交互 10: 动态流星
 * 12. 交互 11: 3D 倾斜卡片 (V3.1: 仅限 Marquee)
 * 13. 交互 12: GSAP 卡片悬停 (V3.1: 仅限 Marquee)
 * 14. 交互 13: 视口过渡 (View Transitions)
 * 15. 交互 14: 导航栏滑动药丸
 * 16. 交互 15 (V3): Swiper 3D Coverflow
 * 17. 交互 16 (V3.3): 鼠标跟随雪花
 */

// 1. 确保所有 DOM 元素加载完毕后再执行脚本
document.addEventListener("DOMContentLoaded", () => {

  const header = document.getElementById("header");
  let vantaEffect = null;
  // V3.3: 获取雪花画布
  const snowflakeCanvas = document.getElementById('snowflake-canvas');

  // =======================================
  // 2. 交互 1: 导航栏滚动效果
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
  // 3. 交互 2: 登录弹窗
  // =======================================
  // ... (代码不变, 此处省略) ...
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
  // 4. 交互 3: 主题切换
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
  // 5. 交互 4: WebGL 动态背景 (Vanta.js)
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
  // 6. 交互 5.1 (V3.1): 无限 Marquee (GSAP)
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
    if (!track || cards.length === 0) return;

    // 1. 克隆卡片
    let totalWidth = 0;
    const gap = parseInt(window.getComputedStyle(track).gap) || 20;
    cards.forEach(card => {
      totalWidth += card.offsetWidth + gap;
    });
    const originalTrackWidth = totalWidth;
    const minWidth = Math.max(window.innerWidth * 3, 5000);

    while (totalWidth < minWidth) {
      cards.forEach(card => {
        const clone = card.cloneNode(true);
        track.appendChild(clone);
      });
      totalWidth += originalTrackWidth;
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
  initInfiniteMarquee("#discover .content-carousel-container");
  initInfiniteMarquee("#new-releases .content-carousel-container");

  // (V3.1: Swiper 在 交互 15 中初始化)


  // =======================================
  // 7. 交互 6: 滚动监听 (侧边栏/导航)
  // =======================================
  // ... (代码不变, 此处省略) ...
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
  // 8. 交互 7: 可拖动侧边栏
  // =======================================
  // ... (代码不变, 此处省略) ...
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
  // 9. 交互 8: 自定义锚点滚动
  // =======================================
  // ... (smoothScrollToCenter 函数不变) ...
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
  // ... (锚点绑定代码不变) ...
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
  // 10. 交互 9 (V2): 首页滚动吸附 (已恢复)
  // =======================================
  // (V3.1 恢复: V2 的交互 9)
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
  // 11. 交互 10: 动态流星
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
  // 12. 交互 11: 3D 倾斜卡片 (V3.1: 仅限 Marquee)
  // =======================================
  // V3.1 修改: 选择器改为 data-marquee, 以匹配 discover 和 new-releases
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

  // =======================================
  // 13. 交互 12: GSAP 卡片悬停 (V3.1: 仅限 Marquee)
  // =======================================
  if (typeof gsap !== 'undefined') {
    // V3.1 修改: 选择器改为 data-marquee
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


  // =======================================
  // 14. 交互 13: 视口过渡 (View Transitions)
  // =======================================
  // ... (代码不变, 此处省略) ...
  const mainContentArea = document.getElementById('mainContentArea');
  const detailPage = document.getElementById('detailPage');
  const detailImage = document.getElementById('detailImage');
  const detailTitle = document.getElementById('detailTitle');
  const detailArtist = document.getElementById('detailArtist');
  const closeDetailBtn = document.getElementById('closeDetailBtn');
  let lastActiveCardImage = null;
  let lastActiveCardTitle = null;
  document.querySelectorAll('.content-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const imgSrc = card.dataset.imgSrc;
      const title = card.dataset.title;
      const artist = card.dataset.artist;
      const cardImageEl = card.querySelector('.card-image');
      const cardTitleEl = card.querySelector('.card-title');
      if (!document.startViewTransition) {
        updateDetailPageContent(imgSrc, title, artist);
        showDetailPage();
        return;
      }
      const transition = document.startViewTransition(() => {
        updateDetailPageContent(imgSrc, title, artist);
        showDetailPage();
        cardImageEl.classList.add('transition-active');
        cardTitleEl.classList.add('transition-active');
        lastActiveCardImage = cardImageEl;
        lastActiveCardTitle = cardTitleEl;
      });
      transition.finished.then(() => {
        if (lastActiveCardImage) lastActiveCardImage.classList.remove('transition-active');
        if (lastActiveCardTitle) lastActiveCardTitle.classList.remove('transition-active');
      });
    });
  });
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
  // 15. 交互 14: 导航栏滑动药丸
  // =======================================
  // ... (代码不变, 此处省略) ...
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
  // 16. 交互 15 (V3): Swiper 3D Coverflow
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
  // 17. 交互 16 (V3.3): 鼠标跟随雪花
  // =======================================
  if (snowflakeCanvas) {
    let snowflakeThrottleTimer = null; // 雪花专用的节流阀

    /**
     * V3.3: 在指定位置生成一个雪花
     * @param {number} x - 鼠标 x 坐标
     * @param {number} y - 鼠标 y 坐标
     */
    function spawnSnowflake(x, y) {
      const snowflake = document.createElement('div');
      snowflake.className = 'mouse-snowflake';

      // 1. 设置初始位置
      snowflake.style.left = `${x}px`;
      snowflake.style.top = `${y}px`;

      // 2. 为 @keyframes fallAndDrift 设置随机的 CSS 变量
      const driftX = (Math.random() - 0.5) * 100; // 随机左右漂移 -50px 到 50px
      const driftY = (Math.random() * 50) + 100; // 随机下落 100px 到 150px

      snowflake.style.setProperty('--drift-x', `${driftX}px`);
      snowflake.style.setProperty('--drift-y', `${driftY}px`);

      // 3. 添加到画布
      snowflakeCanvas.appendChild(snowflake);

      // 4. 动画结束后 (2秒) 移除 DOM 元素，防止内存泄漏
      setTimeout(() => {
        snowflake.remove();
      }, 2000); // 必须匹配 CSS 动画时长
    }

    // 5. 监听鼠标移动
    document.body.addEventListener('mousemove', (e) => {
      if (!snowflakeThrottleTimer) {
        snowflakeThrottleTimer = setTimeout(() => {
          // 在鼠标位置生成一个雪花
          spawnSnowflake(e.clientX, e.clientY);
          snowflakeThrottleTimer = null; // 重置节流阀
        }, 50); // 每 50ms 生成一个雪花 (根据你的 CSS 注释修正)
      }
    });

  } // if (snowflakeCanvas) 结束
// =======================================
  // 18. (新增) 页面加载时处理锚点
  // =======================================
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1);
    if (targetId) {
      // 等待页面（尤其是 Vanta.js 特效）稳定后再滚动
      setTimeout(() => {
        // 创建一个模拟事件对象
        const fakeEvent = { preventDefault: () => {} };
        // 调用您现有的平滑滚动函数
        smoothScrollToCenter(fakeEvent, targetId);
      }, 500); // 延迟 500 毫秒，确保 Vanta 特效已加载
    }
  }

}); // DOMContentLoaded 结束