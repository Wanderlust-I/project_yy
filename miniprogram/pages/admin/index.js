Page({
  data: {
    user: {
      name: "",
      department: "",
      role: "",
    },
    modules: [
      {
        title: "用户管理",
        desc: "账号、部门、角色",
        type: "users",
        theme: "primary",
      },
      {
        title: "招待管理",
        desc: "申请、审批、正式接待",
        type: "receptions",
        theme: "amber",
      },
    ],
  },

  onLoad() {
    this.syncCurrentUser();
  },

  onShow() {
    this.syncCurrentUser();
  },

  syncCurrentUser() {
    const app = getApp();

    if (!app.ensureLogin()) {
      return;
    }

    this.setData({
      user: app.globalData.currentUser || {},
    });
  },

  onTapModule(e) {
    const { type } = e.currentTarget.dataset;
    const messageMap = {
      users: "用户管理页面将在下一步开发",
      receptions: "招待管理页面将在下一步开发",
    };

    wx.showToast({
      title: messageMap[type] || "功能建设中",
      icon: "none",
    });
  },
});
