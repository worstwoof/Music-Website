/*
 * script.js
 * 音乐播放器首页交互脚本
 */

// 确保 DOM 加载完毕后执行
document.addEventListener('DOMContentLoaded', () => {

  /**
   * 1. 交互：搜索框焦点
   * 描述：当 input 获得/失去焦点时，为其父元素 .search-bar 添加/移除 'focused' 类
   * (CSS 中已定义 .search-bar.focused input 的样式)
   */
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    const searchBar = searchInput.parentElement;

    searchInput.addEventListener('focus', () => {
      searchBar.classList.add('focused');
    });

    searchInput.addEventListener('blur', () => {
      searchBar.classList.remove('focused');
    });
  }

  /**
   * 2. 交互：主题切换 (暗色/浅色)
   * 描述：点击 #theme-toggle 按钮，切换 <body> 上的 'light-mode' 类。
   * 同时将偏好设置存入 localStorage。
   */
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    // 检查本地存储中是否已有偏好设置
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
      document.body.classList.add('light-mode');
    }

    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');

      // 将选择存入 localStorage
      let theme = 'dark';
      if (document.body.classList.contains('light-mode')) {
        theme = 'light';
      }
      localStorage.setItem('theme', theme);
    });
  }

  /**
   * 3. 交互：顶部轮播图 (Banner Carousel)
   * 描述：实现自动播放、左右切换按钮、底部指示器。
   */
  const carousel = document.querySelector('.banner-carousel');
  if (carousel) {
    const container = carousel.querySelector('.carousel-container');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.carousel-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-btn.next');
    const dotsContainer = carousel.querySelector('.carousel-dots');

    if (slides.length > 0) {
      let currentIndex = 0;
      let slideInterval;
      const slideCount = slides.length;

      // --- A. 创建指示器 (Dots) ---
      for (let i = 0; i < slideCount; i++) {
        const dot = document.createElement('button');
        dot.classList.add('dot');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => {
          goToSlide(i);
          resetInterval(); // 用户点击后重置自动播放计时器
        });
        dotsContainer.appendChild(dot);
      }
      const dots = dotsContainer.querySelectorAll('.dot');

      // --- B. 核心函数：跳转到指定幻灯片 ---
      function goToSlide(index) {
        // 边界处理 (无限循环)
        if (index < 0) {
          index = slideCount - 1;
        } else if (index >= slideCount) {
          index = 0;
        }

        // 移动容器
        container.style.transform = `translateX(-${index * 100}%)`;

        // 更新当前索引
        currentIndex = index;

        // 更新指示器状态
        updateDots();
      }

      // --- C. 更新指示器状态 ---
      function updateDots() {
        dots.forEach((dot, index) => {
          if (index === currentIndex) {
            dot.classList.add('active');
          } else {
            dot.classList.remove('active');
          }
        });
      }

      // --- D. 按钮事件 ---
      prevBtn.addEventListener('click', () => {
        goToSlide(currentIndex - 1);
        resetInterval();
      });

      nextBtn.addEventListener('click', () => {
        goToSlide(currentIndex + 1);
        resetInterval();
      });

      // --- E. 自动播放 ---
      function startInterval() {
        slideInterval = setInterval(() => {
          goToSlide(currentIndex + 1);
        }, 3000); // 每 3 秒切换一次
      }

      function resetInterval() {
        clearInterval(slideInterval);
        startInterval();
      }

      // 鼠标悬停时停止自动播放
      carousel.addEventListener('mouseenter', () => clearInterval(slideInterval));
      carousel.addEventListener('mouseleave', startInterval);

      // --- F. 初始化 ---
      goToSlide(0); // 初始化到第一张
      startInterval(); // 开始自动播放
    }
  }

  /**
   * 4. 交互：移动端汉堡菜单 (Hamburger Menu)
   * 描述：点击 .mobile-nav-toggle 按钮，切换 .main-nav 的显示/隐藏。
   */
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const mainNav = document.querySelector('.main-nav');

  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', () => {
      // 为 .main-nav 添加 'mobile-active' 类使其变为移动端布局
      mainNav.classList.add('mobile-active');

      // 切换 'open' 类来控制显示/隐藏动画
      mainNav.classList.toggle('open');

      // 切换 body 的 'nav-open' 类来禁止滚动
      document.body.classList.toggle('nav-open');

      // (可选) 切换汉堡按钮的图标 (e.g., hamburger to X)
      // ...
    });
  }

});