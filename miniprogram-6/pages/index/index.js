// pages/index/index.js
const app = getApp()

Page({
  data: {
    dailyScore: 0,
    proteinScore: 0,
    fatScore: 0,
    fiberScore: 0,
    carbScore: 0,
    currentWeight: '',
    recommendations: []
  },

  onLoad() {
    this.loadTodayData();
  },

  onShow() {
    this.loadTodayData();
  },

  // 加载今日数据 - 修复错误处理
async loadTodayData() {
  try {
    console.log('📊 开始加载今日数据');
    
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/today-stats`,
        method: 'GET',
        data: {
          userId: 1  // 使用固定用户ID
        },
        timeout: 8000,
        success: resolve,
        fail: reject
      });
    });

    console.log('📊 今日数据API响应:', res);

    // 安全检查
    if (res && res.statusCode === 200 && res.data) {
      if (res.data.success) {
        const data = res.data.data || {};
        console.log('✅ 加载今日数据成功:', data);
        this.setData({
          dailyScore: data.dailyScore || 0,
          proteinScore: data.proteinScore || 0,
          fatScore: data.fatScore || 0,
          fiberScore: data.fiberScore || 0,
          carbScore: data.carbScore || 0
        });
      } else {
        console.warn('⚠️ API返回success为false:', res.data.message);
        this.setDefaultScores();
      }
    } else {
      console.error('❌ API响应异常:', res);
      this.setDefaultScores();
    }
  } catch (error) {
    console.error('💥 加载今日数据失败:', error);
    this.setDefaultScores();
  }
},

// 设置默认评分
setDefaultScores() {
  this.setData({
    dailyScore: 0,
    proteinScore: 0,
    fatScore: 0,
    fiberScore: 0,
    carbScore: 0
  });
},
  // 保存体重 - 使用固定用户ID
  async saveWeight() {
    if (!this.data.currentWeight) {
      wx.showToast({
        title: '请输入体重',
        icon: 'none'
      })
      return
    }

    try {
      const res = await wx.request({
        url: `${app.globalData.baseUrl}/api/weight`,
        method: 'POST',
        data: {
          userId: 1,  // 使用固定用户ID
          weight: parseFloat(this.data.currentWeight)
        }
      })

      if (res.data.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('保存体重失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 记录膳食
  recordMeal(e) {
    const mealType = e.currentTarget.dataset.type
    wx.navigateTo({
      url: `/pages/record/record?mealType=${mealType}`
    })
  },
  // 保存体重 - 包含身高关联
async saveWeight() {
  if (!this.data.currentWeight) {
    wx.showToast({
      title: '请输入体重',
      icon: 'none'
    })
    return
  }

  try {
    const userId = wx.getStorageSync('userId') || 1;
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/weight`,
        method: 'POST',
        data: {
          userId: userId,
          weight: parseFloat(this.data.currentWeight)
        },
        success: resolve,
        fail: reject
      })
    })

    if (res.data.success) {
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 显示BMI信息
      if (res.data.data.bmi) {
        setTimeout(() => {
          wx.showModal({
            title: '体重记录成功',
            content: `体重: ${res.data.data.weight}kg\n身高: ${(res.data.data.height * 100).toFixed(1)}cm\nBMI: ${res.data.data.bmi}`,
            showCancel: false
          });
        }, 500);
      }
      
      // 刷新数据
      this.loadTodayData();
    } else {
      // 如果失败可能是因为没有设置身高
      if (res.data.message.includes('身高')) {
        this.showHeightSetting();
      }
    }
  } catch (error) {
    console.error('保存体重失败:', error)
    wx.showToast({
      title: '保存失败',
      icon: 'none'
    })
  }
},

  // 输入体重
  onWeightInput(e) {
    this.setData({
      currentWeight: e.detail.value
    })
  }
})