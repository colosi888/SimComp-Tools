const BaseComponent = require("../tools/baseComponent.js");
const { tools, componentList, runtimeData, indexDBData, feature_config } = require("../tools/tools.js");

// 仓库单物品总价
class warehousePriceCount extends BaseComponent {
  constructor() {
    super()
    this.name = "仓库单物品总价值";
    this.describe = "在仓库界面鼠标移动到物品上悬停,会显示单物品合计总价值.";
    this.enable = true;
    this.tagList = ['统计'];
  }
  commonFuncList = [{
    match: () => Boolean(location.href.match(/warehouse\/$/)),
    func: this.mainFunc
  }]
  
  async mainFunc() {
    try {
      tools.log("========================================");
      tools.log("warehousePriceCount: 开始执行主函数");
      
      // 获取物品节点列表
      let itemNodeList = document.querySelectorAll(".col-lg-10.col-md-9 > div > div > div > div > div");
      tools.log(`warehousePriceCount: 找到物品节点数量: ${itemNodeList.length}`);
      
      // 获取 realm
      let realm = runtimeData.basisCPT.realm;
      tools.log(`warehousePriceCount: 当前服务器(realm): ${realm}`);
      if (realm === undefined || realm === null) {
        tools.log("warehousePriceCount: ❌ realm 未定义");
        tools.log("========================================");
        return;
      }
      
      // 获取仓库数据
      let warehouseData = indexDBData.basisCPT.warehouse[realm];
      tools.log(`warehousePriceCount: 仓库数据存在: ${!!warehouseData}`);
      tools.log(`warehousePriceCount: 仓库数据长度: ${warehouseData ? warehouseData.length : 0}`);
      
      if (!warehouseData || !Array.isArray(warehouseData)) {
        tools.log("warehousePriceCount: ❌ 仓库数据未加载");
        tools.log("========================================");
        return;
      }
      
      // 构建物品数据映射（按名称+品质分组）
      let itemMap = {};
      for (let i = 0; i < warehouseData.length; i++) {
        let item = warehouseData[i];
        
        // 处理 v3 API：kind 可能是数字或对象
        let itemName = "";
        let itemId = 0;
        if (typeof item.kind === 'object' && item.kind.name) {
          itemName = item.kind.name;
          itemId = item.kind.id || 0;
        } else if (typeof item.kind === 'number') {
          itemName = tools.itemIndex2Name(item.kind);
          itemId = item.kind;
        }
        
        let quality = item.quality || 0;
        let key = `${itemName}_${quality}`;
        
        // 计算合计成本（totalCost 是该品质所有物品的总成本）
        let totalCost = 0;
        if (typeof item.cost === 'object') {
          totalCost = Object.values(item.cost).reduce((acc, curr) => acc + curr, 0);
        } else if (typeof item.cost === 'number') {
          totalCost = item.cost;
        }
        
        // 计算单位成本（合计成本 / 数量）
        let amount = item.amount || 0;
        let unitCost = amount > 0 ? totalCost / amount : 0;
        
        itemMap[key] = {
          name: itemName,
          id: itemId,
          quality: quality,
          amount: amount,
          totalCost: totalCost,      // 合计成本
          unitCost: unitCost         // 单位成本 = 合计成本 / 数量
        };
        
        tools.log(`warehousePriceCount: 处理物品 - name: '${itemName}', quality: ${quality}, amount: ${amount}, totalCost: $${totalCost.toFixed(2)}, unitCost: $${unitCost.toFixed(2)}`);
      }
      
      // 设置悬浮提示（按名称分组，合并显示同一名称的所有品质）
      // 先按名称分组，收集同一名称的所有品质数据
      let nameGroups = {};
      for (let i = 0; i < warehouseData.length; i++) {
        let item = warehouseData[i];
        
        // 获取物品名称
        let itemName = "";
        if (typeof item.kind === 'object' && item.kind.name) {
          itemName = item.kind.name;
        } else if (typeof item.kind === 'number') {
          itemName = tools.itemIndex2Name(item.kind);
        }
        
        if (!itemName) continue;
        
        // 添加到分组
        if (!nameGroups[itemName]) {
          nameGroups[itemName] = [];
        }
        nameGroups[itemName].push(item);
      }
      
      // 为每个名称设置悬浮提示（包含所有品质）
      for (let name in nameGroups) {
        // 找到对应的页面节点
        let targetNode = null;
        for (let j = 0; j < itemNodeList.length; j++) {
          let nodeName = itemNodeList[j].querySelector("b")?.innerText;
          if (nodeName === name) {
            targetNode = itemNodeList[j];
            break;
          }
        }
        
        if (!targetNode) {
          tools.log(`warehousePriceCount: 未找到页面节点 - ${name}`);
          continue;
        }
        
        // 收集该名称所有品质的信息
        let qualities = nameGroups[name];
        let tooltipParts = [];
        let totalAmount = 0;
        let totalMarketValue = 0;
        let totalProfit = 0;
        
        // 按品质排序（从高到低）
        qualities.sort((a, b) => (b.quality || 0) - (a.quality || 0));
        
        // 遍历每种品质
        for (let item of qualities) {
          let quality = item.quality || 0;
          let key = `${name}_${quality}`;
          let itemData = itemMap[key];
          
          if (!itemData) continue;
          
          // 获取该品质的市场价
          let marketPrice = await tools.getMarketPrice(itemData.id, itemData.quality, realm);
          let marketValue = marketPrice * itemData.amount;
          let profit = (marketPrice - itemData.unitCost) * itemData.amount;
          
          // 累加总计
          totalAmount += itemData.amount;
          totalMarketValue += marketValue;
          totalProfit += profit;
          
          // 添加品质信息
          tooltipParts.push(`品质${quality}:`);
          tooltipParts.push(`  成本：$${itemData.unitCost.toFixed(2)}`);
          tooltipParts.push(`  数量：${itemData.amount.toLocaleString()}`);
          tooltipParts.push(`  市场价：$${marketPrice.toFixed(2)}`);
          tooltipParts.push(`  市场价值：$${marketValue.toFixed(2)}`);
          tooltipParts.push(`  利润：${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`);
        }
        
        // 添加总计
        if (qualities.length > 1) {
          tooltipParts.push("---");
          tooltipParts.push(`总计:`);
          tooltipParts.push(`  数量：${totalAmount.toLocaleString()}`);
          tooltipParts.push(`  市场价值：$${totalMarketValue.toFixed(2)}`);
          tooltipParts.push(`  利润：${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`);
        }
        
        // 设置悬浮提示
        let tooltip = tooltipParts.join("\n");
        targetNode.setAttribute("title", tooltip);
        
        tools.log(`warehousePriceCount: 设置悬停提示 - ${name} (${qualities.length}种品质)`);
      }
      
      tools.log("warehousePriceCount: 执行完成");
      tools.log("========================================");
    } catch (error) {
      tools.log("warehousePriceCount: ❌ 发生错误");
      tools.errorLog(error);
      tools.log("========================================");
    }
  }
  
  // 从节点获取品质信息
  getQualityFromNode(node) {
    tools.log(`warehousePriceCount.getQualityFromNode: 开始获取品质`);
    
    // 方法1: 尝试从节点内查找星星图标
    let starElements = node.querySelectorAll("svg");
    tools.log(`warehousePriceCount.getQualityFromNode: 方法1 - 节点内svg数量: ${starElements.length}`);
    if (starElements.length > 0) {
      tools.log(`warehousePriceCount.getQualityFromNode: 返回品质: ${starElements.length}`);
      return starElements.length;
    }
    
    // 方法2: 尝试从父节点查找
    let parentNode = node.parentElement;
    if (parentNode) {
      let stars = parentNode.querySelectorAll("svg");
      tools.log(`warehousePriceCount.getQualityFromNode: 方法2 - 父节点svg数量: ${stars.length}`);
      if (stars.length > 0) {
        tools.log(`warehousePriceCount.getQualityFromNode: 返回品质: ${stars.length}`);
        return stars.length;
      }
    }
    
    // 方法3: 尝试从兄弟节点查找
    let prevSibling = node.previousElementSibling;
    while (prevSibling) {
      let stars = prevSibling.querySelectorAll("svg");
      tools.log(`warehousePriceCount.getQualityFromNode: 方法3 - 兄弟节点svg数量: ${stars.length}`);
      if (stars.length > 0) {
        tools.log(`warehousePriceCount.getQualityFromNode: 返回品质: ${stars.length}`);
        return stars.length;
      }
      prevSibling = prevSibling.previousElementSibling;
    }
    
    // 方法4: 尝试查找包含 star 或 quality 的元素
    let qualityElement = node.querySelector("[class*='star'], [class*='quality'], .badge");
    if (qualityElement) {
      let text = qualityElement.innerText || qualityElement.textContent;
      let match = text.match(/(\d+)/);
      if (match) {
        let quality = parseInt(match[1]);
        tools.log(`warehousePriceCount.getQualityFromNode: 方法4 - 从品质元素获取: ${quality}`);
        return quality;
      }
    }
    
    // 方法5: 尝试向上遍历查找
    let current = node;
    for (let i = 0; i < 5; i++) {
      if (!current) break;
      let stars = current.querySelectorAll("svg");
      if (stars.length > 0) {
        tools.log(`warehousePriceCount.getQualityFromNode: 方法5 - 向上遍历${i}层找到svg数量: ${stars.length}`);
        return stars.length;
      }
      current = current.parentElement;
    }
    
    tools.log(`warehousePriceCount.getQualityFromNode: 所有方法失败，返回默认值 0`);
    return 0;
  }
}
new warehousePriceCount();
