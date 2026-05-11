// pages/index/index.js
const app = getApp()
const auth = require('../../utils/auth')

Page({
  data: {
    dailyScore: 0,
    proteinScore: 0,
    fatScore: 0,
    fiberScore: 0,
    carbScore: 0,
    currentWeight: '',
    recommendations: [],
    
    // 扣分详情数据
    scoreDetails: {
      protein: { value: 0, deduction: 0, status: '', reason: '', name: '蛋白质', unit: 'g', min: 50, max: 70, optimal: 60 },
      fat: { value: 0, deduction: 0, status: '', reason: '', name: '脂肪', unit: 'g', min: 45, max: 65, optimal: 55 },
      fiber: { value: 0, deduction: 0, status: '', reason: '', name: '膳食纤维', unit: 'g', min: 20, max: 30, optimal: 25 },
      carb: { value: 0, deduction: 0, status: '', reason: '', name: '碳水化物', unit: 'g', min: 250, max: 350, optimal: 300 }
    },
    showDetail: false,
    currentNutrient: '',
    detailName: '',
    detailValue: 0,
    detailUnit: '',
    detailMin: 0,
    detailMax: 0,
    detailOptimal: 0,
    detailDeduction: 0,
    detailReason: '',
    detailIcon: '',
    
    // 推荐菜谱
    recipes: [
      { name: '西红柿炒鸡蛋', img: '/image/food/food1.png' },
      { name: '红烧排骨', img: '/image/food/food4.png' },
      { name: '芹菜炒牛肉', img: '/image/food/food2.png' },
      { name: '香炒大虾', img: '/image/food/food3.png' }
    ]
  },

  onLoad() {
    if (!auth.requireLogin()) return
    this.loadTodayData()
  },

  onShow() {
    if (!auth.requireLogin()) return
    this.loadTodayData()
  },

  async loadTodayData() {
    try {
      const userId = auth.getUserId()
      if (!userId) return

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/today-stats`,
          method: 'GET',
          data: { userId },
          timeout: 8000,
          success: resolve,
          fail: reject
        })
      })

      if (res && res.statusCode === 200 && res.data && res.data.success) {
        const data = res.data.data || {}
        const totals = data.totals || {}
        
        // 计算扣分详情
        const scoreDetails = this.calculateScoreDetails(
          data.proteinScore || 0,
          data.fatScore || 0,
          data.fiberScore || 0,
          data.carbScore || 0,
          totals
        )
        
        this.setData({
          dailyScore: data.dailyScore || 0,
          proteinScore: data.proteinScore || 0,
          fatScore: data.fatScore || 0,
          fiberScore: data.fiberScore || 0,
          carbScore: data.carbScore || 0,
          scoreDetails: scoreDetails
        })
      } else {
        this.setDefaultScores()
      }
    } catch (error) {
      console.error('加载今日数据失败:', error)
      this.setDefaultScores()
    }
  },

  // 计算扣分详情
  calculateScoreDetails(proteinScore, fatScore, fiberScore, carbScore, totals) {
    const standards = {
      protein: { min: 50, max: 70, optimal: 60, name: '蛋白质', unit: 'g' },
      fat: { min: 45, max: 65, optimal: 55, name: '脂肪', unit: 'g' },
      fiber: { min: 20, max: 30, optimal: 25, name: '膳食纤维', unit: 'g' },
      carb: { min: 250, max: 350, optimal: 300, name: '碳水化物', unit: 'g' }
    }
    
    const scores = { protein: proteinScore, fat: fatScore, fiber: fiberScore, carb: carbScore }
    const result = {}
    
    for (let key of ['protein', 'fat', 'fiber', 'carb']) {
      const standard = standards[key]
      const score = scores[key]
      const actualValue = totals[key] || 0
      
      let status = '', reason = '', deduction = 0
      
      if (actualValue === 0) {
        status = 'none'
        reason = `未摄入${standard.name}`
        deduction = 100 - score
      } else if (actualValue < standard.min) {
        const deficit = Math.round(standard.min - actualValue)
        status = 'deficit'
        reason = `${standard.name}摄入不足，缺少${deficit}${standard.unit}`
        deduction = 80 - score
      } else if (actualValue >= standard.min && actualValue <= standard.max) {
        if (Math.abs(actualValue - standard.optimal) <= 10) {
          status = 'perfect'
          reason = `${standard.name}摄入理想`
          deduction = 0
        } else {
          const deviation = actualValue > standard.optimal ? '偏高' : '偏低'
          status = 'good'
          reason = `${standard.name}摄入${deviation}，但仍在健康范围内`
          deduction = 100 - score
        }
      } else if (actualValue > standard.max) {
        const excess = Math.round(actualValue - standard.max)
        status = 'excess'
        reason = `${standard.name}摄入过多，超出${excess}${standard.unit}`
        deduction = 100 - score
      }
      
      result[key] = {
        value: actualValue,
        score: score,
        deduction: deduction,
        status: status,
        reason: reason,
        name: standard.name,
        unit: standard.unit,
        min: standard.min,
        max: standard.max,
        optimal: standard.optimal
      }
    }
    
    return result
  },

  // 点击查看详情
  toggleDetail(e) {
    const nutrient = e.currentTarget.dataset.nutrient
    const details = this.data.scoreDetails[nutrient]
    
    if (this.data.currentNutrient === nutrient && this.data.showDetail) {
      this.setData({ showDetail: false, currentNutrient: '' })
    } else {
      const icons = { protein: '🥩', fat: '🥑', fiber: '🌿', carb: '🍚' }
      
      this.setData({
        showDetail: true,
        currentNutrient: nutrient,
        detailName: details.name,
        detailValue: details.value,
        detailUnit: details.unit,
        detailMin: details.min,
        detailMax: details.max,
        detailOptimal: details.optimal,
        detailDeduction: details.deduction,
        detailReason: details.reason,
        detailIcon: icons[nutrient]
      })
    }
  },

  setDefaultScores() {
    this.setData({
      dailyScore: 0,
      proteinScore: 0,
      fatScore: 0,
      fiberScore: 0,
      carbScore: 0
    })
  },


goToRecord() {
  wx.switchTab({
    url: '/pages/record/record',
    fail: (err) => {
      console.error('跳转失败:', err)
      wx.showToast({
        title: '页面不存在',
        icon: 'none'
      })
    }
  })
},
goToRecipes() {
  wx.navigateTo({
    url: '/pages/recipe/recipe',
    fail: (err) => {
      console.error('跳转失败:', err)
      wx.showToast({
        title: '页面不存在',
        icon: 'none'
      })
    }
  })
},

  showHeightSetting() {
    wx.showModal({
      title: '设置身高',
      content: '请先设置您的身高信息，以便计算BMI',
      editable: true,
      placeholderText: '请输入身高(cm)',
      success: (res) => {
        if (res.confirm && res.content) {
          const height = parseFloat(res.content)
          if (height > 100 && height < 250) {
            const userId = auth.getUserId()
            if (!userId) {
              wx.showToast({ title: '请先登录', icon: 'none' })
              return
            }
            wx.request({
              url: `${app.globalData.baseUrl}/api/user/height`,
              method: 'POST',
              data: { userId, height: height / 100 },
              success: (r) => {
                if (r.data && r.data.success) {
                  wx.showToast({ title: '身高设置成功', icon: 'success' })
                } else {
                  wx.showToast({
                    title: (r.data && r.data.message) || '设置失败',
                    icon: 'none'
                  })
                }
              },
              fail: () => wx.showToast({ title: '网络错误', icon: 'none' })
            })
          } else {
            wx.showToast({
              title: '请输入有效身高(100-250cm)',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  async saveWeight() {
    if (!this.data.currentWeight) {
      wx.showToast({
        title: '请输入体重',
        icon: 'none'
      })
      return
    }

    const userId = auth.getUserId()
    if (!userId) return

    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/weight`,
          method: 'POST',
          data: {
            userId,
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
        })

        if (res.data.data && res.data.data.bmi) {
          setTimeout(() => {
            wx.showModal({
              title: '体重记录成功',
              content: `体重: ${res.data.data.weight}kg\n身高: ${(res.data.data.height * 100).toFixed(1)}cm\nBMI: ${res.data.data.bmi}`,
              showCancel: false
            })
          }, 500)
        }

        this.loadTodayData()
      } else {
        const msg = (res.data && res.data.message) || ''
        if (msg.includes('身高')) {
          this.showHeightSetting()
        } else {
          wx.showToast({ title: msg || '保存失败', icon: 'none' })
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

  recordMeal(e) {
    const mealType = e.currentTarget.dataset.type
    if (!auth.requireLogin()) return
    wx.navigateTo({
      url: `/pages/record/record?mealType=${mealType}`
    })
  },

  onWeightInput(e) {
    this.setData({
      currentWeight: e.detail.value
    })
  }
})