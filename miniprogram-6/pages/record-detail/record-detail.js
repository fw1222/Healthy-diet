// pages/record-detail/record-detail.js
const app = getApp()

Page({
  data: {
    // 页面数据
    date: '',
    formattedDate: '',
    weekDay: '',
    dailyScore: 0,
    mealCount: 0,
    totalCalories: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCarbs: 0,
    
    // 营养百分比
    proteinPercent: 0,
    fatPercent: 0,
    carbPercent: 0,
    
    // 餐次数据
    meals: [],
    
    // 健康建议
    healthAdvice: '',
    
    // 加载状态
    loading: true
  },

  onLoad(options) {
    // 直接使用固定用户，不需要登录检查
    this.initPage(options);
  },

   // 初始化页面
   initPage(options) {
    // 从URL参数获取数据
    const { date, score, mealCount, totalCalories, protein, fat, carbs } = options
    
    this.setData({
      date: date,
      dailyScore: parseInt(score) || 0,
      mealCount: parseInt(mealCount) || 0,
      totalCalories: parseInt(totalCalories) || 0,
      totalProtein: parseInt(protein) || 0,
      totalFat: parseInt(fat) || 0,
      totalCarbs: parseInt(carbs) || 0
    })
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: `${this.formatDate(date)} 膳食详情`
    })
    
    // 初始化数据
    this.initPageData()
    
    // 加载实际数据
    this.loadRecordDetail()
  },

  // 加载记录详情
  async loadRecordDetail() {
    try {
      const userId = wx.getStorageSync('userId') || 1; // 使用固定用户ID
      
      // 获取当天的详细记录
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/today-records`,
          method: 'GET',
          data: {
            userId: userId,
            date: this.data.date
          },
          success: resolve,
          fail: reject
        })
      });

      if (res.data.success) {
        console.log('详细记录数据:', res.data.data);
        this.processRecordData(res.data.data);
      } else {
        console.error('获取记录详情失败:', res.data.message);
        this.generateMealsData();
      }
    } catch (error) {
      console.error('加载记录详情失败:', error);
      this.generateMealsData();
    } finally {
      this.setData({ loading: false });
    }
  },
  // 处理记录数据 - 根据你的数据库结构
  processRecordData(records) {
    if (!records || records.length === 0) {
      console.log('当天没有记录数据');
      this.generateMealsData();
      return;
    }

    // 按餐次分组
    const mealsMap = {};
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    let totalCalories = 0;

    records.forEach(record => {
      const mealType = record.meal_type;
      if (!mealsMap[mealType]) {
        mealsMap[mealType] = {
          mealType: mealType,
          mealTypeText: this.getMealTypeText(mealType),
          time: this.generateMealTime(mealType),
          foods: [],
          protein: 0,
          fat: 0,
          carbs: 0,
          calories: 0
        };
      }
      
      // 计算单个食物的营养值
      const ratio = record.quantity / 100;
      const foodProtein = (record.protein_per_100g || 0) * ratio;
      const foodFat = (record.fat_per_100g || 0) * ratio;
      const foodCarbs = (record.carbohydrate_per_100g || record.carbs_per_100g || 0) * ratio;
      const foodCalories = foodProtein * 4 + foodFat * 9 + foodCarbs * 4;

      // 食物项
      const foodItem = {
        name: record.food_name,
        quantity: record.quantity,
        protein: Math.round(foodProtein),
        fat: Math.round(foodFat),
        carbs: Math.round(foodCarbs),
        calories: Math.round(foodCalories)
      };
      
      mealsMap[mealType].foods.push(foodItem);
      
      // 累加餐次的营养值
      mealsMap[mealType].protein += foodProtein;
      mealsMap[mealType].fat += foodFat;
      mealsMap[mealType].carbs += foodCarbs;
      mealsMap[mealType].calories += foodCalories;

      // 累加总营养值
      totalProtein += foodProtein;
      totalFat += foodFat;
      totalCarbs += foodCarbs;
      totalCalories += foodCalories;
    });

    // 转换为数组并计算每餐评分
    const meals = Object.values(mealsMap);
    meals.forEach(meal => {
      // 四舍五入营养值
      meal.protein = Math.round(meal.protein);
      meal.fat = Math.round(meal.fat);
      meal.carbs = Math.round(meal.carbs);
      meal.calories = Math.round(meal.calories);
      
      // 计算餐次评分
      meal.score = this.calculateMealScore(meal);
    });

    // 更新总营养数据（如果数据库数据更准确）
    if (totalProtein > 0 || totalFat > 0 || totalCarbs > 0) {
      this.setData({
        totalProtein: Math.round(totalProtein),
        totalFat: Math.round(totalFat),
        totalCarbs: Math.round(totalCarbs),
        totalCalories: Math.round(totalCalories)
      });
      
      // 重新计算营养百分比
      this.calculateNutritionPercent();
    }

    this.setData({ 
      meals: meals,
      mealCount: meals.length
    });

    // this.generateHealthAdvice();
  },

  // 计算餐次评分
  calculateMealScore(meal) {
    // 基于营养均衡性计算评分
    let score = 80; // 基础分
    
    // 蛋白质评分 (目标：20-30g每餐)
    if (meal.protein >= 20 && meal.protein <= 30) {
      score += 5;
    } else if (meal.protein < 10) {
      score -= 10;
    } else if (meal.protein > 40) {
      score -= 5;
    }

    // 脂肪评分 (目标：10-20g每餐)
    if (meal.fat >= 10 && meal.fat <= 20) {
      score += 5;
    } else if (meal.fat > 30) {
      score -= 10;
    } else if (meal.fat < 5) {
      score -= 5;
    }

    // 碳水评分 (目标：30-50g每餐)
    if (meal.carbs >= 30 && meal.carbs <= 50) {
      score += 5;
    } else if (meal.carbs < 15) {
      score -= 10;
    } else if (meal.carbs > 70) {
      score -= 5;
    }

    // 食物多样性加分
    if (meal.foods.length >= 3) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  },

  // 获取餐次类型文本
  getMealTypeText(mealType) {
    const mealTypeMap = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐',
      'snack': '加餐'
    };
    return mealTypeMap[mealType] || '加餐';
  },

  // 生成餐次时间
  generateMealTime(mealType) {
    const mealTimes = {
      'breakfast': '08:30',
      'lunch': '12:15',
      'dinner': '18:45',
      'snack': '15:30'
    };
    return mealTimes[mealType] || '15:30';
  },

  // 初始化页面数据
  initPageData() {
    this.formatDisplayDate()
    this.calculateNutritionPercent()
    this.setCircleProgress()
  },

  // 设置圆形进度条
  setCircleProgress() {
    // CSS变量已经在WXML中通过 {{dailyScore}} 绑定
  },

  // 格式化显示日期
  formatDisplayDate() {
    const dateStr = this.data.date
    const date = new Date(dateStr)
    
    const formattedDate = this.formatDate(dateStr)
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekDay = weekDays[date.getDay()]
    
    this.setData({
      formattedDate: formattedDate,
      weekDay: weekDay
    })
  },

  // 格式化日期
  formatDate(dateStr) {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}年${month}月${day}日`
  },

  // 计算营养百分比
  calculateNutritionPercent() {
    const { totalProtein, totalFat, totalCarbs } = this.data
    const total = totalProtein + totalFat + totalCarbs
    
    if (total === 0) {
      this.setData({
        proteinPercent: 0,
        fatPercent: 0,
        carbPercent: 0
      })
      return
    }
    
    const proteinPercent = Math.round((totalProtein / total) * 100)
    const fatPercent = Math.round((totalFat / total) * 100)
    const carbPercent = Math.round((totalCarbs / total) * 100)
    
    this.setData({
      proteinPercent: proteinPercent,
      fatPercent: fatPercent,
      carbPercent: carbPercent
    })
  },

  // 生成模拟餐次数据（当没有实际数据时使用）
  generateMealsData() {
    const { mealCount, totalProtein, totalFat, totalCarbs, totalCalories, dailyScore } = this.data
    
    const meals = []
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack']
    const mealTypeTexts = ['早餐', '午餐', '晚餐', '加餐']
    
    // 根据餐次数量生成数据
    for (let i = 0; i < mealCount; i++) {
      const mealType = mealTypes[i] || 'snack'
      const mealTypeText = mealTypeTexts[i] || '加餐'
      
      // 计算每餐的营养素（平均分配）
      const mealProtein = Math.round(totalProtein / mealCount)
      const mealFat = Math.round(totalFat / mealCount)
      const mealCarbs = Math.round(totalCarbs / mealCount)
      const mealCalories = Math.round(totalCalories / mealCount)
      
      // 计算餐次评分
      const mealScore = this.calculateMealScore({
        protein: mealProtein,
        fat: mealFat,
        carbs: mealCarbs,
        foods: []
      })
      
      meals.push({
        mealType: mealType,
        mealTypeText: mealTypeText,
        time: this.generateMealTime(mealType),
        protein: mealProtein,
        fat: mealFat,
        carbs: mealCarbs,
        calories: mealCalories,
        score: mealScore,
        foods: [
          { name: '示例食物', quantity: 100 }
        ]
      })
    }
    
    this.setData({ meals: meals })
  },

  // 获取餐次评分样式类
  getMealScoreClass(score) {
    if (score >= 90) return 'excellent'
    if (score >= 80) return 'good'
    if (score >= 60) return 'average'
    return 'poor'
  },

  // 生成健康建议
  generateHealthAdvice() {
    const { dailyScore, totalProtein, totalFat, totalCarbs, proteinPercent, fatPercent, carbPercent } = this.data
    
    let advice = ''
    
    // 基于评分给出建议
    if (dailyScore >= 90) {
      advice = '您的膳食非常均衡！继续保持这样的饮食习惯，注意食物的多样性。'
    } else if (dailyScore >= 80) {
      advice = '膳食结构良好，建议适当增加蔬菜水果的摄入量。'
    } else if (dailyScore >= 60) {
      advice = '膳食需要优化，建议增加优质蛋白质，减少加工食品。'
    } else {
      advice = '建议咨询营养师，制定更适合您的膳食计划。'
    }
    
    // 基于营养比例给出具体建议
    if (proteinPercent < 15) {
      advice += ' 蛋白质摄入略显不足，建议增加豆制品、瘦肉等。'
    } else if (proteinPercent > 30) {
      advice += ' 蛋白质摄入较多，注意均衡其他营养素。'
    }
    
    if (fatPercent > 35) {
      advice += ' 脂肪摄入偏高，建议选择更健康的脂肪来源。'
    }
    
    if (carbPercent < 45) {
      advice += ' 碳水摄入不足，适当增加全谷物。'
    }
    
    this.setData({ healthAdvice: advice.trim() })
  },
  calculateNutritionPercent() {
    const { totalProtein, totalFat, totalCarbs } = this.data
    const total = totalProtein + totalFat + totalCarbs
    
    if (total === 0) {
      this.setData({
        proteinPercent: 0,
        fatPercent: 0,
        carbPercent: 0
      })
      return
    }
    
    const proteinPercent = Math.round((totalProtein / total) * 100)
    const fatPercent = Math.round((totalFat / total) * 100)
    const carbPercent = Math.round((totalCarbs / total) * 100)
    
    this.setData({
      proteinPercent: proteinPercent,
      fatPercent: fatPercent,
      carbPercent: carbPercent,
      // 设置CSS变量
      progressStyle: `
        --protein-width: ${proteinPercent}%;
        --fat-width: ${fatPercent}%;
        --carb-width: ${carbPercent}%;
      `
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `${this.data.formattedDate} 膳食记录`,
      path: `/pages/record-detail/record-detail?date=${this.data.date}`
    }
  }
})

