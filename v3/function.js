let currentPage = 1;
const totalPages = 4;
let isScrolling = false;


// 飘落的星星(第二页)
function createStar() 
{
    const star = document.createElement('div');
    star.setAttribute('class', 'star');
    
    const starTypes = ['star1', 'star2'];
    const randomType = starTypes[Math.floor(Math.random() * starTypes.length)];
    star.classList.add(randomType);
    
    star.style.left = Math.random() * window.innerWidth + 'px';
    const size = Math.random() * 15;
    star.style.fontSize = 12 + size + 'px';
    const duration = Math.random() * 4;
    star.style.animationDuration = 3 + duration + 's';

    document.getElementById('page2').appendChild(star);

    setTimeout(() => {
        if (document.getElementById('page2').contains(star)) {
            document.getElementById('page2').removeChild(star);
        }
    }, 7000);
}

setInterval(() => { if (currentPage === 2)createStar();}, 150);

// 触发四朵花动画(第四页)
function triggerFlowerAnimation() {
    const flowers = [
        document.getElementById('flowerTopLeft'),
        document.getElementById('flowerTopRight'),
        document.getElementById('flowerBottomLeft'),
        document.getElementById('flowerBottomRight')
    ];
    flowers.forEach(flower => {
        flower.classList.remove('active');
        flower.style.backgroundPosition = '0px 0px';
    });
    void flowers[0].offsetWidth;
    
    setTimeout(() => {flowers.forEach(flower => {flower.classList.add('active');});}, 50);
}

// 滚动到指定页面
function scrollToPage(pageNum) {
    if (isScrolling) return;
    
    isScrolling = true;
    currentPage = pageNum;
    
    const container = document.getElementById('pageContainer');
    const offset = -(pageNum - 1) * 100;
    container.style.transform = `translateY(${offset}vh)`;
    
    document.querySelectorAll('.page-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index + 1 === pageNum);
    });
    
    if (pageNum === 4) {
        setTimeout(() => {triggerFlowerAnimation();}, 1000);
    }
    
    setTimeout(() => {isScrolling = false;}, 800);
}

// 鼠标滚轮事件
let lastScrollTime = 0;
window.addEventListener('wheel', (e) => {
    const now = Date.now();
    if (now - lastScrollTime < 1000) return;
    
    if (e.deltaY > 0 && currentPage < totalPages) {
        lastScrollTime = now;
        scrollToPage(currentPage + 1);
    } else if (e.deltaY < 0 && currentPage > 1) {
        lastScrollTime = now;
        scrollToPage(currentPage - 1);
    }
});

// 跳转到播放器
function goToPlayer() {
    window.location.href = 'homepage.html';
}
// 光标跟随流光按钮效果
let ctaBtn = document.querySelector('.cta-button');
if (ctaBtn) {
    ctaBtn.onmousemove = (e) => {
        let rect = ctaBtn.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        ctaBtn.style.setProperty('--x', `${x}px`);
        ctaBtn.style.setProperty('--y', `${y}px`);
    }
}