const fs = require('fs');
const path = require('path');

// 歌曲文件夹路径
const songsDirectory = path.join(__dirname, 'songs');
// 输出文件路径
const outputFile = path.join(__dirname, 'playlist.json');

console.log('正在扫描歌曲目录...');

try {
    // 1. 获取所有子文件夹
    const allEntries = fs.readdirSync(songsDirectory, { withFileTypes: true });
    const songFolders = allEntries
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const fullPlaylistData = [];

    // 2. 遍历每个文件夹，读取 info.json
    songFolders.forEach((folder, index) => {
        const infoPath = path.join(songsDirectory, folder, 'info.json');
        
        // 检查 info.json 是否存在
        if (fs.existsSync(infoPath)) {
            try {
                // 读取并解析 JSON
                const rawData = fs.readFileSync(infoPath, 'utf8');
                const info = JSON.parse(rawData);

                // 构建完整的歌曲对象
                // 关键：在这里把 mv 字段读取出来
                const songData = {
                    id: index, // 生成一个数字 ID
                    folder: folder, // 记录文件夹名，方便前端拼接路径
                    title: info.title || folder, // 如果没标题，用文件夹名代替
                    artist: info.artist || '未知歌手',
                    album: info.album || '',
                    // 自动拼接完整路径，方便前端直接使用
                    cover: `songs/${folder}/${info.cover || 'cover.jpg'}`, 
                    src: `songs/${folder}/${info.audio}`,
                    // 如果 info.json 里有 mv 字段，则拼接路径，否则为 null
                    mv: info.mv ? `songs/${folder}/${info.mv}` : null 
                };

                fullPlaylistData.push(songData);
                
            } catch (err) {
                console.error(`⚠️ 警告: 无法解析 ${folder}/info.json, 已跳过。`);
            }
        } else {
            console.warn(`⚠️ 跳过: ${folder} (缺少 info.json)`);
        }
    });

    // 3. 写入 playlist.json
    fs.writeFileSync(
        outputFile,
        JSON.stringify(fullPlaylistData, null, 2),
        'utf8'
    );

    console.log(`✅ 成功生成 playlist.json！共包含 ${fullPlaylistData.length} 首歌曲。`);
    console.log(`👉 其中有 ${fullPlaylistData.filter(s => s.mv).length} 首包含 MV。`);

} catch (error) {
    console.error('❌ 严重错误:', error);
}