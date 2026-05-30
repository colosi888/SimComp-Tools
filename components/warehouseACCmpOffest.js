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
    amount: 0, // 保存数量
    cost: 0, // 保存成本
    marketPrice: 0, // 保存市场价格
    priceInput: undefined, // 保存价格输入框引用
    infoDisplay: undefined, // 保存信息显示节点引用
    transUnitCount: 0, // 运输单位数量
    taxFee: 0, // 税费
    itemName: "", // 物品名称
    itemQuality: 0, // 物品品质
  }
  commonFuncList = [{
    match: () => Boolean(location.href.match(/warehouse\/(.+)/) && document.querySelectorAll("form").length > 0),
    func: this.mainFunc
  }]
  cssText = [`div[sct_cpt='warehouseACCmpOffest'][sct_id='selectorNode']{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}button[sct_cpt='warehouseACCmpOffest']{flex:1;min-width:60px;height:30px;background-color:#3c3c3c;border-radius:5px;color:var(--fontColor);border:none;cursor:pointer;font-size:12px;}button[sct_cpt='warehouseACCmpOffest']:hover{background-color:#4a4a4a;}`];

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
    let mountNode = document.querySelector("div[sct_cpt='warehouseACCmpOffest'][sct_id='selectorNode']");
    if (mountNode) mountNode.remove();
  }
  async mainFunc() {
    tools.log("========================================");
    tools.log("warehouseACCmpOffest: 开始执行主函数");
    
    // 检查网页标记是否已存在
    if (document.querySelector("div[sct_cpt='warehouseACCmpOffest'][sct_id='selectorNode']")) {
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
      // 获取价格输入框 - 先获取，这样可以快速失败
      let priceInput = document.querySelector("input[name='price']");
      tools.log(`warehouseACCmpOffest: 价格输入框:`, priceInput);
      
      if (!priceInput) {
        tools.log("warehouseACCmpOffest: ❌ 未找到价格输入框");
        this.componentData.onLoad = false;
        tools.log("========================================");
        return;
      }
      
      // 保存输入框引用
      this.componentData.priceInput = priceInput;
      let targetNode = priceInput.parentElement;
      tools.log(`warehouseACCmpOffest: 挂载目标节点:`, targetNode);
      
      // 初始化数据以及节点预备
      if (this.componentData.selectorNode == undefined) await this.buildSelectorNode();
      let selectorNode = this.componentData.selectorNode;
      // 清空容器
      selectorNode.innerHTML = '';
      tools.log("warehouseACCmpOffest: 选择器节点准备完成");
      
      let realm = (this.componentData.realm == undefined) ? await tools.getRealm() : this.componentData.realm;
      this.componentData.realm = realm;
      
      // 获取资源ID - 使用更健壮的URL解析方式
      let hrefMatch = location.href.match(/warehouse\/(.*)/);
      if (!hrefMatch || !hrefMatch[1]) {
        tools.log("warehouseACCmpOffest: ❌ 无法从URL提取资源名称");
        this.componentData.onLoad = false;
        tools.log("========================================");
        return;
      }
      let res_name = decodeURI(hrefMatch[1]);
      
      // 移除可能的 /sell/ 后缀
      if (res_name.endsWith('/sell/') || res_name.endsWith('/sell')) {
        res_name = res_name.replace(/\/sell\/?$/, '');
      } else if (res_name.includes('/')) {
        // 处理其他路径格式
        res_name = res_name.split('/')[0];
      }
      tools.log(`warehouseACCmpOffest: 资源名称: ${res_name}`);
      
      let res_id = tools.itemName2Index(res_name);
      if (res_id === undefined) {
        tools.log(`warehouseACCmpOffest: ❌ 无法找到资源ID: ${res_name}`);
        this.componentData.onLoad = false;
        tools.log("========================================");
        return;
      }
      tools.log(`warehouseACCmpOffest: 资源ID: ${res_id}`);
      
      // 获取品质信息
      let formNode = document.querySelector("form");
      if (!formNode) {
        tools.log("warehouseACCmpOffest: ❌ 未找到表单元素");
        this.componentData.onLoad = false;
        tools.log("========================================");
        return;
      }
      let quality = this.getQuality(formNode);
      tools.log(`warehouseACCmpOffest: 品质: ${quality}`);
      
      // 获取物品名称
      let itemName = "";
      try {
        if (formNode.previousElementSibling) {
          let bElement = formNode.previousElementSibling.querySelector("b");
          if (bElement) {
            itemName = bElement.innerText;
          }
        }
      } catch (e) {
        tools.log("warehouseACCmpOffest: 获取物品名称失败", e);
      }
      this.componentData.itemName = itemName;
      this.componentData.itemQuality = quality;
      
      let market_price = await tools.getMarketPrice(res_id, quality, realm);
      tools.log(`warehouseACCmpOffest: 市场价格: ${market_price}`);

      // 从仓库数据中获取数量和成本
      let warehouseData = await this.getWarehouseItemData(res_id, quality, realm);
      let amount = warehouseData.amount || 0;
      let cost = warehouseData.cost || 0;
      tools.log(`warehouseACCmpOffest: 数量: ${amount}, 成本: ${cost}`);

      // 保存关键数据
      this.componentData.amount = amount;
      this.componentData.cost = cost;
      this.componentData.marketPrice = market_price;

      // 重新渲染按钮
      selectorNode.setAttribute("mp", market_price);
      selectorNode.setAttribute("amount", amount);
      selectorNode.setAttribute("cost", cost);
      
      // 生成按钮
      for (let i = 0; i < this.indexDBData.offestList[realm].length; i++) {
        let oriContent = this.indexDBData.offestList[realm][i];
        let realPrice = this.realPriceCalc(oriContent, market_price);
        let button = document.createElement("button");
        button.setAttribute("sct_cpt", "warehouseACCmpOffest");
        button.setAttribute("data-index", i);
        button.setAttribute("data-value", realPrice);
        button.setAttribute("type", "button");
        button.textContent = `${oriContent}：${realPrice}`;
        button.addEventListener("click", e => this.buttonClickHandle(e));
        selectorNode.appendChild(button);
      }
      
      // 挂载节点
      targetNode.appendChild(selectorNode);
      tools.log("warehouseACCmpOffest: ✅ 选择器已挂载");
      
      // 挂载数量和成本显示
      this.mountAmountCostDisplay(targetNode, amount, cost, market_price, res_name);
      tools.log("warehouseACCmpOffest: ✅ 数量成本显示已挂载");
      
      // 添加价格输入框监听
      priceInput.addEventListener("input", e => this.handlePriceChange(e));
      
      // 添加数量输入框监听，因为运输单位和税费会随数量变化
      try {
        let inputList = formNode.querySelectorAll("input");
        if (inputList && inputList.length >= 1) {
          let quantityInput = inputList[0];
          if (quantityInput) {
            quantityInput.addEventListener("input", e => this.handleQuantityChange(e));
          }
        }
      } catch (e) {
        tools.log("warehouseACCmpOffest: 添加数量监听失败", e);
      }
      
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
        cost: Math.round(totalCost * 100) / 100
      };
    } catch (error) {
      tools.errorLog("获取仓库数据失败:", error);
      return { amount: 0, cost: 0 };
    }
  }
  
  // 挂载数量和成本显示
  mountAmountCostDisplay(parentNode, amount, cost, marketPrice, itemName) {
    try {
      // 移除已存在的显示节点
      let existingDisplay = document.querySelector("div[sct_cpt='warehouseACCmpOffest'][sct_id='infoDisplay']");
      if (existingDisplay) {
        existingDisplay.remove();
      }
      
      if (!parentNode) {
        tools.log("warehouseACCmpOffest: ❌ 无法挂载显示节点，父节点不存在");
        return;
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
      
      // 保存节点引用
      this.componentData.infoDisplay = infoDiv;
      
      // 初始渲染 - 使用当前市场价格
      this.updateInfoDisplay(marketPrice);
      
      parentNode.appendChild(infoDiv);
      tools.log("warehouseACCmpOffest: ✅ 信息显示节点已挂载");
    } catch (error) {
      tools.log("warehouseACCmpOffest: ❌ 挂载信息显示节点时出错");
      tools.errorLog(error);
    }
  }

  // 更新信息显示
  updateInfoDisplay(currentPrice) {
    try {
      const { amount, cost, infoDisplay, itemName, itemQuality } = this.componentData;
      
      if (!infoDisplay) {
        tools.log("warehouseACCmpOffest: 信息显示节点不存在，无法更新");
        return;
      }
      
      // 每次都重新获取运输单位和税费，避免数据过时
      let transUnitCount = 0;
      let taxFee = 0;
      let formNode = document.querySelector("form");
      if (formNode) {
        try {
          let rowDiv = formNode.querySelector("div.row");
          if (rowDiv && rowDiv.nextElementSibling) {
            let spanList = rowDiv.nextElementSibling.querySelectorAll("span");
            if (spanList && spanList.length >= 2) {
              transUnitCount = parseInt(spanList[0].innerText.replaceAll(/(x)|(,)/g, "")) || 0;
              taxFee = parseInt(spanList[1].innerText.split("\n")[0].replaceAll(/(\$)|(,)/g, "")) || 0;
            }
          }
        } catch (e) {
          tools.log("warehouseACCmpOffest: 获取运输单位和税费失败", e);
        }
      }
      
      // 获取运输单位成本
      const transUnitPrice = this.get_cost("运输单位", 0) || 0;
      const transPay = transUnitCount * transUnitPrice;
      
      // 计算总收益和利润
      let estimatedRevenue = Math.round(amount * currentPrice * 100) / 100;
      let totalCost = cost + transPay + taxFee; // 总成本 = 成本 + 运输费用 + 税费
      let estimatedProfit = Math.round((estimatedRevenue - totalCost) * 100) / 100;
      let netRevenue = Math.round((estimatedRevenue - taxFee) * 100) / 100;
      let roundedCost = Math.round(cost * 100) / 100;
      let roundedTransPay = Math.round(transPay * 100) / 100;
      
      infoDisplay.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px 12px; align-items: center; text-align: center;">
          <div title="库存数量" style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 10px; opacity: 0.8;">数量</span>
            <span style="font-weight: 500;">${amount.toLocaleString()}</span>
          </div>
          <div title="平均成本" style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 10px; opacity: 0.8;">成本</span>
            <span style="font-weight: 500;">${roundedCost.toLocaleString()}</span>
          </div>
          <div title="运输费用" style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 10px; opacity: 0.8;">运费</span>
            <span style="font-weight: 500;">${roundedTransPay.toLocaleString()}</span>
          </div>
          <div title="税费" style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 10px; opacity: 0.8;">税费</span>
            <span style="font-weight: 500;">${taxFee.toLocaleString()}</span>
          </div>
          <div title="预估收入（不含税）" style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 10px; opacity: 0.8;">收入</span>
            <span style="font-weight: 500;">${netRevenue.toLocaleString()}</span>
          </div>
          <div title="预估利润" style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 10px; opacity: 0.8;">利润</span>
            <span style="font-weight: 500; color: ${estimatedProfit >= 0 ? '#4CAF50' : '#f44336'}">
              ${estimatedProfit >= 0 ? '+' : ''}${estimatedProfit.toLocaleString()}
            </span>
          </div>
        </div>
      `;
    } catch (error) {
      tools.log("warehouseACCmpOffest: ❌ 更新信息显示时出错");
      tools.errorLog(error);
    }
  }

  // 处理价格输入框变化
  handlePriceChange(e) {
    try {
      const price = parseFloat(e.target.value);
      if (!isNaN(price) && price > 0) {
        this.updateInfoDisplay(price);
      }
    } catch (error) {
      tools.log("warehouseACCmpOffest: ❌ 处理价格变化时出错");
      tools.errorLog(error);
    }
  }

  // 处理数量输入框变化
  handleQuantityChange(e) {
    try {
      // 获取当前价格并更新显示，updateInfoDisplay 会自己重新获取运输单位和税费
      const priceInput = this.componentData.priceInput;
      if (priceInput) {
        const price = parseFloat(priceInput.value);
        if (!isNaN(price) && price > 0) {
          this.updateInfoDisplay(price);
        } else {
          // 如果没有有效价格，使用市场价格
          const marketPrice = this.componentData.marketPrice;
          if (marketPrice > 0) {
            this.updateInfoDisplay(marketPrice);
          }
        }
      }
    } catch (error) {
      tools.log("warehouseACCmpOffest: ❌ 处理数量变化时出错");
      tools.errorLog(error);
    }
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

  // 获取物品成本
  get_cost(name, quality) {
    let realm = runtimeData.basisCPT?.realm;
    if (realm == undefined) return 0;
    
    let warehouseData = indexDBData.basisCPT?.warehouse?.[realm];
    if (!warehouseData || !Array.isArray(warehouseData)) {
      tools.log("warehouseACCmpOffest: 仓库数据未加载");
      return 0;
    }
    
    let result = 0;
    warehouseData.forEach(item => {
      if (!item) return;
      
      let itemName = "";
      if (typeof item.kind === 'object' && item.kind.name) {
        itemName = item.kind.name;
      } else if (typeof item.kind === 'number') {
        itemName = tools.itemIndex2Name(item.kind);
      }
      
      if (itemName != name || item.quality != quality) return;
      
      let cost = 0;
      if (typeof item.cost === 'object') {
        cost = Object.values(item.cost).reduce((acc, cur) => acc + cur, 0);
      } else if (typeof item.cost === 'number') {
        cost = item.cost;
      }
      
      result = (cost / item.amount).toFixed(10);
    });
    
    tools.log(`warehouseACCmpOffest: 获取成本 - 名称:${name}, 品质:${quality}, 结果:${result}`);
    return parseFloat(result);
  }
  // 构建选择器模板
  async buildSelectorNode() {
    let realm = (this.componentData.realm == undefined) ? await tools.getRealm() : this.componentData.realm;
    this.componentData.realm = realm;
    let newNode = document.createElement("div");
    newNode.setAttribute("sct_cpt", "warehouseACCmpOffest");
    newNode.setAttribute("sct_id", "selectorNode");
    this.componentData.selectorNode = newNode;
  }
  // 按钮点击处理
  buttonClickHandle(e) {
    try {
      e.preventDefault();
      e.stopPropagation();
      
      let target = e.target;
      let value = target.getAttribute("data-value");
      tools.log(`warehouseACCmpOffest: 按钮点击 - 值: ${value}`);
      
      // 使用保存的输入框引用
      const targetInput = this.componentData.priceInput;
      
      if (targetInput) {
        // 根据价格范围进行四舍五入
        const roundedValue = this.roundPrice(parseFloat(value));
        tools.setInput(targetInput, roundedValue, 3);
        tools.log(`warehouseACCmpOffest: 已设置价格: ${roundedValue}`);
        
        // 同时更新信息显示
        if (!isNaN(roundedValue) && roundedValue > 0) {
          this.updateInfoDisplay(roundedValue);
        }
      }
    } catch (e) {
      tools.errorLog("仓库出售界面显示mp偏移组件报错", e);
    }
  }

  // 根据价格范围进行四舍五入
  roundPrice(price) {
    if (isNaN(price) || price <= 0) return 0;
    
    let step;
    if (price < 1) {
      step = 0.001;
    } else if (price >= 1 && price < 2) {
      step = 0.01;
    } else if (price >= 2 && price < 5) {
      step = 0.05;
    } else if (price >= 5 && price < 20) {
      step = 0.1;
    } else if (price >= 20 && price < 50) {
      step = 0.25;
    } else if (price >= 50 && price < 100) {
      step = 0.5;
    } else if (price >= 100 && price < 200) {
      step = 1;
    } else if (price >= 200 && price < 500) {
      step = 2;
    } else if (price >= 500 && price < 1000) {
      step = 5;
    } else {
      step = 10;
    }
    
    // 计算需要保留的小数位数
    const decimalPlaces = (step.toString().split('.')[1] || '').length;
    // 使用更精确的四舍五入方式，避免浮点数误差
    return Number((Math.round(price / step) * step).toFixed(decimalPlaces));
  }
  // 计算实际价格
  realPriceCalc(inputString, marketPrice) {
    let [placeholder, operator, value] = inputString.split(/([+\-*/#])/);
    let mp = (placeholder == "") ? 0 : parseFloat(placeholder.replace("mp", marketPrice).trim());
    let num = parseFloat(value.trim());
    let result = 0;
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
    // 根据结果范围选择最合适的小数位数进行四舍五入
    if (result < 1) {
      return Number(result.toFixed(3));
    } else if (result < 2) {
      return Number(result.toFixed(2));
    } else if (result < 5) {
      return Number(result.toFixed(2));
    } else if (result < 20) {
      return Number(result.toFixed(1));
    } else {
      return Number(result.toFixed(2));
    }
  }

}
new warehouseACCmpOffest();
