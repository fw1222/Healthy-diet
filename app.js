
const express = require('express');
const cors = require('cors');
const pool = require('./config/database');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '服务运行正常',
        timestamp: new Date().toISOString()
    });
});

// 测试数据库连接
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT 1 + 1 AS solution');
        res.json({
            success: true,
            message: '数据库连接成功',
            data: rows
        });
    } catch (error) {
        console.error('数据库连接失败:', error);
        res.status(500).json({
            success: false,
            message: '数据库连接失败: ' + error.message
        });
    }
});

// 用户登录/注册 
app.post('/api/login', async (req, res) => {
    try {
        const { userInfo } = req.body;

        console.log('用户登录:', userInfo);

        // 使用微信昵称作为用户名，创建模拟用户
        const username = `wx_${userInfo.nickName}_${Date.now()}`;
        const password = 'default_password'; // 默认密码

        // 查找或创建用户 
        const [users] = await pool.execute(
            'SELECT * FROM user_info WHERE username = ?',
            [username]
        );

        let user;
        if (users.length === 0) {
            // 创建新用户
            const [result] = await pool.execute(
                'INSERT INTO user_info (username, password, age, gender, height) VALUES (?, ?, ?, ?, ?)',
                [username, password, 25, userInfo.gender === 1 ? 'Male' : 'Female', 1.65]
            );
            user = {
                user_id: result.insertId,
                username: username,
                age: 25,
                gender: userInfo.gender === 1 ? 'Male' : 'Female',
                height: 1.65
            };
        } else {
            user = users[0];
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.user_id, 
                    nickname: user.username,
                    age: user.age,
                    gender: user.gender,
                    height: user.height
                }
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败: ' + error.message
        });
    }
});

// 搜索食物
app.get('/api/foods/search', async (req, res) => {
    try {
        const { keyword } = req.query;
        console.log('搜索食物:', keyword);

        const [foods] = await pool.execute(
            'SELECT food_id as id, food_name as name, protein_per_100g as protein, fat_per_100g as fat, fiber_per_100g as fiber, carbohydrate_per_100g as carbohydrate FROM food_info WHERE food_name LIKE ? LIMIT 10',
            [`%${keyword}%`]
        );

        res.json({
            success: true,
            data: foods
        });
    } catch (error) {
        console.error('搜索食物错误:', error);
        res.status(500).json({
            success: false,
            message: '搜索失败: ' + error.message
        });
    }
});

// 保存膳食记录
app.post('/api/record', async (req, res) => {
    try {
        const { userId, mealType, foodId, quantity } = req.body;
        const today = new Date().toISOString().split('T')[0];

        console.log('保存记录:', { userId, mealType, foodId, quantity });

        
        const mealTypeMap = {
            0: 'breakfast', // 早餐
            1: 'lunch',     // 午餐  
            2: 'dinner',    // 晚餐
            3: 'snack'      // 加餐
        };

        const mealTypeValue = mealTypeMap[mealType] || 'breakfast';

        
        await pool.execute(
            'INSERT INTO diet_record (user_id, food_id, amount, record_date, meal_type) VALUES (?, ?, ?, ?, ?)',
            [userId, foodId, quantity, today, mealTypeValue]
        );

        res.json({
            success: true,
            message: '记录保存成功'
        });
    } catch (error) {
        console.error('保存记录错误:', error);
        res.status(500).json({
            success: false,
            message: '保存失败: ' + error.message
        });
    }
});

// 获取今日记录 - 只返回今天的数据
app.get('/api/today-records', async (req, res) => {
    try {
        const { userId, date } = req.query;
        const today = date || new Date().toISOString().split('T')[0];

        console.log('📅 获取今日记录:', { userId, today });

        // 执行查询
        const [records] = await pool.execute(`
      SELECT 
        dr.record_id as id,
        dr.meal_type,
        fi.food_name,
        dr.amount as quantity,
        dr.record_date,
        dr.created_at,
        (fi.protein_per_100g * dr.amount / 100 * 4 + 
         fi.fat_per_100g * dr.amount / 100 * 9 + 
         COALESCE(fi.carbohydrate_per_100g, fi.carbs_per_100g) * dr.amount / 100 * 4) as calories
      FROM diet_record dr
      JOIN food_info fi ON dr.food_id = fi.food_id
      WHERE dr.user_id = ? AND dr.record_date = ?
      ORDER BY dr.created_at DESC
    `, [userId, today]);

        console.log('📋 数据库查询结果数量:', records.length);

        // 如果有记录，显示详细内容
        if (records.length > 0) {
            console.log('📝 查询到的记录:');
            records.forEach((record, index) => {
                console.log(`  记录${index}:`, {
                    id: record.id,
                    meal_type: record.meal_type,
                    food_name: record.food_name,
                    quantity: record.quantity,
                    calories: record.calories,
                    created_at: record.created_at
                });
            });
        } else {
            console.log('⚠️ 没有找到今天的记录');
        }

        // 直接返回查询结果
        res.json({
            success: true,
            data: records
        });
    } catch (error) {
        console.error('获取今日记录错误:', error);
        res.status(500).json({
            success: false,
            message: '获取失败: ' + error.message
        });
    }
});

// 获取今日统计数据
app.get('/api/today-stats', async (req, res) => {
    try {
        const { userId } = req.query;
        const today = new Date().toISOString().split('T')[0];

        console.log('获取今日数据:', { userId, today });

        // 获取今日营养素摄入 
        const [records] = await pool.execute(`
      SELECT 
        fi.protein_per_100g as protein, 
        fi.fat_per_100g as fat, 
        fi.fiber_per_100g as fiber, 
        fi.carbohydrate_per_100g as carbohydrate,
        dr.amount as quantity
      FROM diet_record dr
      JOIN food_info fi ON dr.food_id = fi.food_id
      WHERE dr.user_id = ? AND dr.record_date = ?
    `, [userId, today]);

        // 营养摄入标准
        const NUTRIENT_TARGETS = {
            protein: 55,      // 蛋白质(g)
            fat: 60,          // 脂肪(g)
            fiber: 25,        // 膳食纤维(g)
            carbohydrate: 300 // 碳水化物(g)
        };

        // 计算总摄入量
        const totals = records.reduce((acc, record) => {
            const ratio = record.quantity / 100;
            acc.protein += record.protein * ratio;
            acc.fat += record.fat * ratio;
            acc.fiber += record.fiber * ratio;
            acc.carbohydrate += record.carbohydrate * ratio;
            return acc;
        }, { protein: 0, fat: 0, fiber: 0, carbohydrate: 0 });

        // 计算评分 (0-100分)
        const scores = {
            protein: Math.min(Math.round((totals.protein / NUTRIENT_TARGETS.protein) * 100), 100),
            fat: Math.min(Math.round((totals.fat / NUTRIENT_TARGETS.fat) * 100), 100),
            fiber: Math.min(Math.round((totals.fiber / NUTRIENT_TARGETS.fiber) * 100), 100),
            carb: Math.min(Math.round((totals.carbohydrate / NUTRIENT_TARGETS.carbohydrate) * 100), 100)
        };

        // 计算综合评分
        const dailyScore = Math.round(
            (scores.protein + scores.fat + scores.fiber + scores.carb) / 4
        );

        res.json({
            success: true,
            data: {
                dailyScore,
                proteinScore: scores.protein,
                fatScore: scores.fat,
                fiberScore: scores.fiber,
                carbScore: scores.carb,
                totals
            }
        });
    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.status(500).json({
            success: false,
            message: '获取数据失败: ' + error.message
        });
    }
});

// 删除记录API - 简化版本
app.delete('/api/record/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        console.log('🗑️ 删除记录:', { id, userId });

        // 执行删除
        await pool.execute(
            'DELETE FROM diet_record WHERE record_id = ? AND user_id = ?',
            [id, userId]
        );

        // 简单返回成功，不检查affectedRows
        res.json({
            success: true,
            message: '记录删除成功'
        });

    } catch (error) {
        console.error('删除记录错误:', error);
        res.status(500).json({
            success: false,
            message: '删除失败: ' + error.message
        });
    }
});

// 保存食谱
app.get('/api/recipes', async (req, res) => {
    try {
        const { userId } = req.query;
        console.log('获取食谱列表:', userId);

        // 1. 先获取食谱基本信息
        const [recipes] = await pool.execute(`
      SELECT 
        r.recipe_id,
        r.recipe_name,
        r.meal_type,
        r.created_at
      FROM recipe r
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);

        console.log('查询到的食谱数量:', recipes.length);

        // 2. 为每个食谱获取详情
        const recipesWithDetails = await Promise.all(
            recipes.map(async (recipe) => {
                try {
                    // 获取食谱的食物列表
                    const [foods] = await pool.execute(`
            SELECT 
              fi.food_id,
              fi.food_name,
              rd.amount,
              fi.protein_per_100g,
              fi.fat_per_100g,
              fi.carbohydrate_per_100g,
              fi.fiber_per_100g,
              (fi.protein_per_100g * rd.amount / 100) as protein,
              (fi.fat_per_100g * rd.amount / 100) as fat,
              (fi.carbohydrate_per_100g * rd.amount / 100) as carbohydrate,
              (fi.fiber_per_100g * rd.amount / 100) as fiber
            FROM recipe_detail rd
            JOIN food_info fi ON rd.food_id = fi.food_id
            WHERE rd.recipe_id = ?
          `, [recipe.recipe_id]);

                    // 计算总营养和热量
                    const totals = foods.reduce((acc, food) => {
                        const ratio = food.amount / 100;
                        acc.protein += food.protein_per_100g * ratio;
                        acc.fat += food.fat_per_100g * ratio;
                        acc.carbohydrate += food.carbohydrate_per_100g * ratio;
                        acc.fiber += food.fiber_per_100g * ratio;
                        acc.calories += (food.protein_per_100g * 4 +
                            food.fat_per_100g * 9 +
                            food.carbohydrate_per_100g * 4) * ratio;
                        return acc;
                    }, { protein: 0, fat: 0, carbohydrate: 0, fiber: 0, calories: 0 });

                    return {
                        ...recipe,
                        foods: foods.map(food => ({
                            id: food.food_id,
                            name: food.food_name,
                            amount: food.amount,
                            protein: food.protein,
                            fat: food.fat,
                            carbohydrate: food.carbohydrate,
                            fiber: food.fiber
                        })),
                        totals: {
                            protein: totals.protein.toFixed(1),
                            fat: totals.fat.toFixed(1),
                            carbohydrate: totals.carbohydrate.toFixed(1),
                            fiber: totals.fiber.toFixed(1),
                            calories: Math.round(totals.calories)
                        },
                        foodCount: foods.length
                    };
                } catch (error) {
                    console.error(`处理食谱 ${recipe.recipe_id} 详情时出错:`, error);
                    return {
                        ...recipe,
                        foods: [],
                        totals: { protein: 0, fat: 0, carbohydrate: 0, fiber: 0, calories: 0 },
                        foodCount: 0
                    };
                }
            })
        );

        res.json({
            success: true,
            data: recipesWithDetails
        });
    } catch (error) {
        console.error('获取食谱列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取食谱列表失败: ' + error.message
        });
    }
});

// 获取用户食谱列表
app.get('/api/recipes', async (req, res) => {
    try {
        const { userId } = req.query;

        const [recipes] = await pool.execute(`
      SELECT 
        r.recipe_id,
        r.recipe_name,
        r.meal_type,
        r.created_at,
        COUNT(rd.detail_id) as food_count,
        SUM(fi.protein_per_100g * rd.amount / 100) as total_protein,
        SUM(fi.fat_per_100g * rd.amount / 100) as total_fat,
        SUM(fi.carbohydrate_per_100g * rd.amount / 100) as total_carbohydrate,
        SUM(fi.protein_per_100g * rd.amount / 100 * 4 + 
            fi.fat_per_100g * rd.amount / 100 * 9 + 
            fi.carbohydrate_per_100g * rd.amount / 100 * 4) as total_calories
      FROM recipe r
      LEFT JOIN recipe_detail rd ON r.recipe_id = rd.recipe_id
      LEFT JOIN food_info fi ON rd.food_id = fi.food_id
      WHERE r.user_id = ?
      GROUP BY r.recipe_id
      ORDER BY r.created_at DESC
    `, [userId]);

        res.json({
            success: true,
            data: recipes
        });
    } catch (error) {
        console.error('获取食谱列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取食谱列表失败: ' + error.message
        });
    }
});

// 获取食谱详情
app.get('/api/recipe/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 获取食谱基本信息
        const [recipeInfo] = await pool.execute(`
      SELECT meal_type FROM recipe WHERE recipe_id = ?
    `, [id]);

        // 获取食谱详情
        const [recipeDetails] = await pool.execute(`
      SELECT 
        rd.detail_id,
        rd.amount as quantity,
        fi.food_id as id,
        fi.food_name as name,
        fi.protein_per_100g as protein,
        fi.fat_per_100g as fat,
        fi.carbohydrate_per_100g as carbohydrate
      FROM recipe_detail rd
      JOIN food_info fi ON rd.food_id = fi.food_id
      WHERE rd.recipe_id = ?
    `, [id]);

        res.json({
            success: true,
            data: {
                details: recipeDetails,
                meal_type: recipeInfo[0]?.meal_type || 'breakfast'
            }
        });
    } catch (error) {
        console.error('获取食谱详情错误:', error);
        res.status(500).json({
            success: false,
            message: '获取食谱详情失败: ' + error.message
        });
    }
});

// 删除食谱
app.delete('/api/recipe/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        // 先删除食谱详情
        await pool.execute('DELETE FROM recipe_detail WHERE recipe_id = ?', [id]);

        // 再删除食谱
        await pool.execute('DELETE FROM recipe WHERE recipe_id = ? AND user_id = ?', [id, userId]);

        res.json({
            success: true,
            message: '食谱删除成功'
        });
    } catch (error) {
        console.error('删除食谱错误:', error);
        res.status(500).json({
            success: false,
            message: '删除食谱失败: ' + error.message
        });
    }
});

// 获取历史记录
app.get('/api/history-records', async (req, res) => {
    try {
        const { userId, date } = req.query; // date格式: 2024-01

        console.log('获取历史记录:', { userId, date });

        const [records] = await pool.execute(`
      SELECT 
        DATE_FORMAT(dr.record_date, '%d') as day,
        DATE_FORMAT(dr.record_date, '%W') as week,
        dr.record_date as date,
        COUNT(DISTINCT dr.food_id) as mealCount,
        SUM(fi.carbohydrate_per_100g * dr.amount / 100 * 4 + 
            fi.protein_per_100g * dr.amount / 100 * 4 + 
            fi.fat_per_100g * dr.amount / 100 * 9) as totalCalories
      FROM diet_record dr
      JOIN food_info fi ON dr.food_id = fi.food_id
      WHERE dr.user_id = ? AND DATE_FORMAT(dr.record_date, '%Y-%m') = ?
      GROUP BY dr.record_date
      ORDER BY dr.record_date DESC
    `, [userId, date]);

        console.log('历史记录查询结果数量:', records.length);

        // 为每条记录计算评分和营养详情
        const recordsWithScores = await Promise.all(
            records.map(async (record) => {
                try {
                    const [dayRecords] = await pool.execute(`
            SELECT 
              fi.protein_per_100g as protein, 
              fi.fat_per_100g as fat, 
              fi.fiber_per_100g as fiber, 
              fi.carbohydrate_per_100g as carbohydrate,
              dr.amount as quantity
            FROM diet_record dr
            JOIN food_info fi ON dr.food_id = fi.food_id
            WHERE dr.user_id = ? AND dr.record_date = ?
          `, [userId, record.date]);

                    console.log(`日期 ${record.date} 的记录数量:`, dayRecords.length);

                    const totals = dayRecords.reduce((acc, dayRecord) => {
                        const ratio = dayRecord.quantity / 100;
                        acc.protein += (dayRecord.protein || 0) * ratio;
                        acc.fat += (dayRecord.fat || 0) * ratio;
                        acc.fiber += (dayRecord.fiber || 0) * ratio;
                        acc.carbohydrate += (dayRecord.carbohydrate || 0) * ratio;
                        return acc;
                    }, { protein: 0, fat: 0, fiber: 0, carbohydrate: 0 });

                    const NUTRIENT_TARGETS = {
                        protein: 55,
                        fat: 60,
                        fiber: 25,
                        carbohydrate: 300
                    };

                    // 计算各项评分，避免除零错误
                    const scores = {
                        protein: NUTRIENT_TARGETS.protein > 0 ?
                            Math.min(Math.round((totals.protein / NUTRIENT_TARGETS.protein) * 100), 100) : 0,
                        fat: NUTRIENT_TARGETS.fat > 0 ?
                            Math.min(Math.round((totals.fat / NUTRIENT_TARGETS.fat) * 100), 100) : 0,
                        fiber: NUTRIENT_TARGETS.fiber > 0 ?
                            Math.min(Math.round((totals.fiber / NUTRIENT_TARGETS.fiber) * 100), 100) : 0,
                        carb: NUTRIENT_TARGETS.carbohydrate > 0 ?
                            Math.min(Math.round((totals.carbohydrate / NUTRIENT_TARGETS.carbohydrate) * 100), 100) : 0
                    };

                    // 计算综合评分
                    const validScores = Object.values(scores).filter(score => !isNaN(score));
                    const dailyScore = validScores.length > 0 ?
                        Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

                    return {
                        ...record,
                        score: dailyScore,
                        protein: Math.round(totals.protein),
                        fat: Math.round(totals.fat),
                        carbs: Math.round(totals.carbohydrate),
                        totalCalories: Math.round(record.totalCalories || 0)
                    };
                } catch (error) {
                    console.error(`处理日期 ${record.date} 的记录时出错:`, error);
                    // 如果处理单个日期记录失败，返回基础信息
                    return {
                        ...record,
                        score: 0,
                        protein: 0,
                        fat: 0,
                        carbs: 0,
                        totalCalories: Math.round(record.totalCalories || 0)
                    };
                }
            })
        );

        res.json({
            success: true,
            data: recordsWithScores
        });
    } catch (error) {
        console.error('获取历史记录错误:', error);
        res.status(500).json({
            success: false,
            message: '获取历史记录失败: ' + error.message
        });
    }
});

// 保存体重记录 - 自动关联身高
app.post('/api/weight', async (req, res) => {
    try {
        const { userId, weight } = req.body;
        const today = new Date().toISOString().split('T')[0];

        console.log('保存体重:', { userId, weight });

        // 首先获取用户的身高信息
        const [userInfo] = await pool.execute(
            'SELECT height FROM user_info WHERE user_id = ?',
            [userId]
        );

        if (userInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const userHeight = userInfo[0].height;

        // 检查今天是否已记录
        const [existing] = await pool.execute(
            'SELECT id FROM weight_records WHERE user_id = ? AND record_date = ?',
            [userId, today]
        );

        if (existing.length > 0) {
            await pool.execute(
                'UPDATE weight_records SET weight = ?, height = ? WHERE id = ?',
                [weight, userHeight, existing[0].id]
            );
        } else {
            await pool.execute(
                'INSERT INTO weight_records (user_id, weight, height, record_date) VALUES (?, ?, ?, ?)',
                [userId, weight, userHeight, today]
            );
        }

        res.json({
            success: true,
            message: '体重记录保存成功',
            data: {
                weight: weight,
                height: userHeight,
                bmi: userHeight ? (weight / (userHeight * userHeight)).toFixed(1) : null
            }
        });
    } catch (error) {
        console.error('保存体重错误:', error);
        res.status(500).json({
            success: false,
            message: '保存体重失败: ' + error.message
        });
    }
});

// 更新用户身高信息
app.post('/api/user/height', async (req, res) => {
    try {
        const { userId, height } = req.body;

        console.log('更新用户身高:', { userId, height });

        // 更新用户身高
        await pool.execute(
            'UPDATE user_info SET height = ? WHERE user_id = ?',
            [height, userId]
        );

        // 同时更新最近30天的体重记录中的身高信息（确保数据一致性）
        await pool.execute(
            'UPDATE weight_records SET height = ? WHERE user_id = ? AND record_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)',
            [height, userId]
        );

        res.json({
            success: true,
            message: '身高信息更新成功'
        });
    } catch (error) {
        console.error('更新身高错误:', error);
        res.status(500).json({
            success: false,
            message: '更新身高失败: ' + error.message
        });
    }
});

// 获取用户完整信息（包含身高）
app.get('/api/user/profile', async (req, res) => {
    try {
        const { userId } = req.query;

        const [userInfo] = await pool.execute(
            'SELECT user_id, username, age, gender, height FROM user_info WHERE user_id = ?',
            [userId]
        );

        if (userInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: userInfo[0]
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败: ' + error.message
        });
    }
});

// 获取体重记录历史（包含身高和BMI计算）
app.get('/api/weight-records', async (req, res) => {
    try {
        const { userId, limit = 30 } = req.query;

        const [records] = await pool.execute(
            `SELECT 
        id, 
        weight, 
        height, 
        record_date,
        CASE 
          WHEN height IS NOT NULL AND height > 0 
          THEN ROUND(weight / (height * height), 1) 
          ELSE NULL 
        END as bmi
       FROM weight_records 
       WHERE user_id = ? 
       ORDER BY record_date DESC 
       LIMIT ?`,
            [userId, parseInt(limit)]
        );

        res.json({
            success: true,
            data: records
        });
    } catch (error) {
        console.error('获取体重记录错误:', error);
        res.status(500).json({
            success: false,
            message: '获取体重记录失败: ' + error.message
        });
    }
});

// 修改现有的用户统计接口，加入BMI计算
app.get('/api/user/stats', async (req, res) => {
    try {
        const { userId } = req.query;

        // 获取最新体重记录（包含身高）
        const [weightRecords] = await pool.execute(
            `SELECT weight, height,
        CASE 
          WHEN height IS NOT NULL AND height > 0 
          THEN ROUND(weight / (height * height), 1) 
          ELSE NULL 
        END as bmi
       FROM weight_records 
       WHERE user_id = ? 
       ORDER BY record_date DESC 
       LIMIT 1`,
            [userId]
        );

        // 获取连续记录天数
        const [continuousDays] = await pool.execute(
            `SELECT COUNT(DISTINCT record_date) as days 
       FROM diet_record 
       WHERE user_id = ? AND record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
            [userId]
        );

        // 获取用户信息
        const [userInfo] = await pool.execute(
            'SELECT age, gender, height FROM user_info WHERE user_id = ?',
            [userId]
        );

        let currentBMI = null;
        let currentWeight = null;
        let currentHeight = null;

        if (weightRecords.length > 0) {
            currentWeight = weightRecords[0].weight;
            currentHeight = weightRecords[0].height;
            currentBMI = weightRecords[0].bmi;
        } else if (userInfo.length > 0 && userInfo[0].height) {
            // 如果没有体重记录但有身高信息，使用用户设置的身高
            currentHeight = userInfo[0].height;
        }

        res.json({
            success: true,
            data: {
                currentBMI: currentBMI,
                currentWeight: currentWeight,
                currentHeight: currentHeight,
                continuousDays: continuousDays[0].days || 0
            }
        });
    } catch (error) {
        console.error('获取用户统计错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户统计失败: ' + error.message
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// 404 处理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  数据库测试: http://localhost:${PORT}/api/test-db`);
    console.log(`👤 用户登录: POST http://localhost:${PORT}/api/login`);
    console.log(`🔍 搜索食物: GET http://localhost:${PORT}/api/foods/search?keyword=Apple`);
    console.log(`💾 保存记录: POST http://localhost:${PORT}/api/record`);
    console.log(`📈 获取数据: GET http://localhost:${PORT}/api/today-stats?userId=1`);
});