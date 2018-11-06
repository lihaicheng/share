// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { ipcRenderer } = require('electron');
const helpLink = 'https://github.com/sirzdy/share'
const feedbackLink = 'https://github.com/sirzdy/share/issues'
let container = document.getElementById('container');
let close = document.getElementById('close');
let links = document.getElementById('links');
let open = document.getElementById('open');
let dir = document.getElementById('dir');
let send = document.getElementById('send');
let generate = document.getElementById('generate');
let content = document.getElementById('content');
let qrcontent = document.getElementById('qrcontent');
let loading = document.querySelector(".loading", null);

let ips, downloadPort, uploadPort;
/* 二维码初始化 */
let qrcode = new QRCode(document.getElementById('qrcode'), "");


function hint(msg, type, duration) {
    duration = isNaN(duration) ? 1500 : duration;
    var m = document.createElement('div');
    m.innerHTML = msg;
    var backgroundColor;
    if (type == 'suc') {
        backgroundColor = "#3c763d";
        color = "#ffffff";
    } else if (type == 'fail') {
        backgroundColor = "#8a6d3b";
        color = "#ffffff";
    } else {
        backgroundColor = "#1296db";
        color = "#ffffff";
    }
    m.style.cssText = "width: 60%;min-width: 150px;opacity: 0.9;padding: 10px 0;color: " + color + ";line-height: 30px;text-align: center;border-radius: 5px;position: fixed;top: 60px;left: 50%;transform:translateX(-50%);z-index: 999999;background: " + backgroundColor + ";font-size: 12px;";
    document.body.appendChild(m);
    setTimeout(function () {
        var d = 0.5;
        m.style.webkitTransition = '-webkit-transform ' + d + 's ease-in, opacity ' + d + 's ease-in';
        m.style.opacity = '0';
        setTimeout(function () { document.body.removeChild(m) }, d * 1000);
    }, duration);
}


/* 开启服务器 */
window.onload = () => {
    ipcRenderer.send('start');
}

/* 退出程序 */
close.onclick = () => {
    ipcRenderer.send('quit');
}

/* 快捷键清空发送 */
document.onkeydown = function (event) {
    var e = event || window.event || arguments.callee.caller.arguments[0];
    if (e && e.keyCode == 27) { // 按 Esc 
        if (document.activeElement === content) {
            content.value = "";
        }
        if (document.activeElement === qrcontent) {
            qrcontent.value = "";
        }
    }
    if (e && e.keyCode == 13 && (e.metaKey || e.ctrlKey)) { // enter 键
        if (document.activeElement === content) {
            //要做的事情
            send.click();
        }
        if (document.activeElement === qrcontent) {
            //要做的事情
            generate.click();
        }
    }
};

/* 将文字生成位二维码 */
generate.onclick = () => {
    if (!qrcontent.value) {
        hint('请输入内容！', 'fail');
        return;
    }
    links.childNodes.forEach((link) => {
        link.className = '';
    })
    qrcode.makeCode(qrcontent.value);
}

/* 发送文本 */
send.onclick = () => {
    if (!content.value) {
        hint('请输入内容！', 'fail');
        return;
    }
    ipcRenderer.send('send', content.value);
    content.value = "";
}

/* 打开目录 */
open.onclick = () => {
    ipcRenderer.send('open');
}

/* 链接单击切换二维码 */
links.onclick = function (event) {
    let element = event.target;
    if (element.tagName.toLowerCase() === 'p') {
        links.childNodes.forEach((link) => {
            link.className = '';
        })
        element.className = 'current';
        qrcode.makeCode(element.getAttribute('link'));
    }
}

/* 链接右键在浏览器中打开 */
links.oncontextmenu = function (event) {
    let element = event.target;
    if (element.tagName.toLowerCase() === 'p') {
        ipcRenderer.send('link', element.getAttribute('link'));
    }
}

ipcRenderer.on('start-reply', (event, values) => {
    [{ ips, wirelessIps }, downloadPort, uploadPort, type] = values;
    show(type);
})

ipcRenderer.on('copy-reply', (event, rets) => {
    let sucHint = '【成功】\n';
    let failHint = '【失败】\n';
    let suc = [];
    let fail = [];
    rets.forEach((ret) => {
        if (ret.state) {
            suc.push(ret.file.path);
        } else {
            fail.push(ret.file.path + ': ' + ret.err);
        }
    })
    fail.length ? alert(sucHint + suc.join('\n') + '\n' + failHint + fail.join('\n')) : hint('复制成功!!!');
})
ipcRenderer.on('send-reply', (event, state) => {
    if (state) {
        hint('发送成功!!!');
    } else {
        hint('发送失败!', 'fail');
    }
})
ipcRenderer.on('files-path', (event, filesPath) => {
    dir.innerText = '[' + filesPath + ']';
})

ipcRenderer.on('show-type', (event, type) => {
    // alert(type);
    show(type);
})

container.ondragstart = (event) => {
    event.preventDefault();
}

container.ondragover = () => {
    return false;
}

container.ondragleave = container.ondragend = () => {
    return false;
}

container.ondrop = (event) => {
    event.preventDefault();
    console.log(event.dataTransfer.files)
    let files = [];
    for (let f of event.dataTransfer.files) {
        files.push({ path: f.path, name: f.name })
    }
    ipcRenderer.send('copy', files)
    return false;
}

function show(type) {
    loading.style.display = 'none';
    let urls = [];
    ips.forEach((ip) => {
        if (type == 0) {
            urls.push('http://' + ip + ':' + uploadPort);
        }
        if (type == 1) {
            if (wirelessIps.indexOf(ip) >= 0) {
                urls.push('http://' + ip + ':' + uploadPort);
            }
        }
        if (type == 2) {
            if (wirelessIps.indexOf(ip) < 0) {
                urls.push('http://' + ip + ':' + uploadPort);
            }
        }
    })
    if (urls.length) {
        links.innerHTML = "";
        urls.forEach((url) => {
            let e = document.createElement('p');
            e.innerText = url;
            e.setAttribute('link', url);
            links.appendChild(e);
            e.click();
        });
    } else {
        links.innerHTML = "";
        let title = document.createElement('h3');
        type == 0 && (title.innerHTML = '抱歉，出错啦。<br><small>未连接网络。</small>');
        type == 1 && (title.innerHTML = '抱歉，出错啦。<br><small>未连接无线网络或未开启网络热点。</small>');
        type == 2 && (title.innerHTML = '抱歉，出错啦。<br><small>未连接有线网络或未插网线。</small>');
        links.appendChild(title);
        let help = document.createElement('p');
        help.innerText = '【查看帮助（右键打开）】';
        help.setAttribute('link', helpLink);
        links.appendChild(help);
        let feedback = document.createElement('p');
        feedback.innerText = '【意见反馈（右键打开）】';
        feedback.setAttribute('link', feedbackLink);
        links.appendChild(feedback);
        help.click();
        return;
    }

    // let downloadUrls = [];
    // let uploadUrls = [];
    // // if (!wirelessIps || !wirelessIps.length) {
    // //     let title = document.createElement('h3');
    // //     title.innerHTML = '抱歉，出错啦。<br><small>未连接无线网络或未开启网络热点。</small>';
    // //     links.appendChild(title);
    // //     let help = document.createElement('p');
    // //     help.innerText = '【查看帮助（右键打开）】';
    // //     help.setAttribute('link', helpLink);
    // //     links.appendChild(help);
    // //     let feedback = document.createElement('p');
    // //     feedback.innerText = '【意见反馈（右键打开）】';
    // //     feedback.setAttribute('link', feedbackLink);
    // //     links.appendChild(feedback);
    // //     help.click();
    // //     return;
    // // }
    // wirelessIps.forEach((ip) => {
    //     // downloadUrls.push('http://' + ip + ':' + downloadPort);
    //     uploadUrls.push('http://' + ip + ':' + uploadPort);
    // });
    // // if (downloadUrls.length) {
    // //     let title = document.createElement('h3');
    // //     title.innerText = '【下载】(电脑→其他设备)'
    // //     links.appendChild(title);
    // //     downloadUrls.forEach((url) => {
    // //         let e = document.createElement('p');
    // //         e.innerText = url;
    // //         e.setAttribute('link', url);
    // //         links.appendChild(e);
    // //         e.click();
    // //     });
    // // }
    // if (uploadUrls.length) {
    //     let title = document.createElement('h3');
    //     // title.innerText = '【上传】(其他设备→电脑)'
    //     // links.appendChild(title);
    //     uploadUrls.forEach((url) => {
    //         let e = document.createElement('p');
    //         e.innerText = url;
    //         e.setAttribute('link', url);
    //         links.appendChild(e);
    //         e.click();
    //     });
    // }
}