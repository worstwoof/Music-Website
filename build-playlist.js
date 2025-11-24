const fs = require('fs');
const path = require('path');

// 您的歌曲文件夹路径
const songsDirectory = path.join(__dirname, 'songs');
// 扫描`songs`目录
try {
    const allEntries = fs.readdirSync(songsDirectory, { withFileTypes: true });

    // 1. 筛选出所有子文件夹
    const songFolders = allEntries
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    // 2. 将文件夹名数组写入 `playlist.json`
    // (您的 script.js 将会读取这个文件)
    fs.writeFileSync(
        path.join(__dirname, 'playlist.json'),
        JSON.stringify(songFolders, null, 2),
        'utf8'
    );

    console.log(`✅ 成功扫描到 ${songFolders.length} 个歌曲文件夹。`);
    console.log('playlist.json 已成功生成！');

} catch (error) {
    console.error('❌ 扫描歌曲文件夹时出错:');
    console.error('请确保 `songs` 文件夹存在于项目根目录。');
    console.error(error);
}