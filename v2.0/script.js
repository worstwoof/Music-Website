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
    
    // 雪花效果（节流）
    if (!snowflakeThrottleTimer) {
        snowflakeThrottleTimer = setTimeout(() => {
            spawnSnowflake(currentMouseX, currentMouseY);
            snowflakeThrottleTimer = null;
        }, 50);
    }
    
    // 流星拖尾效果（节流）
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

// ==================== 导航栏滚动效果 ====================
const header = document.getElementById("header");

window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});

// ==================== 导航栏滑动指示器 ====================
const navItems = document.querySelectorAll('.nav-item');
const navPill = document.querySelector('.nav-pill');

function updateNavPill() {
    const activeItem = document.querySelector('.nav-item.active');
    if (activeItem && navPill) {
        const rect = activeItem.getBoundingClientRect();
        const parentRect = activeItem.parentElement.getBoundingClientRect();
        navPill.style.width = rect.width + 'px';
        navPill.style.left = (rect.left - parentRect.left) + 'px';
    }
}

navItems.forEach(item => {
    item.addEventListener('click', function() {
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        updateNavPill();
    });
});

// 初始化导航指示器
window.addEventListener('load', updateNavPill);
window.addEventListener('resize', updateNavPill);

// ==================== 页面导航功能 ====================
function navigateTo(page) {
    if (page === 'home') {
        window.location.href = 'index.html';
    } else if (page === 'discover') {
        alert('跳转到发现页面');
    } else if (page === 'mymusic') {
        // 当前页面，不需要跳转
    } else if (page === 'mv') {
        alert('跳转到MV页面');
    }
}

// ==================== 搜索功能 ====================
const searchInput = document.querySelector(".search-input");
const searchIcon = document.querySelector(".search-icon");

function performSearch() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        alert("搜索: " + searchTerm);
    }
}

if (searchInput) {
    searchInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            performSearch();
        }
    });
}

if (searchIcon) {
    searchIcon.addEventListener("click", performSearch);
}

// ==================== 侧边栏导航切换 ====================
const navMenuItems = document.querySelectorAll('.nav-item-music');
const contentSections = document.querySelectorAll('.content-section');

navMenuItems.forEach((item, index) => {
    item.addEventListener('click', function() {
        // 移除所有活动状态
        navMenuItems.forEach(nav => nav.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));
        
        // 添加当前活动状态
        this.classList.add('active');
        if (contentSections[index]) {
            contentSections[index].classList.add('active');
        }
    });
});

// ==================== 播放器功能 ====================
const playPauseBtn = document.querySelector('.play-pause');
if (playPauseBtn) {
    playPauseBtn.addEventListener('click', function() {
        if (this.classList.contains('fa-play-circle')) {
            this.classList.remove('fa-play-circle');
            this.classList.add('fa-pause-circle');
        } else {
            this.classList.remove('fa-pause-circle');
            this.classList.add('fa-play-circle');
        }
    });
}

// 切换收藏状态
const heartIcon = document.querySelector('.fa-heart');
if (heartIcon) {
    heartIcon.addEventListener('click', function() {
        if (this.classList.contains('far')) {
            this.classList.remove('far');
            this.classList.add('fas');
            this.style.color = 'var(--orange)';
        } else {
            this.classList.remove('fas');
            this.classList.add('far');
            this.style.color = '';
        }
    });
}

// 点击音乐卡片时更新播放器
document.querySelectorAll('.music-card, .playlist-item').forEach(item => {
    item.addEventListener('click', function() {
        // 更新播放列表中的活动项
        document.querySelectorAll('.playlist-item').forEach(el => {
            el.classList.remove('active');
        });
        
        if (this.classList.contains('playlist-item')) {
            this.classList.add('active');
        }
        
        // 更新当前播放信息
        const titleElement = this.querySelector('.music-title, .playlist-title div:last-child');
        const artistElement = this.querySelector('.music-artist');
        const coverElement = this.querySelector('img');
        
        if (titleElement && artistElement && coverElement) {
            const title = titleElement.textContent;
            const artist = artistElement.textContent;
            const cover = coverElement.src;
            
            const nowPlayingImg = document.querySelector('.now-playing img');
            const trackTitle = document.querySelector('.track-info h4');
            const trackArtist = document.querySelector('.track-info p');
            
            if (nowPlayingImg && trackTitle && trackArtist) {
                nowPlayingImg.src = cover;
                trackTitle.textContent = title;
                trackArtist.textContent = artist;
            }
            
            // 开始播放
            const playBtn = document.querySelector('.play-pause');
            if (playBtn) {
                playBtn.classList.remove('fa-play-circle');
                playBtn.classList.add('fa-pause-circle');
            }
        }
    });
});

// ==================== 编辑资料功能 ====================
const editProfileBtn = document.querySelector('.edit-profile-btn');
const editProfileModal = document.getElementById('editProfileModal');
const closeEditModal = document.querySelector('#editProfileModal .close-modal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const avatarOptions = document.querySelectorAll('.avatar-option');
const profileImg = document.querySelector('.profile-img');
const profileName = document.querySelector('.profile h2');
const usernameInput = document.getElementById('editUsername');

let selectedAvatar = profileImg.src;

// 打开编辑资料弹窗
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function() {
        editProfileModal.style.display = 'flex';
        usernameInput.value = profileName.textContent;
    });
}

// 关闭编辑资料弹窗
if (closeEditModal) {
    closeEditModal.addEventListener('click', function() {
        editProfileModal.style.display = 'none';
    });
}

// 点击弹窗外部关闭
if (editProfileModal) {
    editProfileModal.addEventListener('click', function(event) {
        if (event.target === editProfileModal) {
            editProfileModal.style.display = 'none';
        }
    });
}

// 选择头像
avatarOptions.forEach(option => {
    option.addEventListener('click', function() {
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedAvatar = this.src;
    });
});

// 保存资料
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', function() {
        const newUsername = usernameInput.value.trim();
        
        if (newUsername) {
            profileName.textContent = newUsername;
            profileImg.src = selectedAvatar;
            editProfileModal.style.display = 'none';
            alert('资料更新成功！');
        } else {
            alert('请输入用户名！');
        }
    });
}

// ==================== 编辑资料页面功能 ====================
const editProfileInPageBtn = document.getElementById('saveProfileInPage');
const avatarOptionsEdit = document.querySelectorAll('.avatar-option-edit');
const previewAvatar = document.querySelector('.preview-avatar');
const previewName = document.querySelector('.profile-preview h3');
const previewBio = document.querySelector('.preview-bio');
const editUsernameInput = document.getElementById('editUsername');
const editBioInput = document.getElementById('editBio');

let selectedAvatarEdit = previewAvatar.src;

// 选择头像（页面内）
avatarOptionsEdit.forEach(option => {
    option.addEventListener('click', function() {
        avatarOptionsEdit.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedAvatarEdit = this.src;
        previewAvatar.src = this.src;
    });
});

// 保存资料（页面内）
if (editProfileInPageBtn) {
    editProfileInPageBtn.addEventListener('click', function() {
        const newUsername = editUsernameInput.value.trim();
        const newBio = editBioInput.value.trim();
        
        if (newUsername) {
            // Update profile preview section
            previewName.textContent = newUsername;
            previewBio.textContent = newBio || '这个人很懒，什么都没有写...';
            previewAvatar.src = selectedAvatarEdit;
            
            // Update the sidebar profile
            if (profileName) {
                profileName.textContent = newUsername;
            }
            if (profileImg) {
                profileImg.src = selectedAvatarEdit;
            }
            // Add bio update for the sidebar
            const profileBio = document.querySelector('.profile p');
            if (profileBio) {
                profileBio.textContent = newBio || '音乐爱好者';
            }
            
            alert('资料更新成功！');
        } else {
            alert('请输入用户名！');
        }
    });
}


// 实时预览用户名和简介
if (editUsernameInput) {
    editUsernameInput.addEventListener('input', function() {
        const value = this.value.trim();
        if (value) {
            previewName.textContent = value;
        }
    });
}

if (editBioInput) {
    editBioInput.addEventListener('input', function() {
        const value = this.value.trim();
        previewBio.textContent = value || '这个人很懒，什么都没有写...';
    });
}

// ==================== 登录弹窗功能 ====================
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

// 点击弹窗外部关闭
if (loginModal) {
    loginModal.addEventListener("click", function(event) {
        if (event.target === loginModal) {
            loginModal.style.display = "none";
        }
    });
}

// 登录表单提交
if (loginForm) {
    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        
        alert(`登录成功！欢迎 ${username}`);
        loginModal.style.display = "none";
    });
}

// ==================== 初始化 ====================
// 默认显示第一个内容区域
if (contentSections.length > 0) {
    contentSections[0].classList.add('active');
}