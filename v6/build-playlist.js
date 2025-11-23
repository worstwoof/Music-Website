/* --- build-playlist.js --- */

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
    
    // 【修改点 1】获取文件夹并带上时间信息
    let songFolders = allEntries
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
            const folderPath = path.join(songsDirectory, dirent.name);
            const stats = fs.statSync(folderPath);
            return {
                name: dirent.name,
                // 使用 mtimeMs (修改时间) 或 birthtimeMs (创建时间)
                // 这里建议用 birthtimeMs (创建/上传时间)，如果系统不支持则回退到 mtimeMs
                time: stats.birthtimeMs || stats.mtimeMs 
            };
        });

    // 【修改点 2】按照时间进行排序 (从旧到新)
    // 为什么要从旧到新？因为我们生成的 ID 一般是 0, 1, 2...
    // 这样 ID 越大代表歌越新，符合通常的逻辑。前端展示时只要反转数组即可。
    songFolders.sort((a, b) => a.time - b.time);

    const fullPlaylistData = [];

    // 2. 遍历排序后的文件夹
    songFolders.forEach((folderObj, index) => {
        const folder = folderObj.name; // 获取文件夹名
        const infoPath = path.join(songsDirectory, folder, 'info.json');
        
        // 检查 info.json 是否存在
        if (fs.existsSync(infoPath)) {
            try {
                const rawData = fs.readFileSync(infoPath, 'utf8');
                const info = JSON.parse(rawData);

                const songData = {
                    id: index, // ID 0 是最老的歌，ID 最大的就是最新的歌
                    folder: folder,
                    title: info.title || folder,
                    artist: info.artist || '未知歌手',
                    album: info.album || '',
                    cover: `songs/${folder}/${info.cover || 'cover.jpg'}`, 
                    src: `songs/${folder}/${info.audio}`,
                    mv: info.mv ? `songs/${folder}/${info.mv}` : null,
                    // 可选：把时间也写进去，方便前端调试
                    uploadTime: folderObj.time 
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

    console.log(`✅ 成功生成 playlist.json！按时间排序完成。`);
    console.log(`📊 最新上传: ${fullPlaylistData[fullPlaylistData.length - 1]?.title}`);

} catch (error) {
    console.error('❌ 严重错误:', error);
}
