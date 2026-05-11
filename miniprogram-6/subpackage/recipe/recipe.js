// pages/recipe/recipe.js
const app = getApp()
const auth = require('../../utils/auth')

Page({
  data: {
    recipes: [],
    loading: true
  },

  onLoad(options) {
    console.log('recipe页面参数:', options);
    if (!auth.requireLogin()) return
    this.loadRecipes();
  },

  onShow() {
    if (!auth.requireLogin()) return
    this.loadRecipes();
  },

  // 加载食谱列表
  async loadRecipes() {
    try {
      this.setData({ loading: true });
      
      const userId = auth.getUserId();
      if (!userId) {
        this.setData({ recipes: [], loading: false });
        return;
      }
      
      console.log('🌐 请求食谱列表...');
      
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/recipe`,
          method: 'GET',
          data: { userId: userId },
          timeout: 10000,
          success: resolve,
          fail: reject
        });
      });

      console.log('📦 食谱列表响应:', res);

      if (res.statusCode === 200 && res.data && res.data.success) {
        console.log('✅ 食谱数据加载成功，数量:', res.data.data.length);
        this.setData({
          recipes: res.data.data
        });
      } else {
        console.error('❌ API返回失败:', res.data);
        wx.showToast({
          title: '加载失败: ' + (res.data?.message || '未知错误'),
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('💥 加载食谱失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取餐次文本
  getMealTypeText(mealType) {
    const map = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐',
      'snack': '加餐'
    };
    return map[mealType] || mealType;
  },

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日创建`;
    } catch (error) {
      return '';
    }
  },

  // 使用食谱
  useRecipe(e) {
    if (!auth.getUserId()) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const recipeId = e.currentTarget.dataset.id;
    const mealType = e.currentTarget.dataset.mealType;
    
    if (!recipeId) {
      wx.showToast({
        title: '食谱信息错误',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到记录页面，并传递食谱ID
    wx.navigateTo({
      url: `/pages/record/record?recipeId=${recipeId}&mealType=${mealType}`
    });
  },

  // 删除食谱
  deleteRecipe(e) {
    const recipeId = e.currentTarget.dataset.id;
    const recipeName = e.currentTarget.dataset.name;
    
    if (!recipeId) {
      wx.showToast({
        title: '食谱信息错误',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${recipeName}」吗？`,
      confirmColor: '#ff4757',
      success: async (res) => {
        if (res.confirm) {
          const userId = auth.getUserId();
          if (!userId) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
          }
          try {
            wx.showLoading({ title: '删除中...' });
            
            const deleteRes = await new Promise((resolve, reject) => {
              wx.request({
                url: `${app.globalData.baseUrl}/api/recipe/${recipeId}`,
                method: 'DELETE',
                data: { userId },
                timeout: 8000,
                success: resolve,
                fail: reject
              });
            });

            wx.hideLoading();

            if (deleteRes.data.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 1500
              });
              
              // 重新加载食谱列表
              this.loadRecipes();
            } else {
              throw new Error(deleteRes.data.message);
            }
          } catch (error) {
            console.error('删除食谱失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我的健康食谱',
      path: '/pages/recipe/recipe'
    }
  }
})