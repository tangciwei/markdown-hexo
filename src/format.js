let fs = require('fs');
let util = require('util');
// var S = require('string');

let promisify = util.promisify;
// promisify包装
let readFile = promisify(fs.readFile);
let writeFile = promisify(fs.writeFile);

/**
 * 内容处理
 */
function contentFormat(List) {
    List = List.map((item, line) => {
        // #号处理
        if (item[0] === '#') {
            item = item.replace(/\#+/, $0 => $0 + ' ');
        }

        // **处理
        item = item.replace(/\*\*([^\*]+)\*\*/g, ($0, $1) => {
            return `**${$1.trim()}**`;
        });
        // 图片处理
        item = item.replace(/\!\[[^\]]*\]\(([^\)]+)\)/g, ($0, $1) => {

            if ($1.slice(0, 4) !== 'http') {
                // 去掉./
                let arr = $1.split('/');
                $1 = arr[arr.length - 1];
                $1 = decodeURIComponent($1);
                // 打印行号
                console.log(`第${line}行图片名称：`, $1);
                return `{% asset_img ${$1} img %}`;
            }

            return $0;
        });

        return item;
    });

    let len = List.length;
    // 表格处理
    for (let i = 0; i < len; i++) {
        let str = List[i];
        if (str.slice(0, 3) === '|--') {
            List[i - 2] += '\n';
        }

    }
    //  加入阅读更多；
    if (len > 10) {
        let more = '\n<!--more-->\n\n';
        List.splice(7, 1, more);
    }

    return List;
}

async function format(name, change = false) {
    if (!name) {
        console.log('请输入名称');
        return;
    }

    // let prename = './markdown/';
    // name = prename + name;
    let fileContent = await readFile(`${name}`, 'utf8');

    let outContent = contentFormat(fileContent.split('\n')).join('\n');
    if (change) {
        await writeFile(`${name}`, outContent);
    }

    return outContent;
}

module.exports = format;
