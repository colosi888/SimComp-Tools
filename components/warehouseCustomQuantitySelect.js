const BaseComponent = require("../tools/baseComponent.js");
const { tools, componentList, runtimeData, indexDBData, feature_config } = require("../tools/tools.js");

class warehouseCustomQuantitySelect extends BaseComponent {
  constructor() {
    super();
    this.name = "库存发货数量快捷选择";
    this.describe = "在库存发货界面可以快捷选择预设的数量进行发货";
    this.enable = false;
    this.tagList = ['仓库', '实用', '快捷'];
  }
  componentData = {
    tempNode: undefined, // 临时节点
  }
  indexDBData = {
    quantityList: [], // 自定义数量列表
  }
  commonFuncList = [{
    match: () => Boolean(location.href.match(/warehouse\/(.+)/) && document.querySelectorAll("form").length > 0),
    func: this.mountSelectFunc
  }]
  cssText = [`div[sct_cpt='warehouseCustomQuantitySelect']{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}button[sct_cpt='warehouseCustomQuantitySelect']{flex:1;min-width:60px;height:30px;background-color:#3c3c3c;border-radius:5px;color:var(--fontColor);border:none;cursor:pointer;font-size:12px;}button[sct_cpt='warehouseCustomQuantitySelect']:hover{background-color:#4a4a4a;}button[sct_cpt='warehouseCustomQuantitySelect'][sct_id='full']{background-color:#2ecc71;color:white;width:100%;}`]

  // 设置界面构建
  settingUI = () => {
    let mainNode = document.createElement("div");
    // 构建节点
    let htmlText = `<div class="header">库存发货数量快捷选择设置</div><div class="container"><div><button class="btn script_opt_submit">保存更改</button></div><table><thead><tr><td>数量</td><td>删除</td></tr></thead><tbody>`;
    for (let i = 0; i < this.indexDBData.quantityList.length; i++) {
      let item = this.indexDBData.quantityList[i];
      htmlText += `<tr><td><input class="form-control" value="${item}"></td><td><button class="btn" sct_cpt='warehouseCustomQuantitySelect' sct_id='deleteOne'>删除</button></td></tr>`
    }
    htmlText += `</tbody></table><button class="btn" style="width: 100%;" sct_cpt='warehouseCustomQuantitySelect' sct_id='addOne'>添加</button></div>`
    mainNode.innerHTML = htmlText;
    // 绑定事件
    mainNode.addEventListener("click", (e) => this.settingClickHandle(e));
    mainNode.id = "warehouseCustomQuantitySelect_setting"
    // 返回节点对象
    return mainNode;
  }
  // 设置界面事件分发
  settingClickHandle(e) {
    let target = e.target;
    let nodeID = target.getAttribute("sct_id");
    if (target.tagName != "BUTTON") return;
    if (/script_opt_submit/.test(target.className)) return this.settingSubmit();
    if (nodeID == "addOne") return this.settingAddOne(e);
    if (nodeID == "deleteOne") return this.settingDeleteOne(e);
  }
  // 设置提交保存按钮
  settingSubmit() {
    let valueList = Object.values(document.querySelectorAll("#warehouseCustomQuantitySelect_setting input"))
      .filter(node => node.value != "" && !isNaN(Math.floor(node.value.replace(/,/g, ""))))
      .map(node => Math.floor(node.value.replace(/,/g, "")))
      .filter(value => value > 0);
    this.indexDBData.quantityList = valueList;
    tools.indexDB_updateIndexDBData();
    this.buildSelectorNode();
    document.querySelectorAll("div[sct_cpt='warehouseCustomQuantitySelect']").forEach(node => node.remove());
    tools.alert("已提交更改保存");
  }
  // 删除单个按钮
  settingDeleteOne(e) {
    tools.getParentByIndex(e.target, 2).remove();
  }
  // 添加一个按钮
  settingAddOne(e) {
    let newNode = document.createElement("tr");
    newNode.innerHTML = `<td><input class="form-control" value=""></td><td><button class="btn" sct_cpt="warehouseCustomQuantitySelect" sct_id="deleteOne">删除</button></td>`;
    e.target.previousElementSibling.querySelector("tbody").appendChild(newNode);
  }

  // 挂载选择器函数
  mountSelectFunc() {
    // 检查删除已有
    let nowNode = document.querySelector("div[sct_cpt='warehouseCustomQuantitySelect']");
    if (nowNode) return;

    // 检查缓存节点
    if (!this.componentData.tempNode) this.buildSelectorNode();
    let buttonContainer = this.componentData.tempNode;

    // 捕获挂载位置 - 添加安全检查
    let amountInput = document.querySelector("input[name='amount']");
    if (!amountInput) {
      tools.log("warehouseCustomQuantitySelect: 未找到数量输入框");
      return;
    }
    let targetNode = amountInput.parentElement?.parentElement;
    if (!targetNode) {
      tools.log("warehouseCustomQuantitySelect: 父节点不存在");
      return;
    }
    targetNode.appendChild(buttonContainer);
    tools.log("warehouseCustomQuantitySelect: 按钮容器已挂载");
  }

  // 选择器内容变动函数
  selectChangeHandle(e) {
    tools.log("========================================");
    tools.log("warehouseCustomQuantitySelect: 选择器变化开始");
    
    let newValue = e.target.value;
    tools.log(`warehouseCustomQuantitySelect: 当前选中值: '${newValue}'`);
    tools.log(`warehouseCustomQuantitySelect: 事件目标:`, e.target);
    
    if (newValue == "full") {
      tools.log("warehouseCustomQuantitySelect: 选择了'全部'选项");
      
      // 全部库存
      tools.log(`warehouseCustomQuantitySelect: 当前URL: ${location.href}`);
      let hrefMatch = location.href.match(/warehouse\/(.*)/);
      tools.log(`warehouseCustomQuantitySelect: URL匹配正则: /warehouse\/(.*)/`);
      tools.log(`warehouseCustomQuantitySelect: URL匹配结果:`, hrefMatch);
      tools.log(`warehouseCustomQuantitySelect: hrefMatch[1] 值: ${hrefMatch ? hrefMatch[1] : 'undefined'}`);
      
      if (!hrefMatch || !hrefMatch[1]) {
        tools.log("warehouseCustomQuantitySelect: ❌ 无法从URL提取资源名称");
        tools.log("========================================");
        return;
      }
      let resName = decodeURI(hrefMatch[1]);
      tools.log(`warehouseCustomQuantitySelect: decodeURI后的资源名称: '${resName}'`);
      
      // 移除可能的 /sell/ 后缀
      if (resName.endsWith('/sell/') || resName.endsWith('/sell')) {
        resName = resName.replace(/\/sell\/?$/, '');
        tools.log(`warehouseCustomQuantitySelect: 移除/sell/后缀后: '${resName}'`);
      } else if (resName.includes('/')) {
        // 处理其他路径格式
        resName = resName.split('/')[0];
        tools.log(`warehouseCustomQuantitySelect: 按斜杠分割后取第一部分: '${resName}'`);
      }
      tools.log(`warehouseCustomQuantitySelect: 最终资源名称: '${resName}'`);
      tools.log(`warehouseCustomQuantitySelect: 资源名称长度: ${resName.length}`);
      
      let parentNode = tools.getParentByIndex(e.target, 4);
      tools.log(`warehouseCustomQuantitySelect: 调用getParentByIndex(e.target, 4)`);
      tools.log(`warehouseCustomQuantitySelect: 父节点:`, parentNode);
      tools.log(`warehouseCustomQuantitySelect: 父节点HTML: ${parentNode ? parentNode.outerHTML.slice(0, 500) : 'null'}`);
      
      let quality = this.getQuality(parentNode);
      tools.log(`warehouseCustomQuantitySelect: 获取到的品质: ${quality}`);
      
      let realm = runtimeData.basisCPT.realm;
      tools.log(`warehouseCustomQuantitySelect: runtimeData.basisCPT:`, runtimeData.basisCPT);
      tools.log(`warehouseCustomQuantitySelect: 当前服务器(realm): ${realm}`);
      tools.log(`warehouseCustomQuantitySelect: realm类型: ${typeof realm}`);
      
      // 注意: realm 可以是 0（有效的服务器ID），所以不能用 !realm 判断
      if (realm === undefined || realm === null) {
        tools.log("warehouseCustomQuantitySelect: ❌ realm 未定义或为null");
        tools.log("========================================");
        return;
      }
      tools.log(`warehouseCustomQuantitySelect: ✅ realm 有效: ${realm}`);
      
      tools.log(`warehouseCustomQuantitySelect: indexDBData.basisCPT:`, indexDBData.basisCPT);
      tools.log(`warehouseCustomQuantitySelect: indexDBData.basisCPT.warehouse:`, indexDBData.basisCPT.warehouse);
      let warehouseData = indexDBData.basisCPT.warehouse[realm];
      tools.log(`warehouseCustomQuantitySelect: 仓库数据存在: ${!!warehouseData}`);
      tools.log(`warehouseCustomQuantitySelect: 仓库数据类型: ${typeof warehouseData}`);
      tools.log(`warehouseCustomQuantitySelect: 仓库数据长度: ${Array.isArray(warehouseData) ? warehouseData.length : 'N/A'}`);
      
      if (!warehouseData || !Array.isArray(warehouseData)) {
        tools.log("warehouseCustomQuantitySelect: ❌ 仓库数据未加载");
        tools.log("========================================");
        return;
      }
      
      // 输出仓库数据的前10个物品用于调试
      tools.log("warehouseCustomQuantitySelect: ===== 仓库数据前10项 ======");
      for (let i = 0; i < Math.min(10, warehouseData.length); i++) {
        let item = warehouseData[i];
        let itemName = "";
        let kindInfo = "";
        if (typeof item.kind === 'object' && item.kind.name) {
          itemName = item.kind.name;
          kindInfo = `object (name: ${item.kind.name})`;
        } else if (typeof item.kind === 'number') {
          let convertedName = tools.itemIndex2Name(item.kind);
          itemName = convertedName;
          kindInfo = `number (${item.kind}) -> name: '${convertedName}'`;
        } else if (item.materials && Array.isArray(item.materials)) {
          itemName = item.materials.find(m => m && m.trim() !== "") || "";
          kindInfo = `materials: ${JSON.stringify(item.materials)}`;
        } else {
          itemName = String(item.kind);
          kindInfo = `unknown type: ${typeof item.kind}`;
        }
        tools.log(`  [${i}] kind: ${kindInfo}, name: '${itemName}', quality: ${item.quality}, amount: ${item.amount}`);
      }
      tools.log("warehouseCustomQuantitySelect: ===== 仓库数据结束 ======");
      
      // 查找对应物品（支持 v3 API，kind 可能是数字或对象）
      tools.log(`warehouseCustomQuantitySelect: ===== 开始查找物品 ======`);
      tools.log(`warehouseCustomQuantitySelect: 期望查找 - 名称: '${resName}', 品质: ${quality}`);
      
      let matchedItems = [];
      let item = warehouseData.find(item => {
        if (!item) {
          tools.log("warehouseCustomQuantitySelect: 跳过null物品");
          return false;
        }
        
        // 比较品质
        let qualityMatch = item.quality == quality;
        if (!qualityMatch) {
          tools.log(`warehouseCustomQuantitySelect: 跳过 - 品质不匹配 (期望:${quality}, 实际:${item.quality})`);
          return false;
        }
        
        // 比较物品名称（支持多种数据结构）
        let itemName = "";
        if (typeof item.kind === 'object' && item.kind.name) {
          itemName = item.kind.name;
        } else if (typeof item.kind === 'number') {
          itemName = tools.itemIndex2Name(item.kind);
        } else if (item.materials && Array.isArray(item.materials)) {
          itemName = item.materials.find(m => m && m.trim() !== "") || "";
        }
        
        tools.log(`warehouseCustomQuantitySelect: 检查物品 - kind:${item.kind}, name:'${itemName}', quality:${item.quality}, amount:${item.amount}`);
        
        let nameMatch = itemName == resName;
        if (nameMatch) {
          tools.log(`warehouseCustomQuantitySelect: ✅ 名称匹配成功!`);
          matchedItems.push(item);
          return true;
        } else {
          tools.log(`warehouseCustomQuantitySelect: 名称不匹配 - 期望:'${resName}', 实际:'${itemName}'`);
          // 尝试忽略大小写比较
          let nameMatchIgnoreCase = itemName.toLowerCase() == resName.toLowerCase();
          if (nameMatchIgnoreCase) {
            tools.log(`warehouseCustomQuantitySelect: ⚠️ 大小写忽略后匹配: '${itemName}' vs '${resName}'`);
            matchedItems.push(item);
            return true;
          }
          return false;
        }
      });
      
      tools.log(`warehouseCustomQuantitySelect: 匹配到的物品数量: ${matchedItems.length}`);
      
      if (!item) {
        tools.log("warehouseCustomQuantitySelect: ❌ 未找到匹配的物品");
        // 尝试输出所有可能匹配的物品
        tools.log("warehouseCustomQuantitySelect: ===== 仓库中所有物品详细列表 ======");
        warehouseData.forEach((item, index) => {
          let itemName = "";
          if (typeof item.kind === 'object' && item.kind.name) {
            itemName = item.kind.name;
          } else if (typeof item.kind === 'number') {
            itemName = tools.itemIndex2Name(item.kind);
          } else if (item.materials && Array.isArray(item.materials)) {
            itemName = item.materials.find(m => m && m.trim() !== "") || "";
          }
          tools.log(`  [${index}] name:'${itemName}', quality:${item.quality}, amount:${item.amount}, kind:${item.kind}`);
        });
        tools.log("warehouseCustomQuantitySelect: ===== 物品列表结束 ======");
        
        // 尝试仅按名称匹配（忽略品质）
        tools.log(`warehouseCustomQuantitySelect: 尝试忽略品质查找...`);
        let itemByName = warehouseData.find(witem => {
          let itemName = "";
          if (typeof witem.kind === 'object' && witem.kind.name) {
            itemName = witem.kind.name;
          } else if (typeof witem.kind === 'number') {
            itemName = tools.itemIndex2Name(witem.kind);
          }
          return itemName == resName;
        });
        
        if (itemByName) {
          tools.log(`warehouseCustomQuantitySelect: ⚠️ 忽略品质后找到匹配: name='${resName}', quality=${itemByName.quality}, amount=${itemByName.amount}`);
        }
      }
      
      newValue = item?.amount || 0;
      tools.log(`warehouseCustomQuantitySelect: 获取到的数量: ${newValue}`);
      tools.log(`warehouseCustomQuantitySelect: ===== 查找结束 ======`);
    }
    
    let targetInput = tools.getParentByIndex(e.target, 2).querySelector("input[name='amount']");
    tools.log(`warehouseCustomQuantitySelect: 调用getParentByIndex(e.target, 2)`);
    tools.log(`warehouseCustomQuantitySelect: 目标输入框:`, targetInput);
    tools.log(`warehouseCustomQuantitySelect: 目标输入框值(设置前): ${targetInput ? targetInput.value : 'null'}`);
    
    if (targetInput) {
      tools.setInput(targetInput, newValue, 2);
      tools.log(`warehouseCustomQuantitySelect: 已设置数量: ${newValue}`);
    } else {
      tools.log("warehouseCustomQuantitySelect: ❌ 目标输入框不存在");
    }
    tools.log("========================================");
  }

  // 构造选择器函数
  buildSelectorNode() {
    // 删除原有节点
    if (this.componentData.tempNode) this.componentData.tempNode = undefined;

    // 构建按钮容器
    let newNode = document.createElement("div");
    newNode.setAttribute("sct_cpt", "warehouseCustomQuantitySelect");
    
    // 添加自定义数量按钮
    for (let i = 0; i < this.indexDBData.quantityList.length; i++) {
      let quantity = this.indexDBData.quantityList[i];
      let button = document.createElement("button");
      button.setAttribute("sct_cpt", "warehouseCustomQuantitySelect");
      button.setAttribute("sct_id", "quantity");
      button.setAttribute("data-value", quantity);
      button.textContent = tools.numberAddCommas(quantity);
      button.setAttribute("type", "button"); // 防止表单提交
      button.addEventListener("click", e => this.buttonClickHandle(e));
      newNode.appendChild(button);
    }

    // 挂载
    this.componentData.tempNode = newNode;
  }

  // 按钮点击处理函数
  buttonClickHandle(e) {
    // 阻止表单提交
    e.preventDefault();
    e.stopPropagation();
    
    let target = e.target;
    let value = target.getAttribute("data-value");
    tools.log(`warehouseCustomQuantitySelect: 按钮点击 - 值: '${value}'`);
    
    // 获取按钮所在的容器，然后找到数量输入框
    let buttonContainer = target.parentElement;
    let targetInput = buttonContainer.parentElement?.querySelector("input[name='amount']");
    tools.log(`warehouseCustomQuantitySelect: 目标输入框:`, targetInput);
    
    if (!targetInput) {
      tools.log("warehouseCustomQuantitySelect: ❌ 未找到数量输入框");
      return;
    }
    
    tools.setInput(targetInput, value, 2);
    tools.log(`warehouseCustomQuantitySelect: 已设置数量: ${value}`);
  }

  // 获取品质
  // 返回值: 数字表示品质（0表示无星星品质）
  getQuality(formNode) {
    if (!formNode || !formNode.previousElementSibling) {
      tools.log(`warehouseCustomQuantitySelect.getQuality: 节点无效，返回品质0`);
      return 0;
    }
    
    // 方法1: 从 previousElementSibling 获取星星数量
    let starsCount = formNode.previousElementSibling.querySelectorAll("span > svg").length;
    tools.log(`warehouseCustomQuantitySelect.getQuality: previousElementSibling星星数量: ${starsCount}`);
    
    if (starsCount > 0) {
      let qualityNumber = parseInt(formNode.previousElementSibling.querySelectorAll("span > svg")[0].parentElement.innerText);
      let result = isNaN(qualityNumber) ? starsCount : qualityNumber;
      tools.log(`warehouseCustomQuantitySelect.getQuality: 返回品质: ${result}`);
      return result;
    }
    
    // 星星数量为0，返回品质0
    tools.log(`warehouseCustomQuantitySelect.getQuality: 星星数量为0，返回品质0`);
    return 0;
  }
}

new warehouseCustomQuantitySelect();
