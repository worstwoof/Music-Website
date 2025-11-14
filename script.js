// 导航栏滚动效果
window.addEventListener("scroll", function () {
  const header = document.getElementById("header");
  if (window.scrollY > 50) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

// 主题切换功能
const themeToggle = document.getElementById("theme-toggle-btn");
themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");
});

// 全屏轮播功能
let currentSlide = 0;
const slides = document.querySelectorAll(".carousel-slide");
const dots = document.querySelectorAll(".carousel-dot");
const totalSlides = slides.length;

function showSlide(index) {
  // 隐藏所有幻灯片
  slides.forEach((slide) => {
    slide.classList.remove("active");
  });

  // 移除所有导航点的激活状态
  dots.forEach((dot) => {
    dot.classList.remove("active");
  });

  // 显示当前幻灯片和激活当前导航点
  slides[index].classList.add("active");
  dots[index].classList.add("active");
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % totalSlides;
  showSlide(currentSlide);
}

function prevSlide() {
  currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
  showSlide(currentSlide);
}

// 自动轮播
let slideInterval = setInterval(nextSlide, 5000);

// 轮播控制
document.getElementById("hero-next").addEventListener("click", function () {
  clearInterval(slideInterval);
  nextSlide();
  slideInterval = setInterval(nextSlide, 5000);
});

document.getElementById("hero-prev").addEventListener("click", function () {
  clearInterval(slideInterval);
  prevSlide();
  slideInterval = setInterval(nextSlide, 5000);
});

// 导航点点击事件
dots.forEach((dot, index) => {
  dot.addEventListener("click", function () {
    clearInterval(slideInterval);
    currentSlide = index;
    showSlide(currentSlide);
    slideInterval = setInterval(nextSlide, 5000);
  });
});

// 初始化"猜你喜欢"轮播 - 三列循环滚动版本
document.addEventListener("DOMContentLoaded", function () {
  const discoverCarousel = document.querySelector(".discover-carousel");
  const discoverTrack = document.querySelector(".discover-track");
  const discoverCards = document.querySelectorAll(".discover-card");
  const prevBtn = document.querySelector(".discover-carousel-btn.prev");
  const nextBtn = document.querySelector(".discover-carousel-btn.next");

  // 确保卡片数量是3的倍数，不足则复制补充（保证循环效果）
  const cardCount = discoverCards.length;
  const remainder = cardCount % 3;
  if (remainder !== 0) {
    for (let i = 0; i < 3 - remainder; i++) {
      const clone = discoverCards[i].cloneNode(true);
      discoverTrack.appendChild(clone);
    }
  }

  // 更新卡片列表（包含补充的克隆卡片）
  const allCards = document.querySelectorAll(".discover-card");
  const totalCards = allCards.length;
  const visibleCards = 3; // 一次显示3张
  let currentIndex = 0;

  // 计算卡片宽度（包含间距）
  function getCardWidth() {
    return allCards[0].offsetWidth + 30; // 卡片宽度 + 间距
  }

  // 克隆开头和结尾的卡片用于无缝循环
  function setupCloneCards() {
    // 克隆最后一组卡片放在开头
    for (let i = totalCards - visibleCards; i < totalCards; i++) {
      const clone = allCards[i].cloneNode(true);
      clone.classList.add("clone");
      discoverTrack.insertBefore(clone, discoverTrack.firstChild);
    }

    // 克隆最前一组卡片放在结尾
    for (let i = 0; i < visibleCards; i++) {
      const clone = allCards[i].cloneNode(true);
      clone.classList.add("clone");
      discoverTrack.appendChild(clone);
    }

    // 初始定位到真实卡片位置
    updatePosition(true);
  }

  // 更新轮播位置
  function updatePosition(withoutTransition = false) {
    if (withoutTransition) {
      discoverTrack.style.transition = "none";
    } else {
      discoverTrack.style.transition = "transform 0.5s ease-in-out";
    }

    const offset = -currentIndex * getCardWidth();
    discoverTrack.style.transform = `translateX(${offset}px)`;

    // 重置过渡效果
    if (withoutTransition) {
      setTimeout(() => {
        discoverTrack.style.transition = "transform 0.5s ease-in-out";
      }, 50);
    }
  }

  // 下一组（3张）
  function nextGroup() {
    currentIndex += visibleCards;
    updatePosition();

    // 滚动完成后检查是否需要重置位置（实现循环）
    setTimeout(() => {
      if (currentIndex >= totalCards) {
        currentIndex = 0;
        updatePosition(true);
      }
    }, 500);
  }

  // 上一组（3张）
  function prevGroup() {
    currentIndex -= visibleCards;
    updatePosition();

    // 滚动完成后检查是否需要重置位置（实现循环）
    setTimeout(() => {
      if (currentIndex < 0) {
        currentIndex = totalCards - visibleCards;
        updatePosition(true);
      }
    }, 500);
  }

  // 事件监听
  prevBtn.addEventListener("click", prevGroup);
  nextBtn.addEventListener("click", nextGroup);

  // 窗口大小改变时重新计算位置
  window.addEventListener("resize", () => {
    updatePosition(true);
  });

  // 初始化克隆卡片
  setupCloneCards();

  // 自动轮播
  let autoPlayInterval = setInterval(nextGroup, 5000);

  // 鼠标悬停时暂停自动轮播
  discoverCarousel.addEventListener("mouseenter", () => {
    clearInterval(autoPlayInterval);
  });

  // 鼠标离开时恢复自动轮播
  discoverCarousel.addEventListener("mouseleave", () => {
    autoPlayInterval = setInterval(nextGroup, 5000);
  });
});

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

// 登录弹窗
const loginModal = document.getElementById("loginModal");
const showLoginBtn = document.getElementById("showLoginBtn");
const closeLoginBtn = document.getElementById("closeLoginBtn");

showLoginBtn.addEventListener("click", () => {
  loginModal.classList.add("show");
  document.body.style.overflow = "hidden";
});

closeLoginBtn.addEventListener("click", () => {
  loginModal.classList.remove("show");
  document.body.style.overflow = "";
});

window.addEventListener("click", (e) => {
  if (e.target === loginModal) {
    loginModal.classList.remove("show");
    document.body.style.overflow = "";
  }
});

// 阻止表单默认提交
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("登录功能待实现");
  loginModal.classList.remove("show");
  document.body.style.overflow = "";
});
