const fs = require('fs');
const path = require('path');

const songsDirectory = path.join(__dirname, 'songs');
const outputFile = path.join(__dirname, 'playlist.json');

function readInfo(folder) {
    try {
        const file = path.join(songsDirectory, folder, 'info.json');
        const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`${folder}/info.json：${error.message}`);
    }
}

function mediaPath(folder, filename, field) {
    if (typeof filename !== 'string' || !filename.trim() || filename === '.' || filename === '..'
        || /[/\\:\0]/.test(filename)) {
        throw new Error(`${folder}/info.json 的 ${field} 要填写歌曲目录内的文件名`);
    }
    const file = path.join(songsDirectory, folder, filename);
    if (!fs.lstatSync(file, { throwIfNoEntry: false })?.isFile()) {
        throw new Error(`找不到资源 ${folder}/${filename}`);
    }
    return `songs/${folder}/${filename}`;
}

function readSongs() {
    const folders = fs.readdirSync(songsDirectory, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
    const ids = new Map();
    const songs = [];

    for (const folder of folders) {
        const info = readInfo(folder);
        if (!Number.isSafeInteger(info?.id) || info.id < 0) {
            throw new Error(`${folder}/info.json 的 id 要填写非负整数`);
        }
        if (ids.has(info.id)) {
            throw new Error(`编号 ${info.id} 重复：${ids.get(info.id)} 和 ${folder}`);
        }
        ids.set(info.id, folder);

        for (const field of ['title', 'artist', 'album']) {
            if (info[field] !== undefined && typeof info[field] !== 'string') {
                throw new Error(`${folder}/info.json 的 ${field} 要填写文字`);
            }
        }
        const uploadTime = info.uploadTime ?? 0;
        if (!Number.isFinite(uploadTime) || uploadTime < 0) {
            throw new Error(`${folder}/info.json 的 uploadTime 要填写非负数`);
        }

        songs.push({
            id: info.id,
            folder,
            title: info.title || folder,
            artist: info.artist || '未知歌手',
            album: info.album || '',
            cover: mediaPath(folder, info.cover ?? 'cover.jpg', 'cover'),
            src: mediaPath(folder, info.audio, 'audio'),
            mv: info.mv == null ? null : mediaPath(folder, info.mv, 'mv'),
            uploadTime,
        });
    }

    return songs.sort((a, b) => a.id - b.id);
}

function writePlaylist(songs) {
    const temporaryDirectory = fs.mkdtempSync(path.join(__dirname, '.playlist-'));
    const temporaryFile = path.join(temporaryDirectory, 'playlist.json');
    try {
        fs.writeFileSync(temporaryFile, JSON.stringify(songs, null, 2), 'utf8');
        fs.renameSync(temporaryFile, outputFile);
    } finally {
        fs.rmSync(temporaryFile, { force: true });
        fs.rmdirSync(temporaryDirectory);
    }
}

try {
    const songs = readSongs();
    writePlaylist(songs);
    console.log(`已生成 playlist.json，共 ${songs.length} 首歌。`);
} catch (error) {
    console.error(`生成清单失败：${error.message}`);
    process.exitCode = 1;
}
