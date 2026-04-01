// pages/record/record.js
const app = getApp()

Page({
  data: {
    // 时段选择
    mealTypes: ['早餐', '午餐', '晚餐', '加餐'],
    selectedMealType: 0,
    
    // 食物搜索
    searchKeyword: '',
    searchResults: [],
    showSearchResults: false,
    
    // 已选食物列表
    selectedFoods: [],
    
    // 快速食物推荐
    quickFoods: [
      { id: 20, name: '米饭', protein: 2.6, fat: 0.3, carbohydrate: 25, fiber: 0.4 },
      { id: 653, name: '鸡蛋', protein: 13, fat: 11, carbohydrate: 1.1, fiber: 0 },
      { id: 579, name: '鸡胸肉', protein: 31, fat: 3.6, carbohydrate: 0, fiber: 0 },
      { id: 633, name: '牛奶', protein: 3.3, fat: 3.6, carbohydrate: 5, fiber: 0 },
      { id: 383, name: '香蕉', protein: 1.1, fat: 0.2, carbohydrate: 22, fiber: 2.6 },
      { id: 325, name: '苹果', protein: 0.3, fat: 0.2, carbohydrate: 14, fiber: 2.4 }
    ],

    saveAsRecipe: false,
    recipeName: '',
    showRecipeDialog: false,
    
    // 食谱相关
    userRecipes: [],
    showRecipeList: false,
    
    // 营养汇总
    totalNutrition: {
      protein: 0,
      fat: 0,
      carbohydrate: 0,
      calories: 0
    },
    
    // 今日记录
    todayRecords: [],
    
    // 控制状态
    canSave: false
  },

  onLoad(options) {
    this.loadTodayRecords();
    // 根据传入的mealType设置时段
    if (options.mealType) {
      const mealTypeMap = {
        'breakfast': 0,
        'lunch': 1,
        'dinner': 2,
        'snack': 3
      }
      this.setData({
        selectedMealType: mealTypeMap[options.mealType] || 0
      })
    }
  },

  onShow() {
    this.loadTodayRecords();
  },

  // 选择时段
  selectMealType(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedMealType: index
    });
    this.checkCanSave();
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword,
      showSearchResults: keyword.length > 0
    });

    // 防抖搜索
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    
    this.searchTimer = setTimeout(() => {
      if (keyword.length > 0) {
        this.performSearch(keyword);
      } else {
        this.setData({
          searchResults: [],
          showSearchResults: false
        });
      }
    }, 300);
  },

  // 搜索框获得焦点
  onSearchFocus() {
    if (this.data.searchKeyword.length > 0) {
      this.setData({
        showSearchResults: true
      });
    }
  },

  // 执行搜索
 // 执行搜索 - 添加详细的网络调试
async performSearch(keyword) {
  if (!keyword || keyword.length === 0) {
    this.setData({
      searchResults: [],
      showSearchResults: false
    });
    return;
  }

  try {
    console.log('🔍 开始搜索:', keyword);
    console.log('🌐 完整请求URL:', `${app.globalData.baseUrl}/api/foods/search?keyword=${encodeURIComponent(keyword)}`);
    
    this.setData({ loading: true });

    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/foods/search`,
        method: 'GET',
        data: { keyword: keyword },
        timeout: 8000,
        success: (result) => {
          console.log('✅ 网络请求成功:', result);
          resolve(result);
        },
        fail: (error) => {
          console.error('❌ 网络请求失败:', error);
          reject(error);
        }
      });
    });

    console.log('📦 响应状态:', res.statusCode);
    console.log('📦 响应数据:', res.data);

    if (res.statusCode === 200 && res.data && res.data.success) {
      const results = res.data.data || [];
      console.log('🎯 搜索成功，结果数量:', results.length);
      
      this.setData({
        searchResults: results,
        showSearchResults: true
      });
      
      if (results.length === 0) {
        wx.showToast({
          title: '未找到相关食物',
          icon: 'none'
        });
      }
    } else {
      throw new Error('API返回数据异常');
    }
    
  } catch (error) {
    console.error('💥 搜索失败:', error);
    

    
    wx.showToast({
      title: '使用模拟数据',
      icon: 'none',
      duration: 1500
    });
  } finally {
    this.setData({ loading: false });
  }
},


  // 本地搜索（后备方案）
  localSearch(keyword) {
    const allFoods = [
      { id: 579, name: '鸡胸肉', protein: 31, fat: 3.6, carbohydrate: 0, fiber: 0 },
      { id: 20, name: '米饭', protein: 2.6, fat: 0.3, carbohydrate: 25, fiber: 0.4 },
      { id: 653, name: '鸡蛋', protein: 13, fat: 11, carbohydrate: 1.1, fiber: 0 },
      { id: 633, name: '牛奶', protein: 3.3, fat: 3.6, carbohydrate: 5, fiber: 0 },
      { id: 383, name: '香蕉', protein: 1.1, fat: 0.2, carbohydrate: 22, fiber: 2.6 },
      { id: 892, name: '西兰花', protein: 2.8, fat: 0.4, carbohydrate: 5, fiber: 2.6 },
      { id: 462, name: '牛肉', protein: 26, fat: 15, carbohydrate: 0, fiber: 0 },
      { id: 525, name: '猪肉', protein: 27, fat: 13, carbohydrate: 0, fiber: 0 },
      { id: 70, name: '燕麦', protein: 13, fat: 6.7, carbohydrate: 66, fiber: 10.6 },
      { id: 10, name: '三文鱼', protein: 20, fat: 13, carbohydrate: 0, fiber: 0 },
      { id: 11, name: '花卷', protein: 6.0, fat: 1.0, carbohydrate: 45, fiber: 1.5 },
      { id: 12, name: '馒头', protein: 7.0, fat: 1.2, carbohydrate: 48, fiber: 1.8 },
      { id: 13, name: '面条', protein: 8.0, fat: 1.0, carbohydrate: 50, fiber: 1.2 }
    ];

    const results = allFoods.filter(food => 
      food.name.includes(keyword)
    );
    
    this.setData({
      searchResults: results
    });
  },

  // 选择食物
  selectFood(e) {
    const food = e.currentTarget.dataset.item;
    
    // 检查是否已选择
    const isAlreadySelected = this.data.selectedFoods.some(item => item.id === food.id);
    if (isAlreadySelected) {
      wx.showToast({
        title: '已选择该食物',
        icon: 'none'
      });
      return;
    }

    // 添加到已选食物列表，默认克重100g
    const newFood = {
      ...food,
      quantity: '100'
    };

    const selectedFoods = [...this.data.selectedFoods, newFood];
    
    this.setData({
      selectedFoods: selectedFoods,
      searchKeyword: '',
      searchResults: [],
      showSearchResults: false
    });

    this.calculateNutrition();
    this.checkCanSave();
  },

  // 选择快速食物
  selectQuickFood(e) {
    this.selectFood(e);
  },

  // 输入克重
  onQuantityInput(e) {
    const index = e.currentTarget.dataset.index;
    const quantity = e.detail.value;
    
    const selectedFoods = this.data.selectedFoods.map((item, i) => {
      if (i === index) {
        return { ...item, quantity: quantity };
      }
      return item;
    });

    this.setData({
      selectedFoods: selectedFoods
    });

    this.calculateNutrition();
    this.checkCanSave();
  },

// 切换保存为食谱
toggleSaveAsRecipe() {
  this.setData({
    saveAsRecipe: !this.data.saveAsRecipe
  });
},

// 输入食谱名称
onRecipeNameInput(e) {
  this.setData({
    recipeName: e.detail.value
  });
},

// 显示食谱列表
showRecipeList() {
  this.loadUserRecipes();
  this.setData({
    showRecipeList: true
  });
},

// 隐藏食谱列表
hideRecipeList() {
  this.setData({
    showRecipeList: false
  });
},

// 加载用户食谱
async loadUserRecipes() {
  try {
    const userId = wx.getStorageSync('userId') || 1;
    
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/recipes`,
        method: 'GET',
        data: { userId: userId },
        success: resolve,
        fail: reject
      });
    });

    if (res.data.success) {
      this.setData({
        userRecipes: res.data.data
      });
    }
  } catch (error) {
    console.error('加载食谱列表失败:', error);
  }
},
async loadRecipeDetails(recipeId, mealType) {
  try {
    wx.showLoading({ title: '加载食谱...' });
    
    console.log('🌐 请求食谱详情:', recipeId);
    
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/recipe/${recipeId}`,
        method: 'GET',
        timeout: 8000,
        success: resolve,
        fail: reject
      });
    });

    wx.hideLoading();

    if (res.statusCode === 200 && res.data && res.data.success) {
      const recipeDetails = res.data.data;
      console.log('✅ 食谱详情数据:', recipeDetails);
      
      // 设置时段
      if (mealType) {
        const mealTypeMap = {
          'breakfast': 0,
          'lunch': 1,
          'dinner': 2,
          'snack': 3
        };
        this.setData({
          selectedMealType: mealTypeMap[mealType] || 0
        });
      }
      
      // 填充食物列表
      const selectedFoods = recipeDetails.map(food => ({
        ...food,
        quantity: food.quantity.toString()
      }));
      
      this.setData({
        selectedFoods: selectedFoods,
        showRecipeList: false
      });
      
      this.calculateNutrition();
      this.checkCanSave();
      
      wx.showToast({
        title: '食谱加载成功',
        icon: 'success',
        duration: 1500
      });
    } else {
      throw new Error(res.data?.message || 'API返回数据异常');
    }
  } catch (error) {
    console.error('💥 加载食谱详情失败:', error);
    wx.showToast({
      title: '加载食谱失败: ' + error.message,
      icon: 'none'
    });
  }
},
// 选择食谱
async selectRecipe(e) {
  const recipeId = e.currentTarget.dataset.id;
  
  try {
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/recipe/${recipeId}`,
        method: 'GET',
        success: resolve,
        fail: reject
      });
    });

    if (res.data.success) {
      // 将食谱食物添加到已选食物列表
      const selectedFoods = res.data.data.map(food => ({
        ...food,
        quantity: food.quantity.toString()
      }));
      
      this.setData({
        selectedFoods: selectedFoods,
        showRecipeList: false
      });
      
      this.calculateNutrition();
      this.checkCanSave();
      
      wx.showToast({
        title: '食谱加载成功',
        icon: 'success'
      });
    }
  } catch (error) {
    console.error('加载食谱详情失败:', error);
    wx.showToast({
      title: '加载食谱失败',
      icon: 'none'
    });
  }
},

  // 移除食物
  removeFood(e) {
    const index = e.currentTarget.dataset.index;
    const selectedFoods = [...this.data.selectedFoods];
    selectedFoods.splice(index, 1);
    
    this.setData({
      selectedFoods: selectedFoods
    });

    this.calculateNutrition();
    this.checkCanSave();
  },

  // 计算营养汇总
  calculateNutrition() {
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbohydrate = 0;

    this.data.selectedFoods.forEach(food => {
      const quantity = parseFloat(food.quantity) || 0;
      const ratio = quantity / 100;
      
      totalProtein += (food.protein || 0) * ratio;
      totalFat += (food.fat || 0) * ratio;
      totalCarbohydrate += (food.carbohydrate || 0) * ratio;
    });

    // 计算热量（1g蛋白质=4kcal, 1g脂肪=9kcal, 1g碳水=4kcal）
    const totalCalories = totalProtein * 4 + totalFat * 9 + totalCarbohydrate * 4;

    this.setData({
      totalNutrition: {
        protein: totalProtein.toFixed(1),
        fat: totalFat.toFixed(1),
        carbohydrate: totalCarbohydrate.toFixed(1),
        calories: Math.round(totalCalories)
      }
    });
  },

  // 检查是否可以保存
  checkCanSave() {
    const canSave = this.data.selectedFoods.length > 0 && 
                   this.data.selectedFoods.every(food => food.quantity && parseFloat(food.quantity) > 0);
    
    this.setData({
      canSave: canSave
    });
  },

  // 保存记录
  async saveRecord() {
    if (!this.data.canSave) {
      wx.showToast({
        title: '请完善食物信息',
        icon: 'none'
      });
      return;
    }
  
    try {
      // 保存膳食记录
      const savePromises = this.data.selectedFoods.map(food => {
        return wx.request({
          url: `${app.globalData.baseUrl}/api/record`,
          method: 'POST',
          data: {
            userId: 1,
            mealType: this.data.selectedMealType,
            foodId: food.id,
            quantity: parseFloat(food.quantity)
          }
        });
      });
  
      await Promise.all(savePromises);
  
      // 如果选择保存为食谱
      if (this.data.saveAsRecipe && this.data.recipeName.trim()) {
        const mealTypeMap = {
          0: 'breakfast',
          1: 'lunch', 
          2: 'dinner',
          3: 'snack'
        };
        
        await wx.request({
          url: `${app.globalData.baseUrl}/api/recipe`,
          method: 'POST',
          data: {
            userId: 1,
            recipeName: this.data.recipeName,
            mealType: mealTypeMap[this.data.selectedMealType],
            foods: this.data.selectedFoods.map(food => ({
              id: food.id,
              quantity: parseFloat(food.quantity)
            }))
          }
        });
      }
  
      wx.showToast({
        title: '记录成功',
        icon: 'success'
      });
  
      // 重置表单
      this.resetForm();
  
      // 重新加载今日记录
      this.loadTodayRecords();
  
    } catch (error) {
      console.error('保存记录失败:', error);
      wx.showToast({
        title: '记录失败',
        icon: 'none'
      });
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      selectedFoods: [],
      searchKeyword: '',
      searchResults: [],
      showSearchResults: false,
      totalNutrition: {
        protein: 0,
        fat: 0,
        carbohydrate: 0,
        calories: 0
      },
      canSave: false
    });
  },

// 在 loadTodayRecords 中优化数据格式化
async loadTodayRecords() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/today-records`,
        method: 'GET',
        data: { 
          userId: 1,
          date: today
        },
        timeout: 8000,
        success: resolve,
        fail: reject
      });
    });

    if (res && res.statusCode === 200 && res.data) {
      if (res.data.success) {
        const records = res.data.data || [];
        
        // 优化数据格式化
        const formattedRecords = this.formatRecords(records);
        
        this.setData({
          todayRecords: formattedRecords
        });
      }
    }
  } catch (error) {
    console.error('加载今日记录失败:', error);
    this.setDefaultTodayRecords();
  }
},

// 新增：优化记录格式化函数
formatRecords(records) {
  if (!records || !Array.isArray(records)) {
    return [];
  }
  
  return records.map(record => {
    const mealTypeMap = {
      'breakfast': '早餐',
      'lunch': '午餐', 
      'dinner': '晚餐',
      'snack': '加餐'
    };
    
    // 格式化时间（只显示时分）
    let displayTime = '--:--';
    if (record.created_at) {
      try {
        const date = new Date(record.created_at);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        displayTime = `${hours}:${minutes}`;
      } catch (error) {
        console.error('时间格式化错误:', error);
      }
    }
    
    // 简化食物名称（去掉括号内容）
    let displayFoodName = record.food_name;
    if (displayFoodName && displayFoodName.includes('（')) {
      displayFoodName = displayFoodName.split('（')[0];
    }
    
    // 处理数量显示
    const quantity = parseFloat(record.quantity) || 0;
    const displayQuantity = quantity === 100 ? '' : `${quantity}g`;
    
    return {
      id: record.id,
      mealType: mealTypeMap[record.meal_type] || record.meal_type,
      foodName: displayFoodName,
      quantity: displayQuantity,
      time: displayTime,
      totalCalories: Math.round(record.calories || 0)
    };
  });
},
// 新增：加载今日统计数据（用于删除后更新）
async loadTodayStats() {
  try {
    const res = await wx.request({
      url: `${app.globalData.baseUrl}/api/today-stats`,
      method: 'GET',
      data: { userId: 1 }
    });

    if (res.data && res.data.success) {
      const data = res.data.data || {};
      // 可以在这里更新首页的评分显示
      console.log('📊 删除后统计数据:', data);
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
},

  // 删除记录
// 删除记录 - 修复响应处理
async removeRecord(e) {
  const recordId = e.currentTarget.dataset.id;
  
  if (!recordId) {
    console.error('❌ 删除记录ID为空');
    return;
  }

  const recordToDelete = this.data.todayRecords.find(record => record.id == recordId);
  const foodName = recordToDelete ? recordToDelete.foodName : '该记录';
  
  wx.showModal({
    title: '确认删除',
    content: `确定要删除「${foodName}」的记录吗？`,
    confirmColor: '#ff4757',
    success: async (res) => {
      if (res.confirm) {
        try {
          console.log('🗑️ 开始删除记录:', recordId);
          
          wx.showLoading({
            title: '删除中...',
            mask: true
          });

          const deleteRes = await new Promise((resolve, reject) => {
            wx.request({
              url: `${app.globalData.baseUrl}/api/record/${recordId}`,
              method: 'DELETE',
              header: {
                'content-type': 'application/json'
              },
              data: {
                userId: 1
              },
              timeout: 8000,
              success: (result) => {
                console.log('🗑️ 删除请求成功:', result);
                resolve(result);
              },
              fail: (error) => {
                console.error('🗑️ 删除请求失败:', error);
                reject(error);
              }
            });
          });

          console.log('🗑️ 删除API响应:', deleteRes);

          // 简化响应检查逻辑
          if (deleteRes.statusCode === 200) {
            // 无论后端返回什么，只要状态码是200就认为成功
            const todayRecords = this.data.todayRecords.filter(record => record.id != recordId);
            this.setData({ todayRecords });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 1500
            });
            
            console.log('✅ 前端列表已更新，剩余记录:', todayRecords.length);
          } else {
            throw new Error(`HTTP ${deleteRes.statusCode}`);
          }
        } catch (error) {
          console.error('🗑️ 删除过程异常:', error);
          wx.showToast({
            title: '删除失败，请重试',
            icon: 'none',
            duration: 2000
          });
        } finally {
          wx.hideLoading();
        }
      }
    }
  });
},
});

