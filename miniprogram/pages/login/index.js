Page({
  data: {
    appName: "接待管理",
    envId: "",
    isLoggingIn: false,
    canUseGetUserProfile: false,
  },

  onLoad() {
    const app = getApp();

    this.setData({
      appName: app.globalData.appName,
      envId: app.globalData.cloudEnvId,
      canUseGetUserProfile: !!wx.getUserProfile,
    });

    if (app.globalData.isLoggedIn) {
      this.goHome();
    }
  },

  onTapLogin() {
    if (this.data.isLoggingIn) {
      return;
    }

    if (!this.data.canUseGetUserProfile) {
      wx.showModal({
        title: "微信版本过低",
        content: "请升级微信后再使用授权登录",
        showCancel: false,
      });
      return;
    }

    this.setData({
      isLoggingIn: true,
    });

    wx.getUserProfile({
      desc: "用于完善接待管理账号资料",
      success: (profileRes) => {
        this.loginWithWechat(profileRes.userInfo);
      },
      fail: () => {
        this.setData({
          isLoggingIn: false,
        });
        wx.showToast({
          title: "需要授权后登录",
          icon: "none",
        });
      },
    });
  },

  loginWithWechat(userInfo) {
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.handleLoginError("微信登录失败");
          return;
        }

        this.registerUser(userInfo, loginRes.code);
      },
      fail: () => {
        this.handleLoginError("微信登录失败");
      },
    });
  },

  registerUser(userInfo, loginCode) {
    if (!wx.cloud || !wx.cloud.callFunction) {
      this.handleLoginError("请启用云开发");
      return;
    }

    wx.cloud.callFunction({
      name: "registerUser",
      data: {
        userInfo,
      },
      success: (res) => {
        const result = (res && res.result) || {};

        if (!result.success || !result.user) {
          this.handleLoginError(result.message || "用户注册失败");
          return;
        }

        const app = getApp();
        app.setLoginInfo({
          userInfo: result.user,
          loginCode,
          authAt: new Date().toISOString(),
        });

        wx.showToast({
          title: "登录成功",
          icon: "success",
        });

        this.goHome();
      },
      fail: () => {
        this.handleLoginError("用户注册失败");
      },
    });
  },

  handleLoginError(message) {
    this.setData({
      isLoggingIn: false,
    });

    wx.showToast({
      title: message,
      icon: "none",
    });
  },

  goHome() {
    wx.switchTab({
      url: "/pages/index/index",
    });
  },
});
