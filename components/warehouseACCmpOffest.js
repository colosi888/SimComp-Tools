const BaseComponent = require("../tools/baseComponent.js");
const { tools, componentList, runtimeData, indexDBData, feature_config } = require("../tools/tools.js");

// 仓库出售界面显示mp偏移
class warehouseACCmpOffest extends BaseComponent {
  constructor() {
    super();
    this.name = "仓库出售界面显示mp偏移";
    this.describe = "在仓库出售表格中,填写单价的下面会自动根据当前市场最低价以及设置的计算方法来显示";
    this.enable = true;
  }
  indexDBData = {
    offestList: [["mp+0", "mp*0.97"], ["mp+0", "mp*0.97"]], // 不同分区的偏移列表 内容是字符串 使用mp作为占位符
  }
  componentData = {
    onLoad: false, // 正在加载标记
    realm: undefined, // 当前服务器标记
    selectorNode: undefined, // 选择器缓存节点
  }
  commonFuncList = [{
    match: () => Boolean(location.href.match(/warehouse\/(.+)/) && document.querySelectorAll("form").length > 0),
    func: this.mainFunc
  }]
  cssText = [`select[sct_cpt='warehouseACCmpOffest'][sct_id='selectorNode']{width:100%;height:30px;background-color:#3c3c3c;border-radius:5px;margin-top:5px;color:var(--fontColor);}`];

  // 设置界面的构建
  settingUI = async () => {
    let newNode = document.createElement("div");
    let realm = (this.componentData.realm == undefined) ? await tools.getRealm() : this.componentData.realm;
    this.componentData.realm = realm;
    let htmlText = `<div class="header">仓库出售界面显示mp偏移</div><div class="container"><div><button class="btn script_opt_submit">保存</button></div><table><thead><tr><td colspan="2"><span>使用mp作为占位符</span><br><span>允许使用单次 + - * / 运算符</span><br><span>或者使用#来代表归零0； 例如#100 = 100</span></td></tr><tr><td>偏移表达</td><td>设置</td></tr></thead><tbody>`;
    for (let i = 0; i < this.indexDBData.offestList[realm].length; i++) {
      let offestString = this.indexDBData.offestList[realm][i];
      htmlText += `<tr><td><input class="form-control" value='${offestString}'></td><td><button class="btn form-control" sct_id="deleteOne">删除</button></td></tr>`;
    }
    htmlText += `</tbody></table><button class="btn form-control" sct_id="addOne">添加</button></div>`;
    newNode.innerHTML = htmlText;
    newNode.id = "accMPoffsetSetting";
    // 绑定按钮
    newNode.addEventListener('click', e => this.settingClickHandle(e));
    // 返回元素
    return newNode;
  }
  // 设置界面点击交互
  settingClickHandle(e) {
    if (e.target.tagName != "BUTTON") return;
    if (/script_opt_submit/.test(e.target.className)) return this.settingSubmit();
    if (e.target.getAttribute("sct_id") == "deleteOne") return tools.getParentByIndex(e.target, 2).remove();
    if (e.target.getAttribute("sct_id") == "addOne") return this.settingAddOne(e.target);
  }
  // 添加一行
  settingAddOne(target) {
    let newTrNode = document.createElement("tr");
    newTrNode.innerHTML = `<td><input type="text" class="form-control"></td><td><button class="btn form-control" sct_id="deleteOne">删除</button></td>`;
    target.previousElementSibling.querySelector("tbody").appendChild(newTrNode);
  }
  // 设置提交
  settingSubmit() {
    let realm = this.componentData.realm;
    // 获取内容
    let valueList = Object.values(document.querySelectorAll("div#accMPoffsetSetting input"))
      .map(node => node.value.replace(/\s/g, ""))
      .filter(value => Boolean(value));
    // 信息检查
    if (valueList.some(value => (value.match(/[+\-*/#]/g) || []).length > 1)) {
      return tools.alert("只允许使用一次运算符，并且使用mp作为占位符，请更正错误内容。");
    }
    // 检查数量是否达标
    if (valueList.length == 1) return tools.alert("不能仅仅设置一个快捷定价。");
    if (!valueList.some(value => value == "mp+0")) valueList.unshift("mp+0");
    // 提交更改
    this.indexDBData.offestList[realm] = valueList;
    tools.indexDB_updateIndexDBData();
    tools.alert("已提交更改");
    // 刷新显示
    this.componentData.selectorNode = undefined;
    let mountNode = document.querySelector("select[sct_cpt='warehouseACCmpOffest'][sct_id='selectorNode']");
    if (mountNode) mountNode.remove();
  }
  async mainFunc() {
    tools.log("========================================");
    tools.log("warehouseACCmpOffest: 开始执行主函数");
    
    // 检查网页标记是否已存在
    if (document.querySelector("select[sct_cpt='warehouseACCmpOffest'][sct_id='selectorNode']")) {
      tools.log("warehouseACCmpOffest: 选择器已存在，跳过");
      tools.log("========================================");
      return;
    }
    
    // 检测是否正在等待加载
    if (this.componentData.onLoad) {
      tools.log("warehouseACCmpOffest: 正在加载中，跳过");
      tools.log("========================================");
      return;
    }
    this.componentData.onLoad = true;
    
    try {
      // 初始化数据以及节点预备
      if (this.componentData.selectorNode == undefined) await this.buildSelectorNode();
      let selectorNode = this.componentData.selectorNode;
      tools.log("warehouseACCmpOffest: 选择器节点准备完成");
      
      // 获取价格输入框
      let priceInput = document.querySelector("input[name='price']");
      tools.log(`warehouseACCmpOffest: 价格输入框:`, priceInput);
      
      if (!priceInput) {
        tools.log("warehouseACCmpOffest: ❌ 未找到价格输入框");
        this.componentData.onLoad = false;
        tools.log("========================================");
        return;
      }
      let targetNode = priceInput.parentElement;
      tools.log(`warehouseACCmpOffest: 挂载目标节点:`, targetNode);
      
      let realm = (this.componentData.realm == undefined) ? await tools.getRealm() : this.componentData.realm;
      this.componentData.realm = realm;
      
      // 获取资源ID（修复：添加空值检查）
      let hrefMatch = location.href.match(/\/([^\/]+)$/);
      if (!hrefMatch || !hrefMatch[1]) {
        tools.log("无法从URL提取资源名称");
        return;
      }
      let res_name = decodeURI(hrefMatch[1]);
      let res_id = tools.itemName2Index(res_name);
      
      // 获取品质信息（修复：添加空值检查）
      let formNode = document.querySelector("form");
      if (!formNode) {
        tools.log("未找到表单元素");
        return;
      }
      let quality = this.getQuality(formNode);
      let market_price = await tools.getMarketPrice(res_id, quality, realm);

      // 从仓库数据中获取数量和成本
      let warehouseData = await this.getWarehouseItemData(res_id, quality, realm);
      let amount = warehouseData.amount || 0;
      let cost = warehouseData.cost || 0;

      // 重新渲染select内部的数值
      selectorNode.setAttribute("mp", market_price);
      selectorNode.setAttribute("amount", amount);
      selectorNode.setAttribute("cost", cost);
      selectorNode.selectedIndex = 0;
      let optionList = Object.values(selectorNode.querySelectorAll("option"));
      for (let i = 0; i < optionList.length; i++) {
        let optionNode = optionList[i];
        let oriContent = this.indexDBData.offestList[realm][Number(optionNode.value)];
        let realPrice = this.realPriceCalc(oriContent, market_price);
        optionNode.innerHTML = `${oriContent}： ${realPrice}`;
      }
      // 挂载节点
      targetNode.appendChild(selectorNode);
      tools.log("warehouseACCmpOffest: ✅ 选择器已挂载");
      
      // 挂载数量和成本显示
      this.mountAmountCostDisplay(targetNode, amount, cost, market_price, res_name);
      tools.log("warehouseACCmpOffest: ✅ 数量成本显示已挂载");
      
    } catch (error) {
      tools.log("warehouseACCmpOffest: ❌ 发生错误");
      tools.errorLog(error);
    }
    this.componentData.onLoad = false;
    tools.log("warehouseACCmpOffest: 执行完成");
    tools.log("========================================");
  }
  
  // 从仓库数据中获取指定物品的数量和成本
  async getWarehouseItemData(res_id, quality, realm) {
    try {
      let basisCPT = componentList["basisCPT"];
      if (!basisCPT) {
        tools.log("未找到basisCPT组件");
        return { amount: 0, cost: 0 };
      }
      
      // 尝试获取缓存的仓库数据
      let warehouseData = basisCPT.indexDBData.warehouse[realm];
      
      // 如果缓存为空，尝试等待并获取最新数据
      if (!warehouseData || !Array.isArray(warehouseData)) {
        tools.log("仓库数据未缓存，尝试获取");
        
        // 等待 companyId 可用（最多等待3秒）
        let waitCount = 0;
        while (!basisCPT.componentData.companyId && waitCount < 30) {
          await tools.dely(100);
          waitCount++;
        }
        
        if (!basisCPT.componentData.companyId) {
          tools.log("companyId 未初始化");
          return { amount: 0, cost: 0 };
        }
        
        // 尝试获取仓库数据
        warehouseData = await tools.getNetData(`${tools.baseURL.warehouse}${basisCPT.componentData.companyId}/`);
        if (warehouseData && Array.isArray(warehouseData)) {
          basisCPT.indexDBData.warehouse[realm] = warehouseData;
        }
      }
      
      if (!warehouseData || !Array.isArray(warehouseData)) {
        tools.log("无法获取仓库数据");
        return { amount: 0, cost: 0 };
      }
      
      // 在v3 API中，kind是数字而不是对象
      let item = warehouseData.find(item => {
        if (!item) return false;
        let itemKind = typeof item.kind === 'object' ? item.kind.id : item.kind;
        let itemQuality = item.quality || 0;
        return itemKind === res_id && itemQuality === quality;
      });
      
      if (!item) {
        tools.log(`未找到物品 ID:${res_id}, 品质:${quality}`);
        return { amount: 0, cost: 0 };
      }
      
      // 计算总成本
      let totalCost = 0;
      if (typeof item.cost === 'object') {
        totalCost = Object.values(item.cost).reduce((acc, curr) => acc + curr, 0);
      } else if (typeof item.cost === 'number') {
        totalCost = item.cost;
      }
      
      tools.log(`仓库数据 - ID:${res_id}, 品质:${quality}, 数量:${item.amount}, 成本:${totalCost}`);
      
      return {
        amount: item.amount || 0,
        cost: Math.floor(totalCost * 100) / 100
      };
    } catch (error) {
      tools.errorLog("获取仓库数据失败:", error);
      return { amount: 0, cost: 0 };
    }
  }
  
  // 挂载数量和成本显示
  mountAmountCostDisplay(parentNode, amount, cost, marketPrice, itemName) {
    // 移除已存在的显示节点
    let existingDisplay = document.querySelector("div[sct_cpt='warehouseACCmpOffest'][sct_id='infoDisplay']");
    if (existingDisplay) {
      existingDisplay.remove();
    }
    
    // 创建显示节点
    let infoDiv = document.createElement("div");
    infoDiv.setAttribute("sct_cpt", "warehouseACCmpOffest");
    infoDiv.setAttribute("sct_id", "infoDisplay");
    infoDiv.style.cssText = `
      margin-top: 8px;
      padding: 6px;
      background-color: rgba(60, 60, 60, 0.8);
      border-radius: 4px;
      font-size: 12px;
      color: var(--fontColor);
    `;
    
    // 计算预估收益
    let estimatedRevenue = Math.floor(amount * marketPrice * 100) / 100;
    let estimatedProfit = Math.floor((estimatedRevenue - cost) * 100) / 100;
    
    infoDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; gap: 10px;">
        <span title="库存数量">📦 ${amount.toLocaleString()}</span>
        <span title="平均成本">💰 ${cost.toLocaleString()}</span>
        <span title="预估收入">📈 ${estimatedRevenue.toLocaleString()}</span>
        <span title="预估利润" style="color: ${estimatedProfit >= 0 ? '#4CAF50' : '#f44336'}">
          ${estimatedProfit >= 0 ? '+' : ''}${estimatedProfit.toLocaleString()}
        </span>
      </div>
    `;
    
    parentNode.appendChild(infoDiv);
  }
  
  // 获取品质信息
  getQuality(formNode) {
    try {
      if (!formNode || !formNode.previousElementSibling) return 0;
      
      let svgList = formNode.previousElementSibling.querySelectorAll("span > svg");
      let starsCount = svgList.length;
      if (starsCount == 0) return 0;
      
      let firstSvg = svgList[0];
      if (!firstSvg || !firstSvg.parentElement) return starsCount;
      
      let qualityText = firstSvg.parentElement.innerText;
      let qualityNumber = parseInt(qualityText);
      return isNaN(qualityNumber) ? starsCount : qualityNumber;
    } catch (error) {
      tools.log("获取品质信息失败:", error);
      return 0;
    }
  }
  // 构建选择器模板
  async buildSelectorNode() {
    let realm = (this.componentData.realm == undefined) ? await tools.getRealm() : this.componentData.realm;
    this.componentData.realm = realm;
    let newNode = document.createElement("select");
    let htmlText = this.indexDBData.offestList[realm].map((value, index) => `<option value='${index}'>${value}</option>`).join("");
    newNode.innerHTML = htmlText;
    newNode.addEventListener("change", e => this.selectorChange(e));
    newNode.setAttribute("sct_cpt", "warehouseACCmpOffest");
    newNode.setAttribute("sct_id", "selectorNode");
    this.componentData.selectorNode = newNode;
  }
  // 选择器被点击
  selectorChange(e) {
    try {
      let realm = this.componentData.realm;
      let index = e.target.selectedIndex;
      let market_price = Number(e.target.getAttribute("mp"));
      let realPrice = this.realPriceCalc(this.indexDBData.offestList[realm][index], market_price);
      let targetNode = e.target.previousElementSibling;
      tools.log(`index:${index} value:${this.indexDBData.offestList[realm][index]} output:${realPrice}`);
      tools.setInput(targetNode, realPrice, 3);
    } catch (e) {
      tools.errorLog("仓库出售界面显示mp偏移组件报错", e);
    }
  }
  // 计算实际价格
  realPriceCalc(inputString, marketPrice) {
    // inputString = inputString.replace("mp", marketPrice);
    let [placeholder, operator, value] = inputString.split(/([+\-*/#])/);
    let mp = (placeholder == "") ? 0 : parseFloat(placeholder.replace("mp", marketPrice).trim());
    let num = parseFloat(value.trim());
    let result = 0;
    // console.log(placeholder, operator, value);
    if (isNaN(num)) return 0;
    switch (operator) {
      case '+':
        result = mp + num;
        break;
      case '-':
        result = mp - num;
        break;
      case '*':
        result = mp * num;
        break;
      case '/':
        result = mp / num;
        break;
      case "#":
        result = num;
        break;
      default:
        result = 0;
        return;
    }
    return Number(result.toFixed(3));
  }

}
new warehouseACCmpOffest();
