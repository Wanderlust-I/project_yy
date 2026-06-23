const allFilter = "all";

Page({
  data: {
    todayText: "4月21日 周二",
    summary: [
      {
        label: "今日活动",
        value: "5",
        unit: "场",
        theme: "primary",
      },
      {
        label: "进行中",
        value: "1",
        unit: "场",
        theme: "amber",
      },
      {
        label: "待确认",
        value: "2",
        unit: "项",
        theme: "coral",
      },
    ],
    filters: [
      {
        label: "全部",
        value: allFilter,
        selected: true,
      },
      {
        label: "今日",
        value: "today",
        selected: false,
      },
      {
        label: "待确认",
        value: "pending",
        selected: false,
      },
      {
        label: "已安排",
        value: "ready",
        selected: false,
      },
    ],
    activeFilter: allFilter,
    activities: [
      {
        id: 1,
        dateLabel: "今天",
        time: "10:30-11:30",
        title: "省海港集团领导来访交流",
        company: "浙江省海港投资运营集团",
        place: "总部 1702会议室",
        host: "投行一部 · 万峻",
        visitors: "4人",
        services: ["会议室", "桌签", "茶水"],
        status: "待会场确认",
        statusType: "pending",
        filterTypes: ["today", "pending"],
      },
      {
        id: 2,
        dateLabel: "今天",
        time: "14:00-15:20",
        title: "机构客户业务沟通会",
        company: "华东区机构客户团队",
        place: "16楼第一会议室",
        host: "财富管理部 · 陈晓",
        visitors: "6人",
        services: ["投屏", "茶歇", "车辆"],
        status: "进行中",
        statusType: "active",
        filterTypes: ["today"],
      },
      {
        id: 3,
        dateLabel: "今天",
        time: "16:30-17:30",
        title: "投行项目材料交流",
        company: "项目合作方",
        place: "线上会议",
        host: "投行一部 · 万峻",
        visitors: "3人",
        services: ["线上会议"],
        status: "已安排",
        statusType: "ready",
        filterTypes: ["today", "ready"],
      },
      {
        id: 4,
        dateLabel: "明天",
        time: "09:30-11:00",
        title: "上市公司路演接待",
        company: "北方基金调研团队",
        place: "总部 1508会议室",
        host: "研究所 · 林然",
        visitors: "8人",
        services: ["会议室", "用餐", "车辆"],
        status: "待行政确认",
        statusType: "pending",
        filterTypes: ["pending"],
      },
    ],
    visibleActivities: [],
    visibleCount: 0,
  },

  onLoad() {
    const app = getApp();
    if (!app.ensureLogin()) {
      return;
    }

    this.updateVisibleActivities();
  },

  onShow() {
    const app = getApp();
    app.ensureLogin();
  },

  onSelectFilter(e) {
    const { value } = e.currentTarget.dataset;
    const filters = this.data.filters.map((item) => ({
      ...item,
      selected: item.value === value,
    }));

    this.setData(
      {
        activeFilter: value,
        filters,
      },
      () => this.updateVisibleActivities()
    );
  },

  updateVisibleActivities() {
    const { activeFilter, activities } = this.data;
    const visibleActivities =
      activeFilter === allFilter
        ? activities
        : activities.filter((item) => item.filterTypes.indexOf(activeFilter) > -1);

    this.setData({
      visibleActivities,
      visibleCount: visibleActivities.length,
    });
  },

  onTapCreate() {
    wx.switchTab({
      url: "/pages/reception-create/index",
    });
  },

  onTapActivity(e) {
    const { id } = e.currentTarget.dataset;
    const activity = this.data.activities.filter((item) => item.id === id)[0];

    wx.showToast({
      title: activity ? activity.title : "接待活动",
      icon: "none",
    });
  },
});
