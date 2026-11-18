function initLocalProfile(showToast) {
  const key = 'music-local-profile';
  const defaultProfile = {
    name: '访客',
    bio: '音乐爱好者',
    avatar: 'icon/24gl-musicAlbum.png'
  };
  const nameInput = document.getElementById('editUsername');
  const bioInput = document.getElementById('editBio');
  const preview = document.querySelector('.preview-avatar');
  const avatarInput = document.getElementById('localAvatarInput');

  function showProfile(saved) {
    const profile = { ...defaultProfile, ...saved };
    document.querySelector('.music-sidebar .profile h2').textContent = profile.name;
    document.querySelector('.music-sidebar .profile p').textContent = profile.bio;
    document.querySelector('.music-sidebar .profile-img').src = profile.avatar;
    document.getElementById('previewNameDisplay').textContent = profile.name;
    nameInput.value = profile.name;
    bioInput.value = profile.bio;
    preview.src = profile.avatar;
  }

  const saved = readSetting(key, null);
  const previous = readSetting('music_current_session', null);
  if (saved && typeof saved.name === 'string' && typeof saved.avatar === 'string') {
    showProfile(saved);
  } else if (previous?.isLoggedIn && typeof previous.username === 'string') {
    showProfile({ name: previous.username, bio: previous.bio || '', avatar: previous.avatar || defaultProfile.avatar });
  } else {
    showProfile(defaultProfile);
  }

  document.querySelectorAll('.avatar-option-edit').forEach(img => {
    img.addEventListener('click', () => {
      document.querySelector('.avatar-option-edit.selected')?.classList.remove('selected');
      img.classList.add('selected');
      preview.src = img.getAttribute('src');
    });
  });

  document.getElementById('triggerUploadBtn').addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      avatarInput.value = '';
      showToast('请选择不超过 1 MB 的 PNG、JPG 或 WebP 图片');
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      preview.src = reader.result;
      document.querySelector('.avatar-option-edit.selected')?.classList.remove('selected');
    });
    reader.addEventListener('error', () => showToast('图片读取失败，请重新选择'));
    reader.readAsDataURL(file);
  });

  document.getElementById('saveProfileInPage').addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      showToast('请填写显示名称');
      nameInput.focus();
      return;
    }
    const profile = { name, bio: bioInput.value.trim(), avatar: preview.getAttribute('src') };
    if (saveSetting(key, profile)) {
      showProfile(profile);
      showToast('资料已保存在当前浏览器');
    } else {
      showToast('资料保存失败，请检查浏览器存储空间');
    }
  });
}
