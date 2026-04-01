// app.js
// app.js
App({
  globalData: {
    baseUrl: 'http://172.29.119.21:3000', 
    user_Info: null,
    user_Id: null
  },

  onLaunch() {
    // 检查登录状态
    console.log('🚀 小程序启动，baseUrl:', this.globalData.baseUrl);
    this.checkLogin();
  },

  // 检查登录状态
  checkLogin() {
    const token = wx.getStorageSync('token');
    const user_Info = wx.getStorageSync('user_Info');
    
    if (token && userInfo) {
      this.globalData.user_Info = user_Info;
      this.globalData.user_Id = user_Info.user_id;
    }
  },

  // 登录方法
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            wx.getUserProfile({
              desc: '用于完善会员资料',
              success: (userRes) => {
                // 调用后端登录接口
                wx.request({
                  url: `${this.globalData.baseUrl}/api/login`,
                  method: 'POST',
                  data: {
                    code: loginRes.code,
                    userInfo: userRes.userInfo
                  },
                  success: (apiRes) => {
                    if (apiRes.data.success) {
                      const userInfo = apiRes.data.data.user;
                      this.globalData.userInfo = userInfo;
                      this.globalData.userId = userInfo.id;
                      
                      // 存储用户信息
                      wx.setStorageSync('userInfo', userInfo);
                      
                      resolve(userInfo);
                    } else {
                      reject(new Error('登录失败'));
                    }
                  },
                  fail: reject
                });
              },
              fail: reject
            });
          } else {
            reject(new Error('登录失败'));
          }
        },
        fail: reject
      });
    });
  }
});
