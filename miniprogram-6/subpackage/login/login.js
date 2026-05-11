// pages/login/login.js
const app = getApp()
const auth = require('../../utils/auth')

Page({
  data: {},

  handleLogin() {
    app
      .login()
      .then(() => {
        wx.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          auth.navigateAfterLogin()
        }, 400)
      })
      .catch((err) => {
        wx.showToast({
          title: (err && err.message) || '登录失败',
          icon: 'none'
        })
      })
  }
})
