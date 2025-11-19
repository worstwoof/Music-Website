/**
 * 初始化并启动鼠标拖尾效果。
 * 使用Canvas绘制随鼠标移动而形成的颜色渐变线条。
 */
function initMouseTrail() {
    // 配置参数
    const config = {
        maxTrailLength: 20,  // 轨迹的最大长度（从15增加到25，消失更慢）
        lineWidth: 4,        // 线条的宽度
        startColor: [255, 215, 0],   // 起始颜色（金色）
        endColor: [138, 43, 226],    // 结束颜色（紫色）
        fadeOutSpeed: 1      // 控制轨迹淡出的速度
    };
    
    // 创建 canvas 元素并设置基本样式
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.style.position = 'fixed';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';  // 确保 canvas 不会阻止鼠标事件
    canvas.style.zIndex = '999';  // 设置层级
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 获取 canvas 的 2D 绘图环境
    const ctx = canvas.getContext('2d');
    let trail = [];  // 存储轨迹点
    let lastMousePosition = { x: 0, y: 0 };  // 存储上一次鼠标位置

    /**
     * 线性插值计算函数，用于渐变色计算。
     * @param {Array} a 起始颜色的 RGB 数组
     * @param {Array} b 结束颜色的 RGB 数组
     * @param {number} amount 插值比例
     * @returns {Array} 插值后的颜色 RGB 数组
     */
    function lerpColor(a, b, amount) {
        const [ar, ag, ab] = a;
        const [br, bg, bb] = b;
        return [
            ar + amount * (br - ar),
            ag + amount * (bg - ag),
            ab + amount * (bb - ab)
        ].map(Math.round);
    }

    /**
     * 绘制函数，每帧调用一次以绘制鼠标拖尾。
     */
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);  // 清除画布

        // 遍历轨迹数组绘制线条
        for (let i = 1; i < trail.length; i++) {
            const gradientRatio = i / trail.length;
            const color = lerpColor(config.startColor, config.endColor, gradientRatio);
            
            // 添加透明度渐变
            const alpha = gradientRatio * 0.8;

            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x, trail[i].y);
            ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
            ctx.lineWidth = config.lineWidth;
            ctx.lineCap = 'round';  // 圆滑线条端点
            ctx.stroke();
        }
    }

    /**
     * 更新轨迹数组，添加新的位置点。
     */
    function updateTrail() {
        if (lastMousePosition.x !== 0 && lastMousePosition.y !== 0) {
            trail.push({ ...lastMousePosition });
        }

        // 控制轨迹长度，删除旧数据
        if (trail.length > config.maxTrailLength) {
            trail = trail.slice(config.fadeOutSpeed);
        }
    }

    // 监听鼠标移动事件更新鼠标位置
    window.addEventListener('mousemove', (event) => {
        lastMousePosition.x = event.clientX;
        lastMousePosition.y = event.clientY;
    });

    /**
     * 动画循环，用于不断刷新画布。
     */
    function animate() {
        updateTrail();
        draw();
        requestAnimationFrame(animate);
    }
    animate();

    // 窗口大小改变时重新设置 canvas 尺寸
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

/**
 * 初始化点击爆炸特效
 */
function initClickExplosion() {
    // 创建爆炸特效的 canvas
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.style.position = 'fixed';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    const particles = [];

    // 暗紫色系配色
    const purpleColors = [
    '#E879F9',  // 亮粉紫
    '#D946EF',  // 玫红紫
    '#C026D3',  // 深玫红
    '#A21CAF',  // 紫红
    '#86198F',  // 深紫红
    '#FCA5A5',  // 浅粉
    '#F472B6'   // 粉红
    ];

    // 粒子类
    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 5 + 2;
            this.speedX = (Math.random() - 0.5) * 8;
            this.speedY = (Math.random() - 0.5) * 8;
            // 从暗紫色系中随机选择颜色
            this.color = purpleColors[Math.floor(Math.random() * purpleColors.length)];
            this.life = 100;
            this.decay = Math.random() * 2 + 1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.speedY += 0.2; // 重力效果
            this.life -= this.decay;
            this.size = Math.max(0, this.size - 0.05);
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.life / 100;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 创建爆炸效果
    function createExplosion(x, y) {
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(x, y));
        }
    }

    // 动画循环
    function animateExplosion() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();

            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }

        requestAnimationFrame(animateExplosion);
    }

    // 监听点击事件
    document.addEventListener('click', (e) => {
        createExplosion(e.clientX, e.clientY);
    });

    // 窗口大小改变时重新设置 canvas 尺寸
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    animateExplosion();
}

// 检测文档加载状态，适时启动特效
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initMouseTrail();
        initClickExplosion();
    });
} else {
    initMouseTrail();
    initClickExplosion();
}