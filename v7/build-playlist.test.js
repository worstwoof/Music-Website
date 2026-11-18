const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

function createCatalog(t) {
    const folder = fs.mkdtempSync(path.join(__dirname, '.catalog-test-'));
    t.after(() => {
        const resolved = fs.realpathSync(folder);
        assert.equal(path.dirname(resolved), fs.realpathSync(__dirname));
        assert.ok(path.basename(resolved).startsWith('.catalog-test-'));
        fs.rmSync(resolved, { recursive: true, force: true });
    });
    fs.mkdirSync(path.join(folder, 'songs'));
    fs.copyFileSync(path.join(__dirname, 'build-playlist.js'), path.join(folder, 'build-playlist.js'));
    return folder;
}

function addSong(catalog, folder, id) {
    const songDir = path.join(catalog, 'songs', folder);
    fs.mkdirSync(songDir);
    const info = { id, title: folder, audio: 'audio.mp3', uploadTime: 1000 + id };
    fs.writeFileSync(path.join(songDir, 'info.json'), JSON.stringify(info), 'utf8');
    fs.writeFileSync(path.join(songDir, 'audio.mp3'), 'test audio');
    fs.writeFileSync(path.join(songDir, 'cover.jpg'), 'test cover');
}

function build(catalog) {
    const result = spawnSync(process.execPath, ['build-playlist.js'], {
        cwd: catalog,
        encoding: 'utf8',
    });
    assert.ifError(result.error);
    return result;
}

test('反复构建一致，移除一首歌不改变另一首歌的编号', (t) => {
    const catalog = createCatalog(t);
    addSong(catalog, '保留的歌', 17);
    addSong(catalog, '删除的歌', 0);
    const output = path.join(catalog, 'playlist.json');

    assert.equal(build(catalog).status, 0);
    const original = fs.readFileSync(output, 'utf8');
    assert.equal(build(catalog).status, 0);
    assert.equal(fs.readFileSync(output, 'utf8'), original);
    assert.deepEqual(JSON.parse(original).map((song) => song.id), [0, 17]);

    fs.renameSync(path.join(catalog, 'songs', '删除的歌'), path.join(catalog, '已移除'));
    assert.equal(build(catalog).status, 0);
    const songs = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.deepEqual(songs.map((song) => song.id), [17]);
    assert.equal(songs[0].uploadTime, 1017);
    assert.equal(songs[0].mv, null);
});

test('重复编号会使构建失败，保留上一次的清单', (t) => {
    const catalog = createCatalog(t);
    addSong(catalog, '原有歌曲', 8);
    const output = path.join(catalog, 'playlist.json');
    assert.equal(build(catalog).status, 0);
    const original = fs.readFileSync(output, 'utf8');

    addSong(catalog, '新增歌曲', 8);
    const result = build(catalog);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /编号 8 重复/);
    assert.equal(fs.readFileSync(output, 'utf8'), original);
});

test('音频缺失时提示对应目录，保留上一次的清单', (t) => {
    const catalog = createCatalog(t);
    addSong(catalog, '缺少音频的歌曲', 0);
    const output = path.join(catalog, 'playlist.json');
    assert.equal(build(catalog).status, 0);
    const original = fs.readFileSync(output, 'utf8');

    fs.unlinkSync(path.join(catalog, 'songs', '缺少音频的歌曲', 'audio.mp3'));
    const result = build(catalog);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /缺少音频的歌曲\/audio\.mp3/);
    assert.equal(fs.readFileSync(output, 'utf8'), original);
});
