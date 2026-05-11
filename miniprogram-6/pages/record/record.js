// pages/record/record.js
const app = getApp()
const auth = require('../../utils/auth')

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
    canSave: false,

    // 拍照识别相关
  showRecognizeModal: false,
  recognizeImagePath: '',
  recognizeResults: [],      // 识别结果列表
  selectedRecognizeIndex: -1
  },

  onLoad(options) {
    if (!auth.getUserId()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.loadTodayRecords()
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
    if (options.recipeId) {
      const rid = parseInt(options.recipeId, 10)
      if (!Number.isNaN(rid)) {
        this.loadRecipeDetails(rid, options.mealType)
      }
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
    console.error('💥 搜索失败:', error)
    this.localSearch(keyword)
    wx.showToast({
      title: '已使用本地食物列表',
      icon: 'none',
      duration: 1500
    })
  } finally {
    this.setData({ loading: false })
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
    const userId = auth.getUserId()
    if (!userId) return
    
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
  wx.showLoading({ title: '加载食谱...' })
  try {
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

    if (res.statusCode === 200 && res.data && res.data.success) {
      const payload = res.data.data
      const rows = Array.isArray(payload) ? payload : (payload.details || [])
      const serverMealType = Array.isArray(payload) ? null : payload.meal_type
      const mealKey = mealType || serverMealType
      if (mealKey) {
        const mealTypeMap = {
          'breakfast': 0,
          'lunch': 1,
          'dinner': 2,
          'snack': 3
        }
        this.setData({
          selectedMealType: mealTypeMap[mealKey] || 0
        })
      }
      const selectedFoods = rows.map(food => ({
        id: food.id,
        name: food.name,
        protein: food.protein,
        fat: food.fat,
        carbohydrate: food.carbohydrate,
        fiber: food.fiber,
        quantity: String(food.quantity != null ? food.quantity : 100)
      }))
      
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
      title: '加载食谱失败: ' + (error.message || ''),
      icon: 'none'
    });
  } finally {
    wx.hideLoading();
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
      const payload = res.data.data
      const rows = Array.isArray(payload) ? payload : (payload.details || [])
      const serverMealType = Array.isArray(payload) ? null : payload.meal_type
      if (serverMealType) {
        const mealTypeMap = {
          'breakfast': 0,
          'lunch': 1,
          'dinner': 2,
          'snack': 3
        }
        this.setData({
          selectedMealType: mealTypeMap[serverMealType] || 0
        })
      }
      const selectedFoods = rows.map(food => ({
        id: food.id,
        name: food.name,
        protein: food.protein,
        fat: food.fat,
        carbohydrate: food.carbohydrate,
        fiber: food.fiber,
        quantity: String(food.quantity != null ? food.quantity : 100)
      }))
      this.setData({
        selectedFoods,
        showRecipeList: false
      })
      this.calculateNutrition()
      this.checkCanSave()
      wx.showToast({
        title: '食谱加载成功',
        icon: 'success'
      })
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

    const userId = auth.getUserId()
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    try {
      const savePromises = this.data.selectedFoods.map(food => {
        return new Promise((resolve, reject) => {
          wx.request({
            url: `${app.globalData.baseUrl}/api/record`,
            method: 'POST',
            data: {
              userId,
              mealType: this.data.selectedMealType,
              foodId: food.id,
              quantity: parseFloat(food.quantity)
            },
            success: resolve,
            fail: reject
          })
        })
      })

      await Promise.all(savePromises)

      if (this.data.saveAsRecipe && this.data.recipeName.trim()) {
        const mealTypeMap = {
          0: 'breakfast',
          1: 'lunch',
          2: 'dinner',
          3: 'snack'
        }
        await new Promise((resolve, reject) => {
          wx.request({
            url: `${app.globalData.baseUrl}/api/recipe`,
            method: 'POST',
            data: {
              userId,
              recipeName: this.data.recipeName,
              mealType: mealTypeMap[this.data.selectedMealType],
              foods: this.data.selectedFoods.map(food => ({
                id: food.id,
                quantity: parseFloat(food.quantity)
              }))
            },
            success: resolve,
            fail: reject
          })
        })
      }

      wx.showToast({
        title: '记录成功',
        icon: 'success'
      })

      this.resetForm()
      this.loadTodayRecords()
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
    const userId = auth.getUserId()
    if (!userId) {
      this.setData({ todayRecords: [] })
      return
    }
    const today = new Date().toISOString().split('T')[0];
    
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/today-records`,
        method: 'GET',
        data: { 
          userId,
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
    const userId = auth.getUserId()
    if (!userId) return
    const res = await wx.request({
      url: `${app.globalData.baseUrl}/api/today-stats`,
      method: 'GET',
      data: { userId }
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
          const userId = auth.getUserId()
          if (!userId) {
            wx.showToast({ title: '请先登录', icon: 'none' })
            return
          }
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
                userId
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
// 拍照识别
async takePhotoForRecognize() {
  const that = this;
  
  wx.showActionSheet({
    itemList: ['拍照', '从相册选择'],
    success: (res) => {
      if (res.tapIndex === 0) {
        that.takePhoto();
      } else if (res.tapIndex === 1) {
        that.chooseImage();
      }
    }
  });
},

// 拍照
takePhoto() {
  const that = this;
  wx.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['camera'],
    camera: 'back',
    success: (res) => {
      const tempFilePath = res.tempFiles[0].tempFilePath;
      that.recognizeFoodImage(tempFilePath);
    }
  });
},

// 从相册选择
chooseImage() {
  const that = this;
  wx.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album'],
    success: (res) => {
      const tempFilePath = res.tempFiles[0].tempFilePath;
      that.recognizeFoodImage(tempFilePath);
    }
  });
},

// 调用识别API
async recognizeFoodImage(imagePath) {
  wx.showLoading({ title: '识别中...', mask: true });
  
  try {
    // 读取图片为base64
    const fs = wx.getFileSystemManager();
    const imageBase64 = fs.readFileSync(imagePath, 'base64');
    
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/food/recognize`,
        method: 'POST',
        data: { imageBase64: `data:image/jpeg;base64,${imageBase64}` },
        timeout: 15000,
        success: resolve,
        fail: reject
      });
    });
    
    wx.hideLoading();
    
    console.log('📋 识别API返回:', res.data);
    
    // 检查是否有识别结果
    if (res.data.success && res.data.data && res.data.data.length > 0) {
      const firstFood = res.data.data[0];
      console.log('🍔 识别到食物:', firstFood);
      
      // 查询营养信息
      const nutritionRes = await new Promise((resolve) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/foods/search-by-name`,
          method: 'POST',
          data: { name: firstFood.name },
          success: resolve,
          fail: () => resolve({ data: { success: false, data: [] } })
        });
      });
      
      console.log('📊 营养查询结果:', nutritionRes.data);
      
      if (nutritionRes.data.success && nutritionRes.data.data.length > 0) {
        const matched = nutritionRes.data.data[0];
        const newFood = {
          id: matched.id,
          name: matched.name,
          protein: matched.protein,
          fat: matched.fat,
          carbohydrate: matched.carbohydrate,
          fiber: matched.fiber,
          quantity: '100'  // 默认100克，用户可手动修改
        };
        
        const selectedFoods = [...this.data.selectedFoods, newFood];
        this.setData({ selectedFoods });
        this.calculateNutrition();
        this.checkCanSave();
        
        wx.showToast({ 
          title: `已添加 ${firstFood.name}`, 
          icon: 'success' 
        });
      } else {
        // 找不到营养信息，让用户手动输入
        wx.showModal({
          title: '手动输入',
          content: `未找到「${firstFood.name}」的营养数据，请手动输入`,
          editable: true,
          placeholderText: '格式：蛋白质,脂肪,碳水 (如: 20,5,30)',
          success: (modalRes) => {
            if (modalRes.confirm && modalRes.content) {
              const parts = modalRes.content.split(',');
              if (parts.length === 3) {
                const newFood = {
                  id: Date.now(),
                  name: firstFood.name,
                  protein: parseFloat(parts[0]),
                  fat: parseFloat(parts[1]),
                  carbohydrate: parseFloat(parts[2]),
                  fiber: 0,
                  quantity: '100'
                };
                
                const selectedFoods = [...this.data.selectedFoods, newFood];
                this.setData({ selectedFoods });
                this.calculateNutrition();
                this.checkCanSave();
                
                wx.showToast({ title: '添加成功', icon: 'success' });
              } else {
                wx.showToast({ title: '格式错误', icon: 'none' });
              }
            }
          }
        });
      }
    } else {
      wx.showToast({
        title: res.data.message || '未识别到食物',
        icon: 'none',
        duration: 2000
      });
    }
  } catch (error) {
    wx.hideLoading();
    console.error('识别失败:', error);
    wx.showToast({
      title: '识别失败，请重试',
      icon: 'none',
      duration: 2000
    });
  }
},

// 显示识别结果让用户选择
async showRecognizeResults(recognizedFoods, imagePath) {
  // 为每个识别结果查询营养信息
  const resultsWithNutrition = [];
  
  for (const food of recognizedFoods) {
    // 根据食物名称查询营养信息
    const nutritionRes = await new Promise((resolve) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/foods/search-by-name`,
        method: 'POST',
        data: { name: food.name },
        success: resolve,
        fail: () => resolve({ data: { success: false, data: [] } })
      });
    });
    
    if (nutritionRes.data.success && nutritionRes.data.data.length > 0) {
      const matchedFood = nutritionRes.data.data[0];
      resultsWithNutrition.push({
        ...food,
        matchedFood: matchedFood,
        hasNutrition: true
      });
    } else {
      resultsWithNutrition.push({
        ...food,
        matchedFood: null,
        hasNutrition: false
      });
    }
  }
  
  // 如果只有一个结果且匹配到营养信息，直接添加
  if (resultsWithNutrition.length === 1 && resultsWithNutrition[0].hasNutrition) {
    const food = resultsWithNutrition[0];
    const matched = food.matchedFood;
    
    const newFood = {
      id: matched.id,
      name: matched.name,
      protein: matched.protein,
      fat: matched.fat,
      carbohydrate: matched.carbohydrate,
      fiber: matched.fiber,
      quantity: '100'  // 默认100克
    };
    
    const selectedFoods = [...this.data.selectedFoods, newFood];
    this.setData({ selectedFoods });
    this.calculateNutrition();
    this.checkCanSave();
    
    wx.showToast({
      title: `已添加 ${food.name}`,
      icon: 'success'
    });
  } else {
    // 多个结果或没有营养信息，弹窗让用户选择
    this.setData({
      showRecognizeModal: true,
      recognizeImagePath: imagePath,
      recognizeResults: resultsWithNutrition,
      selectedRecognizeIndex: -1
    });
  }
},

// 为识别结果补充营养信息
async enrichResultsWithNutrition(results) {
  const enriched = [];
  
  for (const result of results) {
    try {
      const nutritionRes = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/foods/search-by-name`,
          method: 'POST',
          data: { name: result.name },
          success: resolve,
          fail: reject
        });
      });
      
      if (nutritionRes.data.success && nutritionRes.data.data.length > 0) {
        const food = nutritionRes.data.data[0];
        enriched.push({
          ...result,
          matchedFood: food,
          hasNutrition: true
        });
      } else {
        enriched.push({
          ...result,
          matchedFood: null,
          hasNutrition: false
        });
      }
    } catch (error) {
      enriched.push({
        ...result,
        matchedFood: null,
        hasNutrition: false
      });
    }
  }
  
  return enriched;
},

// 选择识别结果
selectRecognizeResult(e) {
  const index = e.currentTarget.dataset.index;
  this.setData({
    selectedRecognizeIndex: index
  });
},

// 确认添加识别结果
confirmAddRecognizeResult() {
  const { selectedRecognizeIndex, recognizeResults } = this.data;
  
  if (selectedRecognizeIndex === -1) {
    wx.showToast({ title: '请选择要添加的食物', icon: 'none' });
    return;
  }
  
  const selected = recognizeResults[selectedRecognizeIndex];
  
  if (selected.hasNutrition && selected.matchedFood) {
    const matched = selected.matchedFood;
    const newFood = {
      id: matched.id,
      name: matched.name,
      protein: matched.protein,
      fat: matched.fat,
      carbohydrate: matched.carbohydrate,
      fiber: matched.fiber,
      quantity: '100'  // 默认100克，用户可以手动修改
    };
    
    const selectedFoods = [...this.data.selectedFoods, newFood];
    this.setData({ selectedFoods });
    this.calculateNutrition();
    this.checkCanSave();
    
    this.closeRecognizeModal();
    wx.showToast({ title: '添加成功', icon: 'success' });
  } else {
    // 没有营养信息，弹出编辑框
    this.showManualEditDialog(selected.name);
  }
},

// 显示手动编辑弹窗
showManualEditDialog(foodName) {
  wx.showModal({
    title: '手动输入营养信息',
    content: `未找到「${foodName}」的营养数据，请手动输入`,
    editable: true,
    placeholderText: '格式：蛋白质,脂肪,碳水 (如: 20,5,30)',
    success: (res) => {
      if (res.confirm && res.content) {
        const parts = res.content.split(',');
        if (parts.length === 3) {
          const newFood = {
            id: Date.now(),
            name: foodName,
            protein: parseFloat(parts[0]),
            fat: parseFloat(parts[1]),
            carbohydrate: parseFloat(parts[2]),
            fiber: 0,
            quantity: '100'
          };
          
          const selectedFoods = [...this.data.selectedFoods, newFood];
          this.setData({ selectedFoods });
          this.calculateNutrition();
          this.checkCanSave();
          
          this.closeRecognizeModal();
          wx.showToast({ title: '添加成功', icon: 'success' });
        } else {
          wx.showToast({ title: '格式错误，请用逗号分隔', icon: 'none' });
        }
      }
    }
  });
},

// 编辑识别结果（手动修改食物名称）
editRecognizeResult() {
  const { selectedRecognizeIndex, recognizeResults } = this.data;
  
  if (selectedRecognizeIndex === -1) {
    wx.showToast({ title: '请先选择要编辑的食物', icon: 'none' });
    return;
  }
  
  const selected = recognizeResults[selectedRecognizeIndex];
  
  wx.showModal({
    title: '编辑食物名称',
    content: selected.name,
    editable: true,
    placeholderText: '输入正确的食物名称',
    success: async (res) => {
      if (res.confirm && res.content) {
        wx.showLoading({ title: '重新查询...' });
        
        try {
          const nutritionRes = await new Promise((resolve, reject) => {
            wx.request({
              url: `${app.globalData.baseUrl}/api/foods/search-by-name`,
              method: 'POST',
              data: { name: res.content },
              success: resolve,
              fail: reject
            });
          });
          
          wx.hideLoading();
          
          if (nutritionRes.data.success && nutritionRes.data.data.length > 0) {
            const food = nutritionRes.data.data[0];
            const updatedResults = [...recognizeResults];
            updatedResults[selectedRecognizeIndex] = {
              ...selected,
              name: res.content,
              matchedFood: food,
              hasNutrition: true
            };
            this.setData({ recognizeResults: updatedResults });
            wx.showToast({ title: '更新成功', icon: 'success' });
          } else {
            // 仍然找不到，允许用户手动输入营养
            this.showManualEditDialog(res.content);
          }
        } catch (error) {
          wx.hideLoading();
          this.showManualEditDialog(res.content);
        }
      }
    }
  });
},

// 关闭识别弹窗
closeRecognizeModal() {
  this.setData({
    showRecognizeModal: false,
    recognizeImagePath: '',
    recognizeResults: [],
    selectedRecognizeIndex: -1
  });
}
});

