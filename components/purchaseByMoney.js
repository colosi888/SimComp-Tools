const BaseComponent = require("../tools/baseComponent.js");
const { tools, componentList, runtimeData, indexDBData, feature_config } = require("../tools/tools.js");

// 在交易行使用限定金额进行采购
class purchaseByMoney extends BaseComponent {
  constructor() {
    super();
    this.name = "交易所金额限购";
    this.describe = "在交易行界面显示金额快捷选择按钮。支持使用$作为占位符(玩家可用资金)，支持单次运算符+-*/，也支持纯数值如100、200，二次确认50%，100000";
    this.enable = false;
    this.tagList = ['实用', '交易所'];
  }
  indexDBData = {
    moneyList: [["$*0.5", "$*0.8", "$", "$+10000", "100", "500"], ["$*0.5", "$*0.8", "$", "$+10000", "100", "500"]], // 不同分区的金额表达式列表
  }
  commonFuncList = [{
    match: () => Boolean(location.href.match(/market\/resource\/(\d+)\//)),
    func: this.mainFunc
  }];
  componentData = {
    containerNode: undefined, // 按钮元素挂载
    moneyBtnContainer: undefined, // money按钮容器
    inProcess: false, // 按钮处理中
    marketCache: {}, // 价格缓存 {realm_res_id: {data: [], timestamp: 时间戳}}
    realm: undefined, // 当前服务器标记
    currentMoney: null, // 当前玩家可用资金
    selectedQuality: 0, // 选中的品质
  };
  cssText = [
    `div#script_purchaseByMoney_container{margin:10px;width:auto;}`,
    `table#script_quality_table{border-collapse:collapse;width:100%;}`,
    `table#script_quality_table td{padding:2px;border:none;}`,
    `button.script_quality_btn{width:55px;height:30px;background-color:#3c3c3c;border:1px solid #555;border-radius:4px;color:var(--fontColor);cursor:pointer;font-size:12px;outline:none;}`,
    `button.script_quality_btn:hover{background-color:#4a4a4a;border-color:#666;}`,
    `button.script_quality_btn.active{background-color:#4CAF50;color:white;border:2px solid #8BC34A;}`,
    `button.script_reset_btn{width:65px;height:60px;background-color:#4CAF50;color:white;border:2px solid #8BC34A;border-radius:4px;cursor:pointer;font-size:12px;vertical-align:middle;outline:none;}`,
    `button.script_reset_btn.normal{background-color:#666;color:var(--fontColor);border:1px solid #555;}`,
    `button.script_reset_btn:hover{background-color:#777;}`,
    `input#script_amount_Inp{width:120px;height:30px;margin:0;}`,
    `button#scriptBtn_1{background-color:green;color:var(--fontColor);height:34px;width:100px;}`,
    `div#script_moneyBtn_container{display:flex;flex-direction:column;gap:3px;justify-content:center;height:100%;}`,
    `button.script_moneyBtn{width:60px;height:28px;background-color:#3c3c3c;border:1px solid #555;border-radius:4px;color:var(--fontColor);cursor:pointer;font-size:11px;outline:none;}`,
    `button.script_moneyBtn:hover{background-color:#4a4a4a;border-color:#666;}`,
    `button.script_moneyBtn.selected{background-color:#2196F3;color:white;border:2px solid #64B5F6;}`
  ]

  // 设置界面的构建
  settingUI = async () => {
    let newNode = document.createElement("div");
    let realm = (this.componentData.realm == undefined) ? await tools.getRealm() : this.componentData.realm;
    this.componentData.realm = realm;
    let htmlText = `<div class="header">交易所金额限购设置</div><div class="container"><div><button class="btn script_opt_submit">保存</button></div><table><thead><tr><td colspan="2"><span>使用$作为占位符</span><br><span>$ = 玩家可用资金</span><br><span>允许使用单次 + - * / 运算符</span><br><span>例如：$*0.5, $+1000, $-500</span><br><span>或直接使用纯数值：100, 500, 1000</span></td></tr><tr><td>金额表达式</td><td>设置</td></tr></thead><tbody>`;
    for (let i = 0; i < this.indexDBData.moneyList[realm].length; i++) {
      let moneyString = this.indexDBData.moneyList[realm][i];
      htmlText += `<tr><td><input class="form-control" value='${moneyString}'></td><td><button class="btn form-control" sct_id="deleteOne">删除</button></td></tr>`;
    }
    htmlText += `</tbody></table><button class="btn form-control" sct_id="addOne">添加</button></div>`;
    newNode.innerHTML = htmlText;
    newNode.id = "purchaseByMoneySetting";
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
    let valueList = Object.values(document.querySelectorAll("div#purchaseByMoneySetting input"))
      .map(node => node.value.replace(/\s/g, ""))
      .filter(value => Boolean(value));
    // 信息检查
    if (valueList.some(value => (value.match(/[+\-*/]/g) || []).length > 1)) {
      return tools.alert("只允许使用一次运算符，并且使用$作为占位符或纯数值，请更正错误内容。");
    }
    // 检查数量是否达标
    if (valueList.length < 1) return tools.alert("至少需要设置一个金额表达式。");
    // 提交更改
    this.indexDBData.moneyList[realm] = valueList;
    tools.indexDB_updateIndexDBData();
    tools.alert("已提交更改");
    // 刷新显示
    this.componentData.moneyBtnContainer = undefined;
    let mountNode = document.querySelector("div#script_moneyBtn_container");
    if (mountNode) mountNode.remove();
  }

  mainFunc() {
    let targetNode = document.querySelector("form").parentElement;
    // 检查按钮是否已经挂载
    if (!this.componentData.containerNode && targetNode.querySelectorAll("div#script_purchaseByMoney_container").length == 0) {
      // 第一次加载
      // 创建表格布局
      let htmltext = `
        <table id="script_quality_table">
          <tr>
            <td><button class="script_quality_btn" data-quality=" 1"> 1</button></td>
            <td><button class="script_quality_btn" data-quality=" 2"> 2</button></td>
            <td><button class="script_quality_btn" data-quality=" 3"> 3</button></td>
            <td><button class="script_quality_btn" data-quality=" 4"> 4</button></td>
            <td><button class="script_quality_btn" data-quality=" 5"> 5</button></td>
            <td><button class="script_quality_btn" data-quality=" 6"> 6</button></td>
            <td rowspan="2"><button class="script_reset_btn" id="script_reset_btn">重置</button></td>
            <td rowspan="2"><div id="script_moneyBtn_container"></div></td>
            <td rowspan="2"><input id="script_amount_Inp" placeholder="全款金额" type="number"/></td>
            <td rowspan="2"><button class="btn" id="scriptBtn_1">使用金额限购</button></td>
          </tr>
          <tr>
            <td><button class="script_quality_btn" data-quality=" 7"> 7</button></td>
            <td><button class="script_quality_btn" data-quality=" 8"> 8</button></td>
            <td><button class="script_quality_btn" data-quality=" 9"> 9</button></td>
            <td><button class="script_quality_btn" data-quality="10">10</button></td>
            <td><button class="script_quality_btn" data-quality="11">11</button></td>
            <td><button class="script_quality_btn" data-quality="12">12</button></td>
          </tr>
        </table>`;
      let tempDiv = document.createElement("div");
      tempDiv.id = "script_purchaseByMoney_container";
      tempDiv.innerHTML = htmltext;
      targetNode.appendChild(tempDiv);
      this.componentData.containerNode = tempDiv;
      
      // 绑定品质按钮点击事件
      document.querySelectorAll(".script_quality_btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          // 移除所有按钮的选中状态，恢复初始状态
          document.querySelectorAll(".script_quality_btn").forEach(b => {
            b.classList.remove("active");
            b.style.backgroundColor = "#3c3c3c";
            b.style.color = "var(--fontColor)";
            b.style.border = "1px solid #555";
          });
          // 添加当前按钮的选中状态
          e.target.classList.add("active");
          e.target.style.backgroundColor = "#4CAF50";
          e.target.style.color = "white";
          e.target.style.border = "2px solid #8BC34A";
          
          // 重置按钮恢复正常状态
          let resetBtn = document.querySelector("#script_reset_btn");
          resetBtn.classList.add("normal");
          resetBtn.style.backgroundColor = "#666";
          resetBtn.style.color = "var(--fontColor)";
          resetBtn.style.border = "1px solid #555";
        });
      });
      
      // 绑定重置按钮点击事件
      document.querySelector("#script_reset_btn").addEventListener("click", () => {
        // 重置所有品质按钮
        document.querySelectorAll(".script_quality_btn").forEach(b => {
          b.classList.remove("active");
          b.style.backgroundColor = "#3c3c3c";
          b.style.color = "var(--fontColor)";
          b.style.border = "1px solid #555";
        });
        
        // 重置按钮高亮
        let resetBtn = document.querySelector("#script_reset_btn");
        resetBtn.classList.remove("normal");
        resetBtn.style.backgroundColor = "#4CAF50";
        resetBtn.style.color = "white";
        resetBtn.style.border = "2px solid #8BC34A";
      });
      
      // 绑定限购按钮点击事件
      document.querySelector("button#scriptBtn_1").addEventListener("click", () => {
        try {
          if (this.componentData.inProcess) return;
          this.componentData.inProcess = true;
          this.purchaseButtonHandle();
        } finally {
          this.componentData.inProcess = false;
        }
      });
      
      // 显示 money 按钮
      this.showMoneyButtons();
    } else if (this.componentData.containerNode && targetNode.querySelectorAll("div#script_purchaseByMoney_container").length == 0) {
      // 创建过 没挂载
      targetNode.appendChild(this.componentData.containerNode);
    }
  }

  // 获取市场数据（带缓存）
  async getMarketDataWithCache(realm, res_id) {
    const cacheKey = `${realm}_${res_id}`;
    const cacheTime = 5 * 60 * 1000; // 5分钟缓存时间
    
    // 检查缓存是否有效
    if (this.componentData.marketCache[cacheKey]) {
      const { data, timestamp } = this.componentData.marketCache[cacheKey];
      if (Date.now() - timestamp < cacheTime) {
        tools.log(`使用缓存数据，资源ID: ${res_id}`);
        return data;
      }
    }
    
    // 缓存无效，重新获取数据
    let market_data = null;
    try {
      // 创建超时 Promise
      let timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 5000);
      });
      
      // 创建数据获取 Promise
      let dataPromise = tools.getNetData(`${tools.baseURL.market}/${realm}/${res_id}/#${tools.generateUUID()}`);
      
      // 使用 Promise.race 实现超时
      market_data = await Promise.race([dataPromise, timeoutPromise]);
      
      // 缓存数据
      if (market_data) {
        this.componentData.marketCache[cacheKey] = {
          data: market_data,
          timestamp: Date.now()
        };
        tools.log(`缓存数据成功，资源ID: ${res_id}`);
      }
    } catch (error) {
      if (error.message === '请求超时') {
        tools.alert("交易行资源请求超时，请重试或检查网络连接。");
        return null;
      }
      tools.errorLog("获取市场数据失败:", error);
    }
    
    return market_data;
  }

  // 获取玩家资金（带缓存）
  async getPlayerMoney() {
    // 如果已有缓存值，直接返回
    if (this.componentData.currentMoney !== null) {
      tools.log(`使用缓存的玩家资金: ${this.componentData.currentMoney}`);
      return this.componentData.currentMoney;
    }
    
    tools.log(`开始获取玩家资金，API地址: ${tools.baseURL.userBase}`);
    
    try {
      // 直接用原生fetch，绕过tools.getNetData的60秒限制
      tools.log(`使用原生fetch直接请求...`);
      let response = await fetch(tools.baseURL.userBase);
      tools.log(`响应状态: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let userBase = await response.json();
      tools.log(`获取到的用户数据:`, userBase);
      
      if (userBase && userBase.authCompany && userBase.authCompany.money !== undefined) {
        this.componentData.currentMoney = userBase.authCompany.money;
        tools.log(`获取玩家资金成功: ${this.componentData.currentMoney}`);
        return this.componentData.currentMoney;
      } else {
        tools.log(`用户数据格式不正确或money字段不存在`);
      }
    } catch (error) {
      tools.errorLog("获取玩家资金失败:", error);
      // 出错时尝试备用数据源
      tools.log(`尝试使用备用数据源...`);
      // 尝试从runtimeData获取
      if (runtimeData.basisCPT && runtimeData.basisCPT.companyData && runtimeData.basisCPT.companyData.money !== undefined) {
        this.componentData.currentMoney = runtimeData.basisCPT.companyData.money;
        tools.log(`从runtimeData获取玩家资金成功: ${this.componentData.currentMoney}`);
        return this.componentData.currentMoney;
      }
      // 尝试从indexDBData获取
      if (indexDBData.basisCPT && indexDBData.basisCPT.companyData && indexDBData.basisCPT.companyData.money !== undefined) {
        this.componentData.currentMoney = indexDBData.basisCPT.companyData.money;
        tools.log(`从indexDBData获取玩家资金成功: ${this.componentData.currentMoney}`);
        return this.componentData.currentMoney;
      }
    }
    return 0;
  }

  // 计算金额表达式
  calculateMoney(inputString, money) {
    // 如果是纯数值，直接返回
    if (/^\d+(\.\d+)?$/.test(inputString)) {
      return Math.round(parseFloat(inputString));
    }
    
    // 如果只是 $，返回玩家资金
    if (inputString === "$") return money;
    
    // 解析表达式
    let [placeholder, operator, value] = inputString.split(/([+\-*/])/);
    let moneyValue = (placeholder == "") ? 0 : parseFloat(placeholder.replace("$", money).trim());
    let num = parseFloat(value.trim());
    let result = 0;
    
    if (isNaN(num)) return 0;
    
    switch (operator) {
      case '+':
        result = moneyValue + num;
        break;
      case '-':
        result = moneyValue - num;
        break;
      case '*':
        result = moneyValue * num;
        break;
      case '/':
        result = moneyValue / num;
        break;
      default:
        result = 0;
        return;
    }
    
    return Math.round(result);
  }

  // 构建money按钮
  async buildMoneyButtons() {
    let realm = (this.componentData.realm == undefined) ? await tools.getRealm() : this.componentData.realm;
    this.componentData.realm = realm;
    
    // 获取玩家资金
    let playerMoney = await this.getPlayerMoney();
    
    // 获取玩家资金
    let container = document.createElement("div");
    container.id = "script_moneyBtn_container";
    
    for (let i = 0; i < this.indexDBData.moneyList[realm].length; i++) {
      let oriContent = this.indexDBData.moneyList[realm][i];
      let calculatedMoney = this.calculateMoney(oriContent, playerMoney);
      let button = document.createElement("button");
      button.className = "script_moneyBtn";
      button.setAttribute("data-index", i);
      button.setAttribute("data-expression", oriContent);
      button.setAttribute("data-value", calculatedMoney);
      button.textContent = `${oriContent}`;
      button.addEventListener("click", (e) => this.moneyBtnClickHandle(e));
      container.appendChild(button);
    }
    
    this.componentData.moneyBtnContainer = container;
    return container;
  }

  // money按钮点击处理
  moneyBtnClickHandle(e) {
    let target = e.target;
    let value = target.getAttribute("data-value");
    let expression = target.getAttribute("data-expression");
    
    tools.log(`money按钮点击 - 表达式: ${expression}, 值: ${value}`);
    
    // 设置输入框的值
    let amountInput = document.querySelector("#script_amount_Inp");
    if (amountInput) {
      tools.setInput(amountInput, value);
    }
    
    // 高亮当前按钮，恢复其他按钮状态
    document.querySelectorAll(".script_moneyBtn").forEach(b => {
      b.classList.remove("selected");
      b.style.backgroundColor = "#3c3c3c";
      b.style.color = "var(--fontColor)";
      b.style.border = "1px solid #555";
    });
    target.classList.add("selected");
    target.style.backgroundColor = "#2196F3";
    target.style.color = "white";
    target.style.border = "2px solid #64B5F6";
  }

  // 显示money按钮
  async showMoneyButtons() {
    let container = document.querySelector("div#script_moneyBtn_container");
    if (!container) {
      tools.log("money按钮容器不存在");
      return;
    }
    
    // 检查是否已经有按钮
    if (container.querySelectorAll("button").length > 0) {
      return;
    }
    
    let realm = (this.componentData.realm == undefined) ? await tools.getRealm() : this.componentData.realm;
    this.componentData.realm = realm;
    
    // 获取玩家资金
    let playerMoney = await this.getPlayerMoney();
    tools.log(`showMoneyButtons - 玩家资金: ${playerMoney}`);
    
    // 创建按钮
    for (let i = 0; i < this.indexDBData.moneyList[realm].length; i++) {
      let oriContent = this.indexDBData.moneyList[realm][i];
      let calculatedMoney = this.calculateMoney(oriContent, playerMoney);
      tools.log(`创建按钮 - 表达式: ${oriContent}, 计算结果: ${calculatedMoney}`);
      let button = document.createElement("button");
      button.className = "script_moneyBtn";
      button.setAttribute("data-index", i);
      button.setAttribute("data-expression", oriContent);
      button.setAttribute("data-value", calculatedMoney);
      button.textContent = `${oriContent}`;
      button.addEventListener("click", (e) => this.moneyBtnClickHandle(e));
      container.appendChild(button);
    }
    
    tools.log(`money按钮已挂载到输入框左侧，共${this.indexDBData.moneyList[realm].length}个按钮`);
  }

  // 二次确认检查
  async checkConfirmation(amount) {
    let playerMoney = await this.getPlayerMoney();
    if (playerMoney <= 0) return true;
    
    let ratio = amount / playerMoney;
    let percentage = Math.round(ratio * 100);
    
    // 检查是否超过50%
    if (ratio > 0.5) {
      let confirmMsg = `您即将使用 ${amount.toLocaleString()} \n`;
      confirmMsg += `占您总资金的 ${percentage}%\n`;
      confirmMsg += `是否确定继续？`;
      
      return await tools.confirm(confirmMsg);
    }
    
    // 检查是否超过100000
    if (amount > 100000) {
      let confirmMsg = `您即将使用超过 100,000 \n`;
      confirmMsg += `使用金额: ${amount.toLocaleString()}\n`;
      confirmMsg += `是否确定继续？`;
      
      return await tools.confirm(confirmMsg);
    }
    
    return true;
  }
  
  async purchaseButtonHandle() {
    // 从选中的按钮获取品质值
    let selectedBtn = document.querySelector(".script_quality_btn.active");
    let quality = selectedBtn ? parseInt(selectedBtn.getAttribute("data-quality")) : 0;
    let amount = parseFloat(document.querySelector("#script_amount_Inp").value);
    let res_id = parseInt(location.href.match(/\d+(?=\/$)/)?.[0]);
    let temp_cost = 0.0;
    let quantity = 0;
    let maxPrice = 0.0;
    let realm = runtimeData.basisCPT.realm;
    if (quality < 0 || quality > 12) return tools.alert("品质输入有误");
    if (isNaN(amount) || amount <= 0) return tools.alert("金额输入有误");
    
    // 获取玩家资金并检查
    let playerMoney = await this.getPlayerMoney();
    let percentage = Math.round((amount / playerMoney) * 100);
    
    // 二次确认检查
    let needConfirm = false;
    let confirmMessage = "";
    
    if (amount > playerMoney) {
      confirmMessage = `金额超过您的可用资金！\n使用金额: ${amount.toLocaleString()}\n可用资金: ${playerMoney.toLocaleString()}\n是否继续？`;
      needConfirm = true;
    } else if (percentage >= 50) {
      confirmMessage = `您即将使用超过50%的资金！\n使用金额: ${amount.toLocaleString()} (${percentage}%)\n可用资金: ${playerMoney.toLocaleString()}\n是否继续？`;
      needConfirm = true;
    } else if (amount > 100000) {
      confirmMessage = `您即将使用超过100,00资金！\n使用金额: ${amount.toLocaleString()}\n可用资金: ${playerMoney.toLocaleString()}\n是否继续？`;
      needConfirm = true;
    }
    
    if (needConfirm) {
      let userConfirm = await tools.confirm(confirmMessage);
      if (!userConfirm) {
        tools.log("用户取消操作");
        return;
      }
    }
    
    // 获取市场数据（带缓存机制）
    let market_data = await this.getMarketDataWithCache(realm, res_id);
    
    if (!market_data) return tools.alert("交易行资源请求失败，请重试或检查网络连接。");
    for (let i = 0; i < market_data.length; i++) {
      let element = market_data[i];
      if (element.quality < quality) continue;
      if (amount > temp_cost + element.price * element.quantity) {
        temp_cost += element.price * element.quantity;
        quantity += element.quantity;
        continue;
      }
      quantity += (amount - temp_cost) / element.price;
      quantity = parseInt(quantity);
      maxPrice = element.price;
      break;
    }
    let userConfirm = await tools.confirm(
      `使用金额限定从交易行购买 - \n    最大价格:${maxPrice}, \n    最低质量:${quality}, \n    物品数量:${quantity - 1
      }, \n    物品ID:${res_id}\n是否确定？`
    );
    if (!userConfirm) return;
    // 构建错误标记
    let failFlag = false;
    await tools.dely(500);
    // 修改品质按钮
    try {
      if (document.querySelectorAll("form ul[role='menu'] li > a").length != 0)
        document.querySelectorAll("form ul[role='menu'] li > a")[quality].click();
    } catch { failFlag = true }
    await tools.dely(500);
    // 修改数量信息
    try {
      tools.setInput(document.querySelector("form input[name='quantity']"), quantity - 1);
    } catch { failFlag = true }
    // 检查是否报错
    if (failFlag) return tools.alert("执行出错.请尝试打开debug模式,重试后截图控制台信息给开发者.");
    await tools.dely(500);
    document.querySelector("form button[type=submit]").click();
  }
}
new purchaseByMoney();
