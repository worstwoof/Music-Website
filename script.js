/*
 * script.js
 * 音乐播放器融合版交互脚本 (V2)
 *
 * 1. DOMContentLoaded: 确保所有 DOM 加载完毕
 * 2. 交互 1: 导航栏滚动效果 (来自 02)
 * 3. 交互 2: 登录弹窗 (来自 02)
 * 4. 交互 3: 主题切换 (明/暗模式)
 * 5. 交互 4: 顶部全屏轮播图 (优化淡入淡出效果)
 * 6. 交互 5: 内容轮播 (猜你喜欢 / MV / 【V2】新歌发行)
 * 7. 交互 6: 侧边栏滚动监听
 * 8. 【V2 新增】: 交互 7: 可拖动侧边栏
 */

// 1. 确保所有 DOM 元素加载完毕后再执行脚本
document.addEventListener("DOMContentLoaded", () => {
  // =======================================
  // 2. 交互 1: 导航栏滚动效果 (来自 02)
  // =======================================
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

  // =======================================
  // 3. 交互 2: 登录弹窗 (来自 02)
  // =======================================
  const loginModal = document.getElementById("loginModal");
  const showLoginBtn = document.getElementById("showLoginBtn");
  const closeLoginBtn = document.getElementById("closeLoginBtn");

  function showLoginModal() {
    if (loginModal) loginModal.classList.add("show");
  }
  function closeLoginModal() {
    if (loginModal) loginModal.classList.remove("show");
  }

  if (showLoginBtn) showLoginBtn.addEventListener("click", showLoginModal);
  if (closeLoginBtn) closeLoginBtn.addEventListener("click", closeLoginModal);

  if (loginModal) {
    loginModal.addEventListener("click", function (event) {
      if (event.target === loginModal) {
        closeLoginModal();
      }
    });
  }

  // =======================================
  // 4. 交互 3: 主题切换 (明/暗模式)
  // =======================================
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  if (themeToggleBtn) {
    // 检查本地存储
    const currentTheme = localStorage.getItem("music-theme");
    if (currentTheme === "dark") {
      document.body.classList.add("dark-mode");
    }

    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      let theme = document.body.classList.contains("dark-mode")
        ? "dark"
        : "light";
      localStorage.setItem("music-theme", theme);
    });
  }

  // =======================================
  // 5. 交互 4: 顶部全屏轮播图 (优化淡入淡出效果)
  // =======================================
  const carouselSlides = document.querySelectorAll(".carousel-slide");
  const carouselDots = document.querySelectorAll(".carousel-dot");
  const prevBtn = document.getElementById("hero-prev");
  const nextBtn = document.getElementById("hero-next");
  const carouselContainer = document.querySelector(".fullscreen-carousel");

  let currentIndex = 0;
  let autoplayInterval;
  const transitionDuration = 1200; // 过渡动画时长（毫秒），优化为1.2秒
  const displayDuration = 4000; // 每张轮播图显示时长（毫秒），优化为4秒

  // 初始化轮播图样式
  function initCarousel() {
    carouselSlides.forEach((slide, index) => {
      // 设置基础样式
      slide.style.position = "absolute";
      slide.style.top = "0";
      slide.style.left = "0";
      slide.style.width = "100%";
      slide.style.height = "100%";
      slide.style.opacity = index === 0 ? "1" : "0";
      slide.style.transition = `opacity ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`; // 使用缓动函数使过渡更自然
      slide.style.pointerEvents = index === 0 ? "auto" : "none"; // 非激活项不响应鼠标事件
    });

    // 初始化导航点
    updateDots();

    // 启动自动轮播
    startAutoplay();
  }

  // 更新导航点状态
  function updateDots() {
    carouselDots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentIndex);
    });
  }

  // 切换到指定索引的轮播项
  function goToSlide(index) {
    // 防止快速点击导致的动画冲突
    if (index === currentIndex) return;

    // 隐藏当前轮播项
    carouselSlides[currentIndex].style.opacity = "0";
    carouselSlides[currentIndex].style.pointerEvents = "none";

    // 更新当前索引
    currentIndex = index;

    // 显示目标轮播项（稍微延迟以确保淡出动画开始）
    setTimeout(() => {
      carouselSlides[currentIndex].style.opacity = "1";
      carouselSlides[currentIndex].style.pointerEvents = "auto";
      updateDots();
    }, transitionDuration / 4); // 交叉淡入效果，在淡出1/4时开始淡入
  }

  // 下一个轮播项
  function nextSlide() {
    const nextIndex =
      currentIndex === carouselSlides.length - 1 ? 0 : currentIndex + 1;
    goToSlide(nextIndex);
  }

  // 上一个轮播项
  function prevSlide() {
    const prevIndex =
      currentIndex === 0 ? carouselSlides.length - 1 : currentIndex - 1;
    goToSlide(prevIndex);
  }

  // 启动自动轮播
  function startAutoplay() {
    autoplayInterval = setInterval(
      nextSlide,
      transitionDuration + displayDuration
    );
  }

  // 绑定事件：箭头按钮
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      clearInterval(autoplayInterval);
      nextSlide();
      startAutoplay();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      clearInterval(autoplayInterval);
      prevSlide();
      startAutoplay();
    });
  }

  // 绑定事件：导航点
  carouselDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      clearInterval(autoplayInterval);
      goToSlide(index);
      startAutoplay();
    });
  });

  // 鼠标悬停暂停，离开恢复
  if (carouselContainer) {
    carouselContainer.addEventListener("mouseenter", () => {
      clearInterval(autoplayInterval);
    });

    carouselContainer.addEventListener("mouseleave", () => {
      startAutoplay();
    });
  }

  // 初始化轮播
  initCarousel();

  // =======================================
  // 6. 交互 5: 内容轮播 (猜你喜欢 / MV / 新歌发行)
  // =======================================

  /**
   * 可重用的内容轮播初始化函数
   * @param {string} containerSelector - 轮播图容器的选择器
   */
  function initContentCarousel(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const track = container.querySelector(".content-track");
    const cards = container.querySelectorAll(".content-card");
    const prevBtn = container.querySelector(".carousel-btn.prev");
    const nextBtn = container.querySelector(".carousel-btn.next");

    if (!track || cards.length === 0 || !prevBtn || !nextBtn) return;

    let cardWidth = cards[0].offsetWidth;
    let gap = parseInt(window.getComputedStyle(track).gap) || 20;
    let moveDistance = cardWidth + gap;
    let currentPosition = 0;
    let maxPosition = -(
      track.scrollWidth -
      container.querySelector(".content-carousel").offsetWidth
    );

    function updateButtonState() {
      prevBtn.disabled = currentPosition >= 0;
      nextBtn.disabled = currentPosition <= maxPosition + 5;
    }

    function moveTrack(distance) {
      currentPosition += distance;
      if (currentPosition > 0) currentPosition = 0;
      if (currentPosition < maxPosition) currentPosition = maxPosition;
      track.style.transform = `translateX(${currentPosition}px)`;
      updateButtonState();
    }

    prevBtn.addEventListener("click", () => moveTrack(moveDistance));
    nextBtn.addEventListener("click", () => moveTrack(-moveDistance));

    window.addEventListener("resize", () => {
      cardWidth = cards[0].offsetWidth;
      gap = parseInt(window.getComputedStyle(track).gap) || 20;
      moveDistance = cardWidth + gap;
      maxPosition = -(
        track.scrollWidth -
        container.querySelector(".content-carousel").offsetWidth
      );
      currentPosition = 0;
      track.style.transform = `translateX(0px)`;
      updateButtonState();
    });

    updateButtonState();
  }

  // 初始化所有内容轮播
  initContentCarousel("#discover .content-carousel-container");
  initContentCarousel("#mv .content-carousel-container");
  initContentCarousel("#new-releases .content-carousel-container");

  // =======================================
  // 7. 交互 6: 侧边栏滚动监听
  // =======================================
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  const navLinks = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll("section[id], footer[id]");

  if (sidebarLinks.length > 0 && sections.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const targetId = entry.target.id;

            // 更新侧边栏
            sidebarLinks.forEach((link) => {
              link.classList.toggle("active", link.dataset.target === targetId);
            });

            // 更新顶部导航栏
            navLinks.forEach((link) => {
              if (
                link.getAttribute("href") &&
                link.getAttribute("href").startsWith("#")
              ) {
                link.classList.toggle(
                  "active",
                  link.getAttribute("href") === `#${targetId}`
                );
              }
            });
          }
        });
      },
      {
        root: null,
        threshold: 0.5,
      }
    );

    sections.forEach((section) => {
      observer.observe(section);
    });
  }

  // =======================================
  // 8. 【V2 新增】: 交互 7: 可拖动侧边栏
  // =======================================
  const sidebar = document.getElementById("sidebarNav");
  if (sidebar) {
    let isDragging = false;
    let offsetY = 0;

    sidebar.addEventListener("mousedown", (e) => {
      if (
        e.target.classList.contains("sidebar-link") ||
        e.target.closest(".sidebar-link")
      ) {
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

      if (newTop < headerHeight) {
        newTop = headerHeight;
      }

      if (newTop > windowHeight - sidebarHeight) {
        newTop = windowHeight - sidebarHeight;
      }

      sidebar.style.top = `${newTop}px`;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
      sidebar.classList.remove("dragging");
    });
  }
}); // DOMContentLoaded 结束
