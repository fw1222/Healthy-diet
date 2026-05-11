# 用户表
CREATE TABLE user_info (
                           user_id INT AUTO_INCREMENT PRIMARY KEY,
                           username VARCHAR(50) UNIQUE NOT NULL,
                           password VARCHAR(100) NOT NULL,
                           email VARCHAR(100),
                           phone VARCHAR(20),
                           age INT NOT NULL,
                           gender ENUM('Male', 'Female') NOT NULL,
                           create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
# 食物表
CREATE TABLE food_info (
                           food_id INT AUTO_INCREMENT PRIMARY KEY,
                           food_name VARCHAR(100) UNIQUE NOT NULL,
                           carbs_per_100g DECIMAL(5, 2),
                           protein_per_100g DECIMAL(5, 2),
                           fat_per_100g DECIMAL(5, 2),
                           fiber_per_100g DECIMAL(5, 2)
);
drop table food_info cascade ;
delete from food_info;
# 饮食记录表
CREATE TABLE diet_record (
                             record_id INT AUTO_INCREMENT PRIMARY KEY,
                             user_id INT NOT NULL,
                             food_id INT NOT NULL,
                             amount DECIMAL(6, 2) NOT NULL,
                             record_date DATE NOT NULL,
                             FOREIGN KEY (user_id) REFERENCES user_info(user_id),
                             FOREIGN KEY (food_id) REFERENCES food_info(food_id)
);
drop table diet_record;
# 膳食标准表
CREATE TABLE diet_standard (
                               standard_id INT AUTO_INCREMENT PRIMARY KEY,
                               standard_name VARCHAR(50) NOT NULL,
                               age_min INT,
                               age_max INT,
                               gender ENUM('Male', 'Female', 'Other') NOT NULL,
                               carbs_min DECIMAL(5, 2),
                               carbs_max DECIMAL(5, 2),
                               protein_min DECIMAL(5, 2),
                               protein_max DECIMAL(5, 2),
                               fat_min DECIMAL(5, 2),
                               fat_max DECIMAL(5, 2),
                               fiber_min DECIMAL(5, 2),
                               fiber_max DECIMAL(5, 2)
);

# 饮食评分表
CREATE TABLE diet_score (
                            score_id INT AUTO_INCREMENT PRIMARY KEY,
                            user_id INT NOT NULL,
                            record_date DATE NOT NULL,
                            standard_id INT NOT NULL,
                            score DECIMAL(3, 1),
                            FOREIGN KEY (user_id) REFERENCES user_info(user_id),
                            FOREIGN KEY (standard_id) REFERENCES diet_standard(standard_id)
);
# 饮食推荐表
CREATE TABLE diet_recommendation (
                                     rec_id INT AUTO_INCREMENT PRIMARY KEY,
                                     user_id INT NOT NULL,
                                     rec_date DATE NOT NULL,
                                     recommendation TEXT,
                                     FOREIGN KEY (user_id) REFERENCES user_info(user_id)
);
# 插入用户信息
INSERT INTO user_info (username, password, age, gender) VALUES ('user1', 'password1', 25, 'Male'),('user2', 'password2', 20, 'Female');

# 插入食物信息
INSERT INTO food_info (food_name, carbs_per_100g, protein_per_100g, fat_per_100g, fiber_per_100g)
VALUES ('Apple', 14, 0.3, 0.2, 2.4);

#插入膳食标准
INSERT INTO diet_standard (standard_name, age_min, age_max, gender, carbs_min, carbs_max, protein_min, protein_max, fat_min, fat_max, fiber_min, fiber_max)
VALUES ('Standard 1', 18, 30, 'Male', 200, 300, 50, 70, 50, 70, 20, 30);

# 插入饮食记录
INSERT INTO diet_record (user_id, food_id, amount, record_date)
VALUES (1, 1, 150, '2025-07-06');

# 查询用户对应的膳食标准
SELECT standard_id
FROM diet_standard
WHERE age_min <= (SELECT age FROM user_info WHERE user_id = 1)
  AND age_max >= (SELECT age FROM user_info WHERE user_id = 1)
  AND gender = (SELECT gender FROM user_info WHERE user_id = 1);

# 评估饮食记录是否符合膳食标准
SELECT
    d.record_date,
    f.food_name,
    d.amount,
    f.carbs_per_100g * d.amount / 100 AS carbs,
    f.protein_per_100g * d.amount / 100 AS protein,
    f.fat_per_100g * d.amount / 100 AS fat,
    f.fiber_per_100g * d.amount / 100 AS fiber,
    s.carbs_min,
    s.carbs_max,
    s.protein_min,
    s.protein_max,
    s.fat_min,
    s.fat_max,
    s.fiber_min,
    s.fiber_max
FROM
    diet_record d
        JOIN
    food_info f ON d.food_id = f.food_id
        JOIN
    diet_standard s ON s.age_min <= (SELECT age FROM user_info WHERE user_id = d.user_id)
        AND s.age_max >= (SELECT age FROM user_info WHERE user_id = d.user_id)
        AND s.gender = (SELECT gender FROM user_info WHERE user_id = d.user_id)
WHERE
    d.user_id = 1
  AND d.record_date = '2025-07-06';


DELIMITER //

CREATE PROCEDURE CalculateAndInsertScore(IN p_user_id INT, IN p_record_date DATE)
BEGIN
    DECLARE total_carbs DECIMAL(8, 2);
    DECLARE total_protein DECIMAL(8, 2);
    DECLARE total_fat DECIMAL(8, 2);
    DECLARE total_fiber DECIMAL(8, 2);
    DECLARE carbs_min DECIMAL(5, 2);
    DECLARE carbs_max DECIMAL(5, 2);
    DECLARE protein_min DECIMAL(5, 2);
    DECLARE protein_max DECIMAL(5, 2);
    DECLARE fat_min DECIMAL(5, 2);
    DECLARE fat_max DECIMAL(5, 2);
    DECLARE fiber_min DECIMAL(5, 2);
    DECLARE fiber_max DECIMAL(5, 2);
    DECLARE score DECIMAL(3, 1);

    -- 查询用户的饮食记录
    SELECT
        SUM(f.carbs_per_100g * d.amount / 100),
        SUM(f.protein_per_100g * d.amount / 100),
        SUM(f.fat_per_100g * d.amount / 100),
        SUM(f.fiber_per_100g * d.amount / 100)
    INTO
        total_carbs, total_protein, total_fat, total_fiber
    FROM
        diet_record d
            JOIN
        food_info f ON d.food_id = f.food_id
    WHERE
        d.user_id = p_user_id AND d.record_date = p_record_date
    GROUP BY
        d.user_id, d.record_date;

    -- 查询对应的膳食标准
    SELECT
        s.carbs_min, s.carbs_max,
        s.protein_min, s.protein_max,
        s.fat_min, s.fat_max,
        s.fiber_min, s.fiber_max
    INTO
        carbs_min, carbs_max,
        protein_min, protein_max,
        fat_min, fat_max,
        fiber_min, fiber_max
    FROM
        diet_standard s
            JOIN
        user_info u ON s.age_min <= u.age AND s.age_max >= u.age AND s.gender = u.gender
    WHERE
        u.user_id = p_user_id;

    -- 计算评分
    SET score = 10;

    IF total_carbs < carbs_min OR total_carbs > carbs_max THEN
        SET score = score - 0.5;
    END IF;

    IF total_protein < protein_min OR total_protein > protein_max THEN
        SET score = score - 0.5;
    END IF;

    IF total_fat < fat_min OR total_fat > fat_max THEN
        SET score = score - 0.5;
    END IF;

    IF total_fiber < fiber_min OR total_fiber > fiber_max THEN
        SET score = score - 0.5;
    END IF;

    -- 插入评分
    INSERT INTO diet_score (user_id, record_date, standard_id, score)
    VALUES (p_user_id, p_record_date, (SELECT standard_id FROM diet_standard WHERE age_min <= (SELECT age FROM user_info WHERE user_id = p_user_id) AND age_max >= (SELECT age FROM user_info WHERE user_id = p_user_id) AND gender = (SELECT gender FROM user_info WHERE user_id = p_user_id)), score);
END //

DELIMITER ;
# 调用
CALL CalculateAndInsertScore(1, '2025-07-06');
# 查询特定用户在特定日期的评分
SELECT *
FROM diet_score
WHERE user_id = 1 AND record_date = '2025-07-06';



# 添加索引
CREATE INDEX idx_user_date ON diet_record  (user_id, record_date);
# 添加新字段
ALTER TABLE diet_record
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE diet_record
    ADD COLUMN meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL;

-- 体重记录表
CREATE TABLE weight_records (
                                id INT PRIMARY KEY AUTO_INCREMENT,
                                user_id INT NOT NULL,
                                weight DECIMAL(4,1) NOT NULL,
                                record_date DATE NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (user_id) REFERENCES user_info(user_id) ON DELETE CASCADE,
                                INDEX idx_user_date (user_id, record_date)
);



ALTER TABLE food_info
    ADD COLUMN carbohydrate_per_100g DECIMAL(5,2) DEFAULT 0;


UPDATE food_info t
    JOIN shi_wu_cheng_fen_01 tf ON t.food_id = tf.id -- 用id关联
SET t.carbohydrate_per_100g = tf.carbohydrate_per_100g; -- 更新缺失的列

-- 使用 REPLACE，重复的记录会被替换
LOAD DATA LOCAL INFILE 'C:\Users\22382\Desktop\项目\食物成分DataGrip.csv'
    REPLACE INTO TABLE food_info
    FIELDS TERMINATED BY ','
    ENCLOSED BY '"'
    LINES TERMINATED BY '\n'
    IGNORE 1 ROWS
    (food_name, carbs_per_100g, protein_per_100g, fat_per_100g, fiber_per_100g, carbohydrate_per_100g);

LOAD DATA LOCAL INFILE '你的文件路径.csv'
    INTO TABLE food_info
    FIELDS TERMINATED BY ','
    ENCLOSED BY '"'
    LINES TERMINATED BY '\n'
    IGNORE 1 ROWS
    (food_name, carbs_per_100g, protein_per_100g, fat_per_100g, fiber_per_100g, carbohydrate_per_100g);
-- 删除 food_info 表中的某一列
DELETE FROM food_info;
SELECT * FROM diet_record
WHERE user_id = 1
  AND record_date = CURDATE();

-- 检查今天的具体记录
SELECT
    dr.record_id,
    dr.user_id,
    dr.food_id,
    dr.amount,
    dr.record_date,
    dr.meal_type,
    dr.created_at,
    fi.food_name,
    fi.protein_per_100g,
    fi.fat_per_100g,
    fi.carbohydrate_per_100g,
    fi.carbs_per_100g
FROM diet_record dr
         JOIN food_info fi ON dr.food_id = fi.food_id
WHERE dr.user_id = 1
  AND dr.record_date = CURDATE();

ALTER TABLE weight_records
    ADD COLUMN height DECIMAL(4,1) NOT NULL;

ALTER TABLE user_info
    ADD COLUMN height DECIMAL(4,1) NOT NULL;

CREATE TABLE recipe (
                        recipe_id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        recipe_name VARCHAR(100) NOT NULL,
                        meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES user_info(user_id)
);
CREATE TABLE recipe_detail (
                               detail_id INT AUTO_INCREMENT PRIMARY KEY,
                               recipe_id INT NOT NULL,
                               food_id INT NOT NULL,
                               amount DECIMAL(8,2) NOT NULL COMMENT '食物克重',
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               FOREIGN KEY (recipe_id) REFERENCES recipe(recipe_id),
                               FOREIGN KEY (food_id) REFERENCES food_info(food_id)
);

# 运动记录
CREATE TABLE exercise_record (
                                 exercise_id INT AUTO_INCREMENT PRIMARY KEY,
                                 user_id INT NOT NULL,
                                 exercise_type VARCHAR(50) NOT NULL COMMENT '运动类型：walking, running, cycling等',
                                 duration INT NOT NULL COMMENT '运动时长（分钟）',
                                 distance DECIMAL(8,2) COMMENT '距离（公里）',
                                 steps INT COMMENT '步数',
                                 calories INT COMMENT '消耗卡路里',
                                 heart_rate INT COMMENT '平均心率',
                                 notes TEXT COMMENT '备注',
                                 exercise_date DATE NOT NULL COMMENT '运动日期',
                                 start_time TIME COMMENT '开始时间',
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 FOREIGN KEY (user_id) REFERENCES user_info(user_id)
);
# 运动汇总
CREATE TABLE daily_exercise_summary (
                                        summary_id INT AUTO_INCREMENT PRIMARY KEY,
                                        user_id INT NOT NULL,
                                        record_date DATE NOT NULL,
                                        total_steps INT DEFAULT 0,
                                        total_distance DECIMAL(8,2) DEFAULT 0,
                                        total_calories INT DEFAULT 0,
                                        total_duration INT DEFAULT 0,
                                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                        UNIQUE KEY unique_user_date (user_id, record_date),
                                        FOREIGN KEY (user_id) REFERENCES user_info(user_id)
);