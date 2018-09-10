let fs = require('fs');
let path = require('path');
let spawn = require('child_process').spawn;
let moment = require('moment');

let format = require('./format');
let readFile = require('util').promisify(fs.readFile);
let writeFile = require('util').promisify(fs.writeFile);
let mkdir = require('util').promisify(fs.mkdir);
let rename = require('util').promisify(fs.rename);
// 删除
let unlink = require('util').promisify(fs.unlink);
let rmdir = require('util').promisify(fs.rmdir);
let basePath = process.cwd();

// 获取目录下所有文件
function getAllFiles(root) {
    var res = [];
    var files = fs.readdirSync(root);

    files.forEach(function (file) {
        var pathname = root + '/' + file;

        var stat = fs.lstatSync(pathname);

        if (!stat.isDirectory()) {

            res.push(pathname);
        }
        else {
            res = res.concat(getAllFiles(pathname));
        }
    });
    return res;
}
// 增加标准markdown文件
async function addMdFile(path, title = '', content, tags = '') {
    let now = moment().format('YYYY-MM-DD HH:MM:SS'); //
    let head = `---
title: ${title}
date: ${now}
tags: ${tags}
---`;
    content = head + '\n\n' + content;
    await writeFile(path, content);
}
// 创建目录
async function addDir(path) {
    if (fs.existsSync(path)) {
        console.log('目录已存在：', path);
    }
    else {
        await mkdir(path);
    }
}

// 移动文件
async function mvFiles(sourceFile, destPath) {
    await rename(sourceFile, destPath);
}

// 删除目录下所有文件
async function delFile(root) {
    let files = fs.readdirSync(root);
    for(let file of files){
        file = root + '/' + file;
        let stat = fs.lstatSync(file);

        if (stat.isDirectory()) {
            await delFile(file);
            await rmdir(file);
            console.log('删除目录-', file, '-成功！');
        }
        else {
            await unlink(file);
            console.log('删除文件-', file, '-成功！');
        }
    }
}

function spawnOne(arg, callback) {
    const processSon = spawn(...arg);
    processSon.stdout.on('data', (data) => {
        callback(null, data);
    });
    processSon.stderr.on('data', (data) => {
        console.log('spawn错误', data);
        callback(data);
    });
    processSon.on('close', (code) => {
        console.log(`子进程退出码：${code}`);
    });
}

async function hexoStart() {

    // 回调地狱~
    spawnOne(['hexo', ['generate']], (err, data) => {
        if (!err) {
            console.log(`生成文章成功`);
        }

    });
    spawnOne(['hexo', ['s']], (err, data) => {
        if (!err) {
            console.log(`开启服务成功`);
        }

    });
    setTimeout(() => {
        spawnOne(['open', ['http://localhost:4000/']], (err, data) => {
            if (!err) {
                console.log(`打开浏览器成功`);
            }

        });
    }, 3000);
}

async function mwebHexo() {
    let markdownDir = basePath + '/' + 'markdown';
    // 判断当前目录下是否有markdown文件夹
    if (!fs.existsSync(markdownDir)) {
        console.log('请进入博客根目录，并创建markdown文件夹');
        return;
    }

    function getParam() {
        let tag = '';
        let end = false;
        let arr = process.argv.slice(2);
        if (arr[0] === 't' || arr[0] === 'tag') {
            if (arr[1]) {
                tag = arr[1].trim();
            }
        }
        else if (arr[0] === 'd' || arr[0] === 'deploy') {
            end = true;
            spawnOne(['hexo', ['d']], (err, data) => {
                if (!err) {
                    console.log(`文章上传成功`);
                }

            });
        }

        return {
            tag,
            end
        };
    }
    let {tag = '', end} = getParam();
    if (end) {
        return;
    }

    let sourceFiles = getAllFiles(markdownDir);
    let data = {
        mdName: '',
        mdFile: '',
        imgList: []
    };
    // 区分md文件和图片文件
    sourceFiles.forEach(file => {
        if (file.indexOf('DS_Store') === -1) {
            if (/(.*)\.md$/.test(file)) {
                file.replace(/(.*)\.md$/g, ($0, $1) => {
                    data.mdName = $1.split('/').pop();
                    data.mdFile = file;
                });
            }
            else {
                let name = file.split('/').pop();
                data.imgList.push({
                    file,
                    name
                });
            }
        }

    });
    if (!data.mdFile) {
        console.log('不存在md文件');
        return;
    }

    let date = moment().format('YYYY-MM-DD');
    let target = {
        mdFile: `${basePath}/source/_posts/${date}-${data.mdName}.md`,
        mdDir: `${basePath}/source/_posts/${date}-${data.mdName}`
    };
    // 格式化文件
    let formatContent = await format(data.mdFile);
    // todo: 标签+优化

    await addMdFile(target.mdFile, data.mdName, formatContent, tag);
    await addDir(target.mdDir);
    // 移动图片
    for(let img of data.imgList){
        await mvFiles(img.file,target.mdDir+'/'+img.name);
    }
    // 启动hexo
    hexoStart();
    // 删除源文件
    await delFile(markdownDir);
}

// mwebHexo();
module.exports = mwebHexo;
