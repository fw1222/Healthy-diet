// pages/my/my.js
const app = getApp()
const auth = require('../../utils/auth')

Page({
  data: {
    currentPage: 'main',
    userInfo: {},
    hasUserInfo: false,
    currentBMI: null,
    continuousDays: 0,
    
    // 历史记录相关
    selectedDate: '',
    historyRecords: [],
    
    // 健康之旅相关
    chartRange: 'month',
    currentChart: 'diet',
    dietStats: {},
    bmiStats: {},
    healthAdvice: '',
    
    // 图表数据
    dietChartData: {
      dates: [],
      scores: []
    },
    bmiChartData: {
      dates: [],
      bmis: []
    }
  },

  onLoad() {
    if (!auth.requireLogin()) return
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    this.setData({
      selectedDate: `${currentYear}-${currentMonth}`
    });
    this.refreshUserState();
  },

  onShow() {
    if (!auth.requireLogin()) return
    this.refreshUserState();
    if (this.data.currentPage === 'history' && this.data.hasUserInfo) {
      this.loadHistoryRecords()
    } else if (this.data.currentPage === 'healthJourney' && this.data.hasUserInfo) {
      this.loadChartData()
    }
  },

  refreshUserState() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const userId = auth.getUserId()
    this.setData({
      hasUserInfo: !!userId,
      userInfo: userId ? userInfo : {}
    })
    if (userId) {
      this.loadHealthData()
    } else {
      this.setData({
        currentBMI: null,
        continuousDays: 0
      })
    }
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },
   // 加载用户健康数据 - 包含身高信息
async loadHealthData() {
  try {
    const userId = auth.getUserId()
    if (!userId) return
    
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/user/stats`,
        method: 'GET',
        data: { userId: userId },
        success: resolve,
        fail: reject
      })
    });

    if (res.data.success) {
      console.log('健康数据:', res.data.data);
      this.setData({
        currentBMI: res.data.data.currentBMI,
        currentWeight: res.data.data.currentWeight,
        currentHeight: res.data.data.currentHeight,
        continuousDays: res.data.data.continuousDays
      });
      
      // 如果没有身高信息，提示用户设置
      if (!res.data.data.currentHeight) {
        this.showHeightSetting();
      }
    } else {
      console.error('获取健康数据失败:', res.data.message);
      this.setDefaultData();
    }
  } catch (error) {
    console.error('加载健康数据失败:', error);
    this.setDefaultData();
  }
},

// 显示身高设置弹窗
showHeightSetting() {
  wx.showModal({
    title: '设置身高',
    content: '请先设置您的身高信息，以便计算BMI',
    editable: true,
    placeholderText: '请输入身高(cm)',
    success: (res) => {
      if (res.confirm && res.content) {
        const height = parseFloat(res.content);
        if (height && height > 100 && height < 250) {
          this.updateUserHeight(height);
        } else {
          wx.showToast({
            title: '请输入有效身高(100-250cm)',
            icon: 'none'
          });
          this.showHeightSetting(); // 重新显示
        }
      }
    }
  });
},
// 更新用户身高
async updateUserHeight(height) {
  try {
    const userId = auth.getUserId()
    if (!userId) return
    
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/user/height`,
        method: 'POST',
        data: {
          userId: userId,
          height: height / 100 // 转换为米
        },
        success: resolve,
        fail: reject
      })
    });

    if (res.data.success) {
      wx.showToast({
        title: '身高设置成功',
        icon: 'success'
      });
      // 重新加载数据
      this.loadHealthData();
    } else {
      throw new Error(res.data.message);
    }
  } catch (error) {
    console.error('更新身高失败:', error);
    wx.showToast({
      title: '设置失败',
      icon: 'none'
    });
  }
},
// 页面切换
switchPage(e) {
  const page = e.currentTarget.dataset.page
  this.setData({ currentPage: page })
  
  if (page === 'history') {
    this.loadHistoryRecords()
  } else if (page === 'healthJourney') {
    this.loadChartData()
  }
},

// 导航到历史记录
navigateToHistory() {
  if (!auth.getUserId()) {
    this.goToLogin()
    return
  }
  this.setData({ currentPage: 'history' })
  this.loadHistoryRecords()
},

// 导航到健康之旅
navigateToHealthJourney() {
  if (!auth.getUserId()) {
    this.goToLogin()
    return
  }
  this.setData({ currentPage: 'healthJourney' })
  this.loadChartData()
},


  // 加载用户信息
  async loadUserInfo() {
    try {
      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo') || {}
      
      // 如果没有用户信息，尝试获取
      if (!userInfo.nickName) {
        const loginRes = await this.getUserProfile()
        if (loginRes) {
          this.setData({ userInfo: loginRes })
          wx.setStorageSync('userInfo', loginRes)
        }
      } else {
        this.setData({ userInfo })
      }
      
      // 加载健康数据
      await this.loadUserHealthData()
      
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 获取用户授权信息
  getUserProfile() {
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于完善会员资料',
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: () => {
          // 如果用户拒绝授权，使用默认信息
          resolve({
            nickName: '微信用户',
            avatarUrl: '/images/default-avatar.png'
          })
        }
      })
    })
  },

  // 加载用户健康数据
  async loadUserHealthData() {
    try {
      const userId = auth.getUserId()
      if (!userId) {
        return;
      }

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/user/stats`,
          method: 'GET',
          data: {
            userId: userId
          },
          success: resolve,
          fail: reject
        })
      });

      if (res.data.success) {
        this.setData({
          currentBMI: res.data.data.currentBMI,
          continuousDays: res.data.data.continuousDays
        })
      } else {
        console.error('获取健康数据失败:', res.data.message);
        // 使用默认数据
        this.setData({
          currentBMI: 21.5,
          continuousDays: 0
        });
      }
    } catch (error) {
      console.error('加载健康数据失败:', error);
      // 使用默认数据
      this.setData({
        currentBMI: 21.5,
        continuousDays: 0
      });
    }
  },

  

  // 加载历史记录 - 改进错误处理
async loadHistoryRecords() {
  try {
    wx.showLoading({
      title: '加载中...',
    });

    const userId = auth.getUserId()
    if (!userId) {
      wx.hideLoading()
      return
    }

    console.log('加载历史记录:', {
      userId: userId,
      date: this.data.selectedDate
    });

    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/history-records`,
        method: 'GET',
        data: {
          userId: userId,
          date: this.data.selectedDate
        },
        success: resolve,
        fail: reject
      })
    });

    wx.hideLoading();

    if (res.data.success) {
      console.log('历史记录数据:', res.data.data);
      
      // 处理日期显示格式
      const records = res.data.data.map(record => {
        try {
          const dateObj = new Date(record.date);
          return {
            ...record,
            day: dateObj.getDate(),
            week: this.getWeekDay(dateObj.getDay()),
            // 确保数值类型正确
            score: parseInt(record.score) || 0,
            mealCount: parseInt(record.mealCount) || 0,
            totalCalories: parseInt(record.totalCalories) || 0,
            protein: parseInt(record.protein) || 0,
            fat: parseInt(record.fat) || 0,
            carbs: parseInt(record.carbs) || 0
          };
        } catch (error) {
          console.error('处理记录日期错误:', error, record);
          return {
            ...record,
            day: '--',
            week: '--',
            score: 0,
            mealCount: 0,
            totalCalories: 0,
            protein: 0,
            fat: 0,
            carbs: 0
          };
        }
      });
      
      this.setData({ 
        historyRecords: records 
      });
      
      if (records.length === 0) {
        wx.showToast({
          title: '该月份暂无记录',
          icon: 'none',
          duration: 2000
        });
      }
    } else {
      console.error('获取历史记录失败:', res.data.message);
      wx.showToast({
        title: '加载失败: ' + (res.data.message || '未知错误'),
        icon: 'none',
        duration: 3000
      });
      this.setData({ historyRecords: [] });
    }
  } catch (error) {
    wx.hideLoading();
    console.error('加载历史记录失败:', error);
    wx.showToast({
      title: '网络错误，请重试',
      icon: 'none',
      duration: 3000
    });
    this.setData({ historyRecords: [] });
  }
},
 // 获取星期几
getWeekDay(day) {
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekDays[day] || '--';
},

// 日期变化处理
onDateChange(e) {
  const dateValue = e.detail.value;
  console.log('日期选择:', dateValue);
  
  // 将 "2025-11" 格式转换为 "2025-11"（保持不变）
  // 或者如果是 "2025年11月" 格式，转换为 "2025-11"
  let formattedDate = dateValue;
  if (dateValue.includes('年') && dateValue.includes('月')) {
    formattedDate = dateValue.replace('年', '-').replace('月', '');
  }
  
  this.setData({
    selectedDate: formattedDate
  });
  
  console.log('加载历史记录，日期:', formattedDate);
  this.loadHistoryRecords();
},

  // 获取评分样式类
  getScoreClass(score) {
    if (score >= 90) return 'excellent'
    if (score >= 80) return 'good'
    if (score >= 60) return 'average'
    return 'poor'
  },

  // 查看日期详情 - 跳转到新页面
  viewDayDetail(e) {
    const date = e.currentTarget.dataset.date
    
    // 从历史记录中查找对应日期的详情
    const record = this.data.historyRecords.find(item => item.date === date)
    if (!record) {
      wx.showToast({
        title: '未找到记录',
        icon: 'none'
      })
      return
    }
    
    // 跳转到详情页面
    wx.navigateTo({
      url: `/pages/record-detail/record-detail?date=${date}&score=${record.score}&mealCount=${record.mealCount}&totalCalories=${record.totalCalories}&protein=${record.protein}&fat=${record.fat}&carbs=${record.carbs}`
    })
  },

  // 切换图表范围
  changeChartRange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ chartRange: range })
    this.loadChartData()
  },

  // 切换图表类型
  switchChart(e) {
    const chart = e.currentTarget.dataset.chart
    this.setData({ currentChart: chart })
    
    // 延迟绘制图表，确保canvas已经渲染
    setTimeout(() => {
      this.loadChartData()
    }, 100)
  },

  // 加载图表数据
  async loadChartData() {
    try {
      if (this.data.currentChart === 'diet') {
        await this.loadDietChartData()
      } else {
        await this.loadBMIChartData()
      }
      
      this.generateHealthAdvice()
    } catch (error) {
      console.error('加载图表数据失败:', error)
    }
  },

  // 加载膳食评分图表数据
  async loadDietChartData() {
    try {
      const userId = auth.getUserId()
      if (!userId) return

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/diet-trend`,
          method: 'GET',
          data: { userId, days: 30 },
          timeout: 15000,
          success: resolve,
          fail: reject
        })
      })

      const list = (res.data && res.data.success && res.data.data) ? res.data.data : []
      const dates = list.map((item) => {
        const d = String(item.date).split('T')[0]
        const parts = d.split('-')
        return parts.length >= 3 ? `${parseInt(parts[2], 10)}日` : d
      })
      const scores = list.map((item) => item.dailyScore || 0)

      const stats = {
        avgScore: scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
        maxScore: scores.length ? Math.max(...scores) : 0,
        trend: this.calculateTrend(scores)
      }

      this.setData({
        dietStats: stats,
        dietChartData: {
          dates,
          scores
        }
      })

      this.drawDietChart(dates, scores)
    } catch (error) {
      console.error('加载膳食图表数据失败:', error)
      this.setData({
        dietStats: { avgScore: 0, maxScore: 0, trend: 0 },
        dietChartData: { dates: [], scores: [] }
      })
    }
  },

  // 加载BMI图表数据
  async loadBMIChartData() {
    try {
      const userId = auth.getUserId()
      if (!userId) return

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/weight-records`,
          method: 'GET',
          data: { userId, limit: 30 },
          timeout: 15000,
          success: resolve,
          fail: reject
        })
      })

      const raw = (res.data && res.data.success && res.data.data) ? res.data.data.slice() : []
      raw.reverse()

      const dates = []
      const bmis = []
      raw.forEach((row) => {
        const v = row.bmi != null ? parseFloat(row.bmi) : NaN
        if (Number.isNaN(v)) return
        const d = row.record_date
        const s = d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0]
        const parts = s.split('-')
        dates.push(parts.length >= 3 ? `${parseInt(parts[2], 10)}日` : s)
        bmis.push(v)
      })

      const stats = {
        currentBMI: bmis.length ? bmis[bmis.length - 1] : null,
        trend: this.calculateBMITrend(bmis)
      }

      this.setData({
        bmiStats: stats,
        bmiChartData: { dates, bmis }
      })

      this.drawBMIChart(dates, bmis)
    } catch (error) {
      console.error('加载BMI图表数据失败:', error)
      this.setData({
        bmiStats: { currentBMI: null, trend: 0 },
        bmiChartData: { dates: [], bmis: [] }
      })
    }
  },

  // 计算趋势（膳食评分）
  calculateTrend(data) {
    if (data.length < 2) return 0
    
    // 取前1/3和后1/3的数据计算趋势
    const segment = Math.floor(data.length / 3)
    const firstSegment = data.slice(0, segment)
    const lastSegment = data.slice(-segment)
    
    const avgFirst = firstSegment.reduce((a, b) => a + b, 0) / firstSegment.length
    const avgLast = lastSegment.reduce((a, b) => a + b, 0) / lastSegment.length
    
    return parseFloat((avgLast - avgFirst).toFixed(1))
  },

  // 计算BMI趋势
  calculateBMITrend(data) {
    if (data.length < 2) return 0
    
    const segment = Math.floor(data.length / 3)
    const firstSegment = data.slice(0, segment)
    const lastSegment = data.slice(-segment)
    
    const avgFirst = firstSegment.reduce((a, b) => a + b, 0) / firstSegment.length
    const avgLast = lastSegment.reduce((a, b) => a + b, 0) / lastSegment.length
    
    return parseFloat((avgLast - avgFirst).toFixed(1))
  },

  // 绘制膳食评分图表
  drawDietChart(dates, scores) {
    const ctx = wx.createCanvasContext('dietChart', this)
    const canvasWidth = 600
    const canvasHeight = 300
    const padding = 50
    
    // 清除画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    if (!dates || !scores || dates.length === 0 || scores.length === 0) {
      ctx.setFillStyle('#999')
      ctx.setFontSize(18)
      ctx.fillText('暂无膳食评分数据', canvasWidth / 2 - 80, canvasHeight / 2)
      ctx.draw()
      return
    }
    
    // 设置样式
    ctx.setFillStyle('#666')
    ctx.setFontSize(20)
    ctx.setTextAlign('center')
    
    // 绘制坐标轴
    ctx.setStrokeStyle('#ddd')
    ctx.setLineWidth(1)
    
    // Y轴刻度
    const ySteps = 5
    const yMax = 100
    const yMin = 0
    
    for (let i = 0; i <= ySteps; i++) {
      const y = padding + (canvasHeight - 2 * padding) * (1 - i / ySteps)
      const value = yMin + (yMax - yMin) * (i / ySteps)
      
      // 刻度线
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvasWidth - padding, y)
      ctx.stroke()
      
      // 刻度值
      ctx.setFillStyle('#999')
      ctx.fillText(value.toString(), padding - 15, y + 5)
    }
    
    const xSpanDiet = Math.max(dates.length - 1, 1)
    const xStep = (canvasWidth - 2 * padding) / xSpanDiet
    
    const labelInterval = Math.ceil(dates.length / 8)
    
    for (let i = 0; i < dates.length; i++) {
      const x = padding + i * xStep
      
      if (i % labelInterval === 0 || i === dates.length - 1) {
        ctx.setFillStyle('#666')
        ctx.fillText(dates[i], x, canvasHeight - padding + 20)
      }
    }
    
    // 绘制折线
    ctx.setStrokeStyle('#4CAF50')
    ctx.setLineWidth(3)
    ctx.beginPath()
    
    for (let i = 0; i < scores.length; i++) {
      const x = padding + i * xStep
      const y = padding + (canvasHeight - 2 * padding) * (1 - (scores[i] - yMin) / (yMax - yMin))
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
      
      // 绘制数据点（减少密度）
      if (i % 3 === 0 || i === scores.length - 1) {
        ctx.setFillStyle('#4CAF50')
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
    
    ctx.stroke()
    
    // 绘制完成
    ctx.draw()
  },

  // 绘制BMI图表
  drawBMIChart(dates, bmis) {
    const ctx = wx.createCanvasContext('bmiChart', this)
    const canvasWidth = 600
    const canvasHeight = 300
    const padding = 50
    
    // 清除画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    if (!dates || !bmis || dates.length === 0 || bmis.length === 0) {
      ctx.setFillStyle('#999')
      ctx.setFontSize(18)
      ctx.fillText('暂无体重/BMI记录', canvasWidth / 2 - 80, canvasHeight / 2)
      ctx.draw()
      return
    }
    
    // 设置样式
    ctx.setFillStyle('#666')
    ctx.setFontSize(20)
    ctx.setTextAlign('center')
    
    // 绘制坐标轴
    ctx.setStrokeStyle('#ddd')
    ctx.setLineWidth(1)
    
    // Y轴刻度 (BMI范围通常为18-25)
    const ySteps = 5
    const yMax = 25
    const yMin = 18
    
    for (let i = 0; i <= ySteps; i++) {
      const y = padding + (canvasHeight - 2 * padding) * (1 - i / ySteps)
      const value = yMin + (yMax - yMin) * (i / ySteps)
      
      // 刻度线
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvasWidth - padding, y)
      ctx.stroke()
      
      // 刻度值
      ctx.setFillStyle('#999')
      ctx.fillText(value.toFixed(1), padding - 20, y + 5)
    }
    
    const xSpanBmi = Math.max(dates.length - 1, 1)
    const xStep = (canvasWidth - 2 * padding) / xSpanBmi
    
    const labelInterval = Math.ceil(dates.length / 8)
    
    for (let i = 0; i < dates.length; i++) {
      const x = padding + i * xStep
      
      if (i % labelInterval === 0 || i === dates.length - 1) {
        ctx.setFillStyle('#666')
        ctx.fillText(dates[i], x, canvasHeight - padding + 20)
      }
    }
    
    // 绘制健康区域
    ctx.setFillStyle('rgba(76, 175, 80, 0.1)')
    const healthyYStart = padding + (canvasHeight - 2 * padding) * (1 - (23.9 - yMin) / (yMax - yMin))
    const healthyYEnd = padding + (canvasHeight - 2 * padding) * (1 - (18.5 - yMin) / (yMax - yMin))
    ctx.fillRect(padding, healthyYStart, canvasWidth - 2 * padding, healthyYEnd - healthyYStart)
    
    // 绘制折线
    ctx.setStrokeStyle('#2196F3')
    ctx.setLineWidth(3)
    ctx.beginPath()
    
    for (let i = 0; i < bmis.length; i++) {
      const x = padding + i * xStep
      const y = padding + (canvasHeight - 2 * padding) * (1 - (bmis[i] - yMin) / (yMax - yMin))
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
      
      // 绘制数据点（减少密度）
      if (i % 3 === 0 || i === bmis.length - 1) {
        ctx.setFillStyle('#2196F3')
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
    
    ctx.stroke()
    
    // 绘制完成
    ctx.draw()
  },

  // 获取BMI状态
  getBMIStatus(bmi) {
    if (!bmi) return '--'
    if (bmi < 18.5) return '偏瘦'
    if (bmi < 24) return '正常'
    if (bmi < 28) return '超重'
    return '肥胖'
  },

  // 获取BMI状态样式类
  getBMIStatusClass(bmi) {
    if (!bmi) return ''
    if (bmi < 18.5) return 'underweight'
    if (bmi < 24) return 'normal'
    if (bmi < 28) return 'overweight'
    return 'obese'
  },

  // 生成健康建议
  generateHealthAdvice() {
    let advice = ''
    
    if (this.data.currentChart === 'diet') {
      const avgScore = this.data.dietStats.avgScore || 0
      const trend = this.data.dietStats.trend || 0
      
      if (avgScore >= 85) {
        advice = '您的膳食评分很棒！继续保持均衡饮食，注意食物多样性。'
        if (trend > 0) {
          advice += ' 而且您的评分还在持续提升，非常棒！'
        }
      } else if (avgScore >= 70) {
        advice = '膳食评分良好，建议增加蔬菜水果摄入，优化蛋白质来源。'
        if (trend > 0) {
          advice += ' 您的进步趋势很好，继续保持！'
        }
      } else {
        advice = '建议关注膳食平衡，增加全谷物和优质蛋白，减少加工食品。'
        if (trend > 0) {
          advice += ' 不过您的评分正在改善，这是个好迹象。'
        }
      }
    } else {
      const bmi = this.data.bmiStats.currentBMI
      const trend = this.data.bmiStats.trend || 0

      if (bmi == null || Number.isNaN(bmi)) {
        advice = '暂无 BMI 数据，请先记录体重并设置身高。'
        this.setData({ healthAdvice: advice })
        return
      }
      
      if (bmi < 18.5) {
        advice = 'BMI偏低，建议适当增加营养摄入，特别是优质蛋白质和健康脂肪。'
        if (trend > 0) {
          advice += ' 您的BMI正在向正常范围靠近，继续加油！'
        }
      } else if (bmi < 24) {
        advice = 'BMI在正常范围内，继续保持健康的生活方式和饮食习惯。'
        if (trend < 0) {
          advice += ' 您的BMI有下降趋势，注意保持均衡营养。'
        }
      } else if (bmi < 28) {
        advice = 'BMI略高，建议增加运动量，控制总热量摄入，多吃高纤维食物。'
        if (trend < 0) {
          advice += ' 您的BMI正在下降，继续保持！'
        }
      } else {
        advice = '建议咨询专业营养师，制定科学的减重计划，结合饮食和运动。'
        if (trend < 0) {
          advice += ' 您的BMI有改善趋势，这是个好的开始。'
        }
      }
    }
    
    this.setData({ healthAdvice: advice })
  },
  
  // 导航到食谱页面
navigateToRecipe() {
  if (!auth.getUserId()) {
    this.goToLogin()
    return
  }
  wx.navigateTo({
    url: '/pages/recipe/recipe'
  });
},

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的健康膳食记录',
      path: '/pages/my/my',
      imageUrl: '/images/share-cover.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '记录健康生活，分享膳食心得',
      imageUrl: '/images/share-cover.jpg'
    }
  },

  // 页面卸载时清理
  onUnload() {
    // 清理图表数据
    this.setData({
      dietChartData: { dates: [], scores: [] },
      bmiChartData: { dates: [], bmis: [] }
    })
  }
})