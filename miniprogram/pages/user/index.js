Page({
  data: {
    user: {
      name: "万峻",
      department: "投行一部",
      role: "申请人",
    },
    avatarText: "万",
    today: "4月21日 周二",
    stats: [
      {
        label: "今日接待",
        value: "3",
        unit: "场",
        note: "1场待确认",
        theme: "primary",
      },
      {
        label: "待我审批",
        value: "2",
        unit: "项",
        note: "最晚今日处理",
        theme: "amber",
      },
      {
        label: "车辆登记",
        value: "5",
        unit: "辆",
        note: "2辆未到达",
        theme: "coral",
      },
      {
        label: "本周归档",
        value: "8",
        unit: "单",
        note: "费用待补2单",
        theme: "slate",
      },
    ],
    quickActions: [
      {
        title: "新建接待",
        desc: "发起申请",
        icon: "add",
        type: "create",
      },
      {
        title: "今日接待",
        desc: "查看安排",
        icon: "calendar",
        type: "today",
      },
      {
        title: "车辆登记",
        desc: "门岗放行",
        icon: "car",
        type: "vehicle",
      },
      {
        title: "待我审批",
        desc: "处理流程",
        icon: "check",
        type: "approval",
      },
    ],
    schedules: [
      {
        time: "10:30",
        title: "省海港集团领导来访交流",
        place: "浙商证券总部 1702会议室",
        people: "约4人",
        status: "待会场确认",
        statusType: "warning",
      },
      {
        time: "14:00",
        title: "机构客户业务沟通会",
        place: "16楼第一会议室",
        people: "6人",
        status: "执行中",
        statusType: "active",
      },
      {
        time: "16:30",
        title: "投行项目材料交流",
        place: "线上会议",
        people: "3人",
        status: "已安排",
        statusType: "done",
      },
    ],
    todos: [
      {
        title: "确认1702会议室电子屏内容",
        owner: "会务",
        due: "09:30前",
      },
      {
        title: "补充来访车牌登记",
        owner: "申请人",
        due: "接待前",
      },
      {
        title: "同步桌签与茶水需求",
        owner: "行政",
        due: "今日",
      },
    ],
    vehicleNotice: {
      count: 2,
      text: "浙B车辆待补充车牌，门岗暂未放行",
      action: "去登记",
    },
  },

  onLoad() {
    const app = getApp();
    if (app.globalData && app.globalData.currentUser) {
      const { currentUser } = app.globalData;
      this.setData({
        user: currentUser,
        avatarText: currentUser.name ? currentUser.name.slice(0, 1) : "",
      });
    }
  },

  onTapQuickAction(e) {
    const { type } = e.currentTarget.dataset;
    if (type === "create") {
      wx.navigateTo({
        url: "/pages/reception-create/index",
      });
      return;
    }

    const actionMap = {
      today: "今日接待列表将在下一步开发",
      vehicle: "车辆登记页面将在下一步开发",
      approval: "审批中心将在下一步开发",
    };

    wx.showToast({
      title: actionMap[type] || "功能建设中",
      icon: "none",
    });
  },

  onTapSchedule(e) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.schedules[index];

    wx.showToast({
      title: item.title,
      icon: "none",
    });
  },

  onTapTodo(e) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.todos[index];

    wx.showToast({
      title: item.title,
      icon: "none",
    });
  },

  onTapVehicleNotice() {
    wx.showToast({
      title: "车辆登记页面将在下一步开发",
      icon: "none",
    });
  },
});
