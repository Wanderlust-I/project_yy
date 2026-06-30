const allFilter = "all";
const DEFAULT_LIMIT = 100;

function padNumber(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  return `${year}-${month}-${day}`;
}

function formatTodayText() {
  const date = new Date();
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
}

function getDateLabel(visitDate) {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const todayText = formatDate(today);
  const tomorrowText = formatDate(tomorrow);

  if (visitDate === todayText) {
    return "今天";
  }

  if (visitDate === tomorrowText) {
    return "明天";
  }

  return visitDate ? visitDate.slice(5).replace("-", "/") : "未定";
}

function getStatusType(status) {
  const statusMap = {
    pending: "pending",
    active: "active",
    ready: "ready",
    approved: "ready",
    completed: "ready",
  };

  return statusMap[status] || "ready";
}

function getStatusText(item) {
  if (item.statusText) {
    return item.statusText;
  }

  const statusTextMap = {
    pending: "待确认",
    active: "进行中",
    ready: "已安排",
    approved: "已安排",
    completed: "已完成",
  };

  return statusTextMap[item.status] || "已安排";
}

function summarizeHost(item) {
  const department = item.department || "未设置部门";
  const applicantName = item.applicantName || "未填写";

  return `${department} · ${applicantName}`;
}

function buildActivity(item = {}, index = 0) {
  const visitDate = item.visitDate || "";
  const statusType = getStatusType(item.status);
  const filterTypes = [statusType];

  if (visitDate === formatDate(new Date())) {
    filterTypes.push("today");
  }

  return {
    id: item._id || item.id || `reception-${index}`,
    dateLabel: getDateLabel(visitDate),
    visitDate,
    startTime: item.startTime || "",
    time: `${item.startTime || "--:--"}-${item.endTime || "--:--"}`,
    title: item.title || "未命名接待",
    company: item.company || "未填写来访单位",
    place: item.place || "未定地点",
    host: summarizeHost(item),
    visitors: `${Number(item.visitorCount) || 0}人`,
    services: Array.isArray(item.services) ? item.services : [],
    status: getStatusText(item),
    statusType,
    filterTypes,
  };
}

function compareActivities(a, b) {
  const aValue = `${a.visitDate || "9999-99-99"} ${a.startTime || "99:99"}`;
  const bValue = `${b.visitDate || "9999-99-99"} ${b.startTime || "99:99"}`;

  return aValue.localeCompare(bValue);
}

function buildSummary(activities) {
  const todayText = formatDate(new Date());
  const todayCount = activities.filter((item) => item.visitDate === todayText).length;
  const activeCount = activities.filter((item) => item.statusType === "active").length;
  const pendingCount = activities.filter((item) => item.statusType === "pending").length;

  return [
    {
      label: "今日活动",
      value: String(todayCount),
      unit: "场",
      theme: "primary",
    },
    {
      label: "进行中",
      value: String(activeCount),
      unit: "场",
      theme: "amber",
    },
    {
      label: "待确认",
      value: String(pendingCount),
      unit: "项",
      theme: "coral",
    },
  ];
}

Page({
  data: {
    todayText: formatTodayText(),
    summary: [
      {
        label: "今日活动",
        value: "0",
        unit: "场",
        theme: "primary",
      },
      {
        label: "进行中",
        value: "0",
        unit: "场",
        theme: "amber",
      },
      {
        label: "待确认",
        value: "0",
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
    activities: [],
    visibleActivities: [],
    visibleCount: 0,
    isLoading: false,
    errorText: "",
    emptyText: "审批通过后的接待会显示在这里",
  },

  onLoad() {
    const app = getApp();
    if (!app.ensureLogin()) {
      return;
    }
  },

  onShow() {
    const app = getApp();
    if (!app.ensureLogin()) {
      return;
    }

    this.setData({
      todayText: formatTodayText(),
    });
    this.loadReceptions();
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
    const { activeFilter, activities, errorText } = this.data;
    const visibleActivities =
      activeFilter === allFilter
        ? activities
        : activities.filter((item) => item.filterTypes.indexOf(activeFilter) > -1);
    const emptyText = errorText || (activities.length === 0 ? "审批通过后的接待会显示在这里" : "当前筛选暂无接待");

    this.setData({
      visibleActivities,
      visibleCount: visibleActivities.length,
      emptyText,
    });
  },

  setActivities(activities, errorText = "") {
    const sortedActivities = activities.slice().sort(compareActivities);

    this.setData(
      {
        activities: sortedActivities,
        summary: buildSummary(sortedActivities),
        errorText,
      },
      () => this.updateVisibleActivities()
    );
  },

  loadReceptions() {
    this.setData({
      isLoading: true,
      errorText: "",
    });

    if (!wx.cloud || !wx.cloud.callFunction) {
      this.setActivities([], "请启用云开发后查看正式接待");
      this.setData({
        isLoading: false,
      });
      return;
    }

    wx.cloud.callFunction({
      name: "listReceptions",
      data: {
        limit: DEFAULT_LIMIT,
      },
      success: (res) => {
        const result = (res && res.result) || {};

        if (!result.success) {
          this.setActivities([], result.message || "正式接待列表加载失败");
          return;
        }

        const activities = Array.isArray(result.items)
          ? result.items.map((item, index) => buildActivity(item, index))
          : [];

        this.setActivities(activities);
      },
      fail: (err) => {
        console.warn("listReceptions failed", err);
        this.setActivities([], "正式接待列表加载失败");
      },
      complete: () => {
        this.setData({
          isLoading: false,
        });
      },
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
