// app.js
const auth = require("./utils/auth");

App({
  globalData: {
    baseUrl: "http://172.29.179.225:3000",
    userInfo: null,
    userId: null,
  },

  onLaunch() {
    console.log("🚀 小程序启动，baseUrl:", this.globalData.baseUrl);
    this.restoreSession();
  },

  restoreSession() {
    auth.restoreAppSession();
  },

  checkLogin() {
    return auth.restoreAppSession();
  },

  login() {
    console.log('🔐 开始登录流程')  
    return new Promise((resolve, reject) => {
        wx.login({
            success: (loginRes) => {
                console.log('✅ wx.login 成功', loginRes)  
                if (!loginRes.code) {
                    reject(new Error('登录失败'))
                    return
                }
                
                // 获取用户信息
                wx.getUserInfo({
                    success: (userInfoRes) => {
                        wx.request({
                            url: `${this.globalData.baseUrl}/api/login`,
                            method: 'POST',
                            data: {
                                code: loginRes.code,
                                userInfo: userInfoRes.userInfo
                            },
                            success: (apiRes) => {
                                if (apiRes.data && apiRes.data.success) {
                                    const u = apiRes.data.data.user
                                    auth.setSession(u)
                                    resolve(auth.getUserInfo())
                                } else {
                                    reject(new Error((apiRes.data && apiRes.data.message) || '登录失败'))
                                }
                            },
                            fail: (err) => {
                                reject(err)
                            }
                        })
                    },
                    fail: (err) => {
                        console.error('❌ 获取用户信息失败:', err)  
                        // 用户拒绝授权，使用默认信息继续登录
                        wx.request({
                            url: `${this.globalData.baseUrl}/api/login`,
                            method: 'POST',
                            data: {
                                code: loginRes.code,
                                userInfo: null
                            },
                            success: (apiRes) => {
                                console.log('✅ 使用默认信息登录成功:', apiRes.data)
                                if (apiRes.data && apiRes.data.success) {
                                    const u = apiRes.data.data.user
                                    auth.setSession(u)
                                    resolve(auth.getUserInfo())
                                } else {
                                    reject(new Error((apiRes.data && apiRes.data.message) || '登录失败'))
                                }
                            },
                            fail: reject
                        })
                    }
                })
            },
            fail: (err) => {
                console.error('❌ wx.login 失败:', err)  
                reject(err)
            }
        })
    })
}
});
