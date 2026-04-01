// server/config/database.js
const mysql = require('mysql2/promise');

// 数据库配置 
const dbConfig = {
    host: 'localhost',           // 数据库地址
    user: 'root',               // 数据库用户名
    password: '123456',         // 数据库密码
    database: 'food',  // 数据库名
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ 数据库连接成功');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        return false;
    }
}

// 初始化时测试连接
testConnection();

module.exports = pool;