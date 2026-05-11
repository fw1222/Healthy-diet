# Healthy-diet
# 膳食健康助手
基于微信小程序的智能膳食健康管理工具，帮助用户记录饮食、分析营养、获取健康评分与个性化建议。

# 项目简介
本项目为广州大学大学生创新训练项目（校级理工类）。系统提供便捷的膳食记录、科学的营养分析、动态健康评分、拍照识别食物、食谱复用与长期健康趋势跟踪等功能，旨在引导用户形成健康的饮食习惯，从源头上预防慢性病。

# 核心功能

- **膳食记录**：支持按餐次记录食物，实时汇总蛋白质、脂肪、碳水、热量等营养数据。
- **营养评分**：基于《中国居民膳食指南》的动态评分算法，摄入不足或过量均会扣分，评分结果更科学。
- **扣分可视化**：详细展示每项营养素的扣分原因与改进建议。
- **拍照识别**：集成腾讯云图像识别API，自动识别食物并匹配营养数据。
- **食谱复用**：支持保存常用食物组合为一键复用模板，提升记录效率。
- **健康趋势**：展示BMI、体重、评分变化趋势，支持月度/年度视图切换。
- **登录与会话保护**：微信原生登录，支持未登录页面跳转保护与自动恢复。

# 技术架构

- **前端**：微信小程序原生框架（JS + WXML + WXSS）
- **后端**：Node.js + Express
- **数据库**：MySQL
- **第三方服务**：腾讯云图像识别API
- **通信方式**：RESTful API + Promise异步封装

# 项目亮点

- 基于营养范围的动态评分机制
- 扣分详情透明可视化
- 拍照识别 + 手动修正双重保障
- 食谱复用提升记录效率
- 健康趋势图表与长期档案管理
- 模块化设计与接口规范

# 项目成果

- 完成6个核心小程序页面（登录、首页、记录、详情、食谱、个人中心）
  
登录<img width="234" height="501" alt="image" src="https://github.com/user-attachments/assets/1af856ea-1874-4cd7-af26-523deb7d22d3" />
首页<img width="154" height="339" alt="image" src="https://github.com/user-attachments/assets/b5379d98-9561-4af1-ae7b-6c16320e9d43" /><img width="163" height="342" alt="image" src="https://github.com/user-attachments/assets/94be088f-6340-48d2-b5bf-d8375ffec071" /><img width="157" height="332" alt="image" src="https://github.com/user-attachments/assets/2c336074-5687-4912-a767-1fcbc1a1b4ee" /><img width="151" height="326" alt="image" src="https://github.com/user-attachments/assets/f76bbc83-4ba8-45d3-b491-7f93a89ea420" />
记录<img width="168" height="367" alt="image" src="https://github.com/user-attachments/assets/895013cb-049b-49dc-afb3-e49460c7ce23" /><img width="172" height="370" alt="image" src="https://github.com/user-attachments/assets/1afb9191-e879-41f3-99c2-b142bd836f7e" /><img width="189" height="406" alt="image" src="https://github.com/user-attachments/assets/445680d2-ba4d-4fda-be4e-77d431eff32d" />
详情<img width="146" height="307" alt="image" src="https://github.com/user-attachments/assets/e1ba7178-3539-4252-9f45-bce3a689b08d" /><img width="146" height="305" alt="image" src="https://github.com/user-attachments/assets/95befc1c-3577-43e5-b15f-8726b2518a20" /><img width="163" height="348" alt="image" src="https://github.com/user-attachments/assets/556d9dc6-a204-46f2-87d5-81f20ff088bd" /><img width="157" height="344" alt="image" src="https://github.com/user-attachments/assets/4b94c4ef-3ceb-4383-bd99-e7c1abbb2cae" />
食谱<img width="168" height="358" alt="image" src="https://github.com/user-attachments/assets/f4dc8789-b578-4631-811a-a53fc2abf0c6" />
个人中心<img width="163" height="352" alt="image" src="https://github.com/user-attachments/assets/7f346bf5-41c2-4521-b995-fac002bbbb79" />

- 实现15+个RESTful API接口
- 集成腾讯云图像识别功能
- 实现动态营养评分与扣分逻辑
- 完成用户健康趋势图表绘制
- 软件著作权正在申请中

# 项目结构（简述）



```
├── frontend/          # 微信小程序前端代码
├── backend/           # Node.js + Express 后端服务
├── database/          # MySQL 数据库脚本
├── docs/              # 需求文档、接口文档、用户手册
└── assets/            # 图片、截图等资源
```



# 运行方式

1. 克隆项目到本地
2. 导入 `frontend` 到微信开发者工具
3. 配置 `backend` 中的环境变量（数据库、腾讯云密钥等）
4. 启动后端服务：`node app.js`
5. 在小程序中配置合法请求域名并运行


# 开源说明

本项目为大学生创新创业训练计划成果，仅供学习交流使用。如需使用或二次开发，请保留作者信息并联系项目负责人获取授权。

# 后续优化方向

- 扩充食物数据库
- 提升拍照识别准确率
- 增加社交与分享功能
- 完善异常场景测试与代码注释

