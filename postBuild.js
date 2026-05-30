let fs = require('fs');
let path = require('path');
let distPath = path.join(__dirname, 'dist');

// 添加前缀
const addPreText = (nowVersion) => {
  let jsFilePath = path.join(distPath, "build.user.js");
  let jsFile = fs.readFileSync(jsFilePath);
  let preText = [
    `// ==UserScript==`,
    `// @name         SimComps - tools`,
    `// @namespace    https://github.com/colosi888/SimComp-Tools/`,
    `// @version      ${nowVersion.join(".")}`,
    `// @description  给国人使用的SimComps脚本 原项目https://github.com/AS629/SimComp-Tools`,
    `// @author       COLOSI`,
    `// @match        http://www.simcompanies.com/*`,
    `// @match        https://www.simcompanies.com/*`,
    `// @license      MIT`,
    `// @grant        none`,
    `// @noframes`,
    `// 安装地址（用户首次安装）`,
    `// @downloadURL  https://raw.githubusercontent.com/colosi888/SimComp-Tools/master/dist/build.user.js`,
    `// 更新检查地址`,
    `// @updateURL    https://raw.githubusercontent.com/colosi888/SimComp-Tools/master/dist/build.user.js`,
    `// ==/UserScript==`,
    ``,
    ``
  ].join("\n");
  fs.writeFileSync(jsFilePath, preText + jsFile, "utf-8");
}

// 获取版本号
const getVersion = () => {
  let oldFile = JSON.parse(fs.readFileSync(path.join(distPath, "version.json")));
  return oldFile.version;
}


// 入口函数
(async function () {
  try {
    let nowVersion = getVersion();
    addPreText(nowVersion);
    console.log("Add Success.  " + nowVersion.join("."));
  } catch (e) {
    console.log(e);
    console.log("Add Fail.");
  }
})()
