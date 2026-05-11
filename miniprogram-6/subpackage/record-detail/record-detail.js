// pages/record-detail/record-detail.js
const app = getApp()
const auth = require('../../utils/auth')

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
    if (!auth.requireLogin()) return
    this.initPage(options);
  },

  initPage(options) {
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
    
    wx.setNavigationBarTitle({
      title: `${this.formatDate(date)} 膳食详情`
    })
    
    this.formatDisplayDate()
    this.calculateNutritionPercent()
    this.loadRecordDetail()
  },

  async loadRecordDetail() {
    this.setData({ loading: true })
    
    try {
      const userId = auth.getUserId()
      if (!userId) {
        this.setData({ loading: false, meals: [] })
        return
      }
      
      // 修复日期格式
      let targetDate;
      const dateObj = new Date(this.data.date);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`;
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`;
      }
      
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/today-records`,
          method: 'GET',
          data: {
            userId: userId,
            date: targetDate
          },
          success: resolve,
          fail: reject
        })
      });

      if (res.data.success && res.data.data && res.data.data.length > 0) {
        this.processRecordData(res.data.data);
      } else {
        // 没有数据时，只设置空数组，不生成示例数据
        this.setData({ 
          meals: [],
          mealCount: 0,
          loading: false 
        });
      }
    } catch (error) {
      console.error('加载记录详情失败:', error);
      this.setData({ 
        meals: [],
        mealCount: 0,
        loading: false 
      });
    }
  },

  processRecordData(records) {
    const mealsMap = {};
    let totalProtein = 0, totalFat = 0, totalCarbs = 0, totalCalories = 0;

    records.forEach(record => {
      const mealType = record.meal_type;
      if (!mealsMap[mealType]) {
        mealsMap[mealType] = {
          mealType: mealType,
          mealTypeText: this.getMealTypeText(mealType),
          time: this.generateMealTime(mealType),
          foods: [],
          protein: 0, fat: 0, carbs: 0, calories: 0
        };
      }
      
      const ratio = record.quantity / 100;
      const foodProtein = (record.protein_per_100g || 0) * ratio;
      const foodFat = (record.fat_per_100g || 0) * ratio;
      const foodCarbs = (record.carbohydrate_per_100g || 0) * ratio;
      const foodCalories = foodProtein * 4 + foodFat * 9 + foodCarbs * 4;

      mealsMap[mealType].foods.push({
        name: record.food_name,
        quantity: record.quantity,
        protein: Math.round(foodProtein),
        fat: Math.round(foodFat),
        carbs: Math.round(foodCarbs),
        calories: Math.round(foodCalories)
      });
      
      mealsMap[mealType].protein += foodProtein;
      mealsMap[mealType].fat += foodFat;
      mealsMap[mealType].carbs += foodCarbs;
      mealsMap[mealType].calories += foodCalories;

      totalProtein += foodProtein;
      totalFat += foodFat;
      totalCarbs += foodCarbs;
      totalCalories += foodCalories;
    });

    const meals = Object.values(mealsMap);
    meals.forEach(meal => {
      meal.protein = Math.round(meal.protein);
      meal.fat = Math.round(meal.fat);
      meal.carbs = Math.round(meal.carbs);
      meal.calories = Math.round(meal.calories);
      meal.score = this.calculateMealScore(meal);
    });

    this.setData({
      totalProtein: Math.round(totalProtein),
      totalFat: Math.round(totalFat),
      totalCarbs: Math.round(totalCarbs),
      totalCalories: Math.round(totalCalories),
      meals: meals,
      mealCount: meals.length,
      loading: false
    });
    
    this.calculateNutritionPercent();
    this.generateHealthAdvice();
  },

  calculateMealScore(meal) {
    let score = 80;
    if (meal.protein >= 20 && meal.protein <= 30) score += 5;
    else if (meal.protein < 10) score -= 10;
    else if (meal.protein > 40) score -= 5;
    
    if (meal.fat >= 10 && meal.fat <= 20) score += 5;
    else if (meal.fat > 30) score -= 10;
    else if (meal.fat < 5) score -= 5;
    
    if (meal.carbs >= 30 && meal.carbs <= 50) score += 5;
    else if (meal.carbs < 15) score -= 10;
    else if (meal.carbs > 70) score -= 5;
    
    if (meal.foods.length >= 3) score += 5;
    return Math.max(0, Math.min(100, score));
  },

  getMealTypeText(mealType) {
    const map = { 'breakfast': '早餐', 'lunch': '午餐', 'dinner': '晚餐', 'snack': '加餐' };
    return map[mealType] || '加餐';
  },

  generateMealTime(mealType) {
    const times = { 'breakfast': '08:30', 'lunch': '12:15', 'dinner': '18:45', 'snack': '15:30' };
    return times[mealType] || '15:30';
  },

  formatDisplayDate() {
    const date = new Date(this.data.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    this.setData({
      formattedDate: `${year}年${month}月${day}日`,
      weekDay: weekDays[date.getDay()]
    });
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  },

  calculateNutritionPercent() {
    const { totalProtein, totalFat, totalCarbs } = this.data;
    const total = totalProtein + totalFat + totalCarbs;
    if (total === 0) {
      this.setData({ proteinPercent: 0, fatPercent: 0, carbPercent: 0 });
      return;
    }
    this.setData({
      proteinPercent: Math.round((totalProtein / total) * 100),
      fatPercent: Math.round((totalFat / total) * 100),
      carbPercent: Math.round((totalCarbs / total) * 100)
    });
  },

  generateHealthAdvice() {
    const { dailyScore, proteinPercent, fatPercent, carbPercent } = this.data;
    let advice = '';
    if (dailyScore >= 90) advice = '您的膳食非常均衡！继续保持！';
    else if (dailyScore >= 80) advice = '膳食结构良好，建议适当增加蔬菜水果。';
    else if (dailyScore >= 60) advice = '膳食需要优化，建议增加优质蛋白质。';
    else advice = '建议咨询营养师，制定更适合您的膳食计划。';
    
    if (proteinPercent < 15) advice += ' 蛋白质摄入不足，建议增加豆制品、瘦肉。';
    else if (proteinPercent > 30) advice += ' 蛋白质摄入较多，注意均衡。';
    if (fatPercent > 35) advice += ' 脂肪摄入偏高，建议选择健康脂肪。';
    if (carbPercent < 45) advice += ' 碳水摄入不足，适当增加全谷物。';
    this.setData({ healthAdvice: advice.trim() });
  },

  getMealScoreClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
  },

  onShareAppMessage() {
    return {
      title: `${this.data.formattedDate} 膳食记录`,
      path: `/pages/record-detail/record-detail?date=${this.data.date}`
    };
  }
})