const CLOUD_ENV_ID = "zhaodaitest-d7gs08n9v0eb71575";
const LOGIN_STORAGE_KEY = "wechatLoginInfo";
const LEGACY_RECEPTION_APPROVAL_KEYS = ["receptionApprovalItems", "latestReceptionApplication"];

function buildCurrentUser(userInfo = {}) {
  const name = userInfo.nickName || "微信用户";

  return {
    name,
    nickName: name,
    avatarUrl: userInfo.avatarUrl || "",
    department: userInfo.department || "未设置部门",
    role: userInfo.role || "申请人",
  };
}

function clearLegacyReceptionApprovalCache() {
  LEGACY_RECEPTION_APPROVAL_KEYS.forEach((key) => {
    wx.removeStorageSync(key);
  });
}

App({
  onLaunch: function () {
    clearLegacyReceptionApprovalCache();

    this.globalData = {
      appName: "接待管理",
      cloudEnvId: CLOUD_ENV_ID,
      currentUser: null,
      isLoggedIn: false,
      loginInfo: null,
      loginCode: "",
    };

    this.initCloud();
    this.restoreLogin();
  },

  initCloud() {
    if (!wx.cloud) {
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true,
    });
  },

  restoreLogin() {
    const loginInfo = wx.getStorageSync(LOGIN_STORAGE_KEY);

    if (loginInfo && loginInfo.userInfo) {
      this.setLoginInfo(loginInfo, {
        persist: false,
      });
    }
  },

  setLoginInfo(loginInfo, options = {}) {
    const shouldPersist = options.persist !== false;
    const currentUser = buildCurrentUser(loginInfo.userInfo);
    const { loginCode = "", ...persistableLoginInfo } = loginInfo;
    const nextLoginInfo = {
      ...persistableLoginInfo,
      currentUser,
      cloudEnvId: CLOUD_ENV_ID,
    };

    this.globalData.currentUser = currentUser;
    this.globalData.isLoggedIn = true;
    this.globalData.loginInfo = nextLoginInfo;
    this.globalData.loginCode = loginCode;

    if (shouldPersist) {
      wx.setStorageSync(LOGIN_STORAGE_KEY, nextLoginInfo);
    }

    return currentUser;
  },

  clearLogin() {
    this.globalData.currentUser = null;
    this.globalData.isLoggedIn = false;
    this.globalData.loginInfo = null;
    this.globalData.loginCode = "";
    wx.removeStorageSync(LOGIN_STORAGE_KEY);
  },

  ensureLogin() {
    if (this.globalData.isLoggedIn) {
      return true;
    }

    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];

    if (currentPage && currentPage.route === "pages/login/index") {
      return false;
    }

    wx.reLaunch({
      url: "/pages/login/index",
    });

    return false;
  },
});
