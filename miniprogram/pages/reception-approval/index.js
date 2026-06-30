const APPROVAL_STORAGE_KEY = "receptionApplicationApprovalItems";
const LATEST_RECEPTION_STORAGE_KEY = "latestReceptionApplicationForApproval";
const DEFAULT_LIMIT = 50;
const MODE_PENDING = "pending";
const MODE_PROCESSED = "processed";

function padNumber(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function getReceptionId(item = {}) {
  return item._id || item.id || "";
}

function getTimestamp(value) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Date.parse(value) || 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (value.$date) {
    return typeof value.$date === "number" ? value.$date : Date.parse(value.$date) || 0;
  }

  if (typeof value.toISOString === "function") {
    return Date.parse(value.toISOString()) || 0;
  }

  return 0;
}

function formatCreatedText(item) {
  const timestamp = getTimestamp(item.updatedAt) || getTimestamp(item.createdAt);

  if (!timestamp) {
    return "刚刚提交";
  }

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function formatApprovalText(item) {
  const timestamp = getTimestamp(item.approvedAt) || getTimestamp(item.updatedAt);

  if (!timestamp) {
    return "暂无审批时间";
  }

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function getStatusText(status) {
  const statusMap = {
    pending: "待审批",
    approved: "已通过",
    rejected: "已驳回",
  };

  return statusMap[status] || "待审批";
}

function summarizePeople(list, emptyText) {
  if (!Array.isArray(list) || list.length === 0) {
    return emptyText;
  }

  return list
    .map((item) => {
      const name = item && item.name ? item.name : "";
      const position = item && item.position ? item.position : "";
      return position ? `${name}（${position}）` : name;
    })
    .filter(Boolean)
    .join("、") || emptyText;
}

function summarizeApprover(item) {
  const department = item.approvedByDepartment || "";
  const name = item.approvedByName || "";

  if (department && name) {
    return `${department} · ${name}`;
  }

  return name || department || "未记录审批人";
}

function buildApprovalItem(item = {}, index = 0, source = "cloud") {
  const id = getReceptionId(item) || `local-${index}-${item.updatedAt || Date.now()}`;
  const services = Array.isArray(item.services) ? item.services : [];
  const staff = Array.isArray(item.staff) ? item.staff : [];
  const visitors = Array.isArray(item.visitors) ? item.visitors : [];
  const startTime = item.startTime || "--:--";
  const endTime = item.endTime || "--:--";
  const status = item.status || "pending";
  const canProcess = status === "pending";

  return {
    ...item,
    id,
    source,
    status,
    statusTheme: status,
    statusText: getStatusText(status),
    canProcess,
    isRecord: !canProcess,
    title: item.title || "未命名招待申请",
    type: item.type || "招待申请",
    company: item.company || "未填写来访单位",
    applicantName: item.applicantName || "未填写",
    department: item.department || "未设置部门",
    contactName: item.contactName || "未填写",
    contactPhone: item.contactPhone || "未填写",
    visitDate: item.visitDate || "未定日期",
    timeText: `${startTime}-${endTime}`,
    place: item.place || "未定地点",
    visitorCount: Number(item.visitorCount) || 0,
    services,
    staffText: summarizePeople(staff, "暂无我方人员"),
    visitorsText: summarizePeople(visitors, "暂无对方人员"),
    notes: item.notes || "",
    createdText: formatCreatedText(item),
    approvedText: formatApprovalText(item),
    approverText: summarizeApprover(item),
    footerTimeText: canProcess ? `提交：${formatCreatedText(item)}` : `审批：${formatApprovalText(item)}`,
    officialReceptionText: item.officialReceptionId ? "已生成正式接待" : "",
  };
}

function getLocalPendingApprovals() {
  const storedItems = wx.getStorageSync(APPROVAL_STORAGE_KEY);
  const latestItem = wx.getStorageSync(LATEST_RECEPTION_STORAGE_KEY);
  const sourceItems = Array.isArray(storedItems) ? storedItems.slice() : [];

  if (latestItem && latestItem.status === "pending") {
    sourceItems.unshift(latestItem);
  }

  const seenIds = {};

  return sourceItems.filter((item) => {
    if (!item || item.status !== "pending") {
      return false;
    }

    const id = getReceptionId(item);
    if (id && seenIds[id]) {
      return false;
    }

    if (id) {
      seenIds[id] = true;
    }

    return true;
  });
}

function updateLocalApprovalStatus(id, status, user) {
  const now = new Date().toISOString();
  const patchItem = (item) => {
    if (!item || getReceptionId(item) !== id) {
      return item;
    }

    return {
      ...item,
      status,
      approvedByName: user.name || "",
      approvedByDepartment: user.department || "",
      approvedAt: now,
      updatedAt: now,
    };
  };

  const storedItems = wx.getStorageSync(APPROVAL_STORAGE_KEY);
  if (Array.isArray(storedItems)) {
    wx.setStorageSync(APPROVAL_STORAGE_KEY, storedItems.map(patchItem));
  }

  const latestItem = wx.getStorageSync(LATEST_RECEPTION_STORAGE_KEY);
  if (latestItem && getReceptionId(latestItem) === id) {
    wx.setStorageSync(LATEST_RECEPTION_STORAGE_KEY, patchItem(latestItem));
  }
}

function replaceLocalPendingApprovals(items) {
  const pendingItems = Array.isArray(items) ? items.filter((item) => item && item.status === "pending") : [];

  if (pendingItems.length) {
    wx.setStorageSync(APPROVAL_STORAGE_KEY, pendingItems);
  } else {
    wx.removeStorageSync(APPROVAL_STORAGE_KEY);
  }

  wx.removeStorageSync(LATEST_RECEPTION_STORAGE_KEY);
}

Page({
  data: {
    approvalModes: [
      {
        label: "待审批",
        value: MODE_PENDING,
        selected: true,
      },
      {
        label: "审批记录",
        value: MODE_PROCESSED,
        selected: false,
      },
    ],
    activeMode: MODE_PENDING,
    summaryLabel: "待审批",
    approvals: [],
    totalCount: 0,
    isLoading: false,
    isProcessing: false,
    processingId: "",
    errorText: "",
    emptyTitle: "暂无待审批的招待申请",
    emptyText: "新提交的招待申请会出现在这里",
    user: {
      name: "",
      department: "",
    },
  },

  onLoad() {
    this.syncCurrentUser();
  },

  onShow() {
    if (this.syncCurrentUser()) {
      this.loadApprovals();
    }
  },

  onPullDownRefresh() {
    this.loadApprovals(() => {
      wx.stopPullDownRefresh();
    });
  },

  syncCurrentUser() {
    const app = getApp();

    if (!app.ensureLogin()) {
      return false;
    }

    const { currentUser } = app.globalData;
    this.setData({
      user: currentUser || {},
    });

    return true;
  },

  setApprovalItems(items, errorText = "") {
    const isPendingMode = this.data.activeMode === MODE_PENDING;

    this.setData({
      approvals: items,
      totalCount: items.length,
      errorText,
      summaryLabel: isPendingMode ? "待审批" : "审批记录",
      emptyTitle: isPendingMode ? "暂无待审批的招待申请" : "暂无审批记录",
      emptyText: errorText || (isPendingMode ? "新提交的招待申请会出现在这里" : "通过或驳回过的申请会出现在这里"),
    });
  },

  loadApprovals(done) {
    const requestedMode = this.data.activeMode;
    const localItems =
      requestedMode === MODE_PENDING
        ? getLocalPendingApprovals().map((item, index) => buildApprovalItem(item, index, "local"))
        : [];

    this.setData({
      isLoading: true,
      errorText: "",
    });

    if (!wx.cloud || !wx.cloud.callFunction) {
      this.setApprovalItems(localItems, requestedMode === MODE_PENDING ? "" : "请启用云开发后查看审批记录");
      this.setData({
        isLoading: false,
      });
      if (done) {
        done();
      }
      return;
    }

    wx.cloud.callFunction({
      name: "listReceptionApprovals",
      data: {
        status: requestedMode,
        limit: DEFAULT_LIMIT,
      },
      success: (res) => {
        if (this.data.activeMode !== requestedMode) {
          return;
        }

        const result = (res && res.result) || {};

        if (!result.success) {
          this.setApprovalItems(localItems, result.message || "审批列表加载失败");
          return;
        }

        const resultItems = Array.isArray(result.items) ? result.items : [];
        const approvals = resultItems.map((item, index) => buildApprovalItem(item, index, "cloud"));
        if (requestedMode === MODE_PENDING) {
          replaceLocalPendingApprovals(resultItems);
        }

        this.setData({
          approvals,
          totalCount: Number(result.total) || approvals.length,
          errorText: "",
          summaryLabel: requestedMode === MODE_PENDING ? "待审批" : "审批记录",
          emptyTitle: requestedMode === MODE_PENDING ? "暂无待审批的招待申请" : "暂无审批记录",
          emptyText: requestedMode === MODE_PENDING ? "新提交的招待申请会出现在这里" : "通过或驳回过的申请会出现在这里",
        });
      },
      fail: (err) => {
        if (this.data.activeMode !== requestedMode) {
          return;
        }

        console.warn("listReceptionApprovals failed", err);
        this.setApprovalItems(
          localItems,
          localItems.length && requestedMode === MODE_PENDING ? "云端列表暂不可用，已显示本地待审" : "审批列表加载失败"
        );
      },
      complete: () => {
        if (this.data.activeMode !== requestedMode) {
          if (done) {
            done();
          }
          return;
        }

        this.setData({
          isLoading: false,
        });
        if (done) {
          done();
        }
      },
    });
  },

  onRefresh() {
    this.loadApprovals();
  },

  onSelectMode(e) {
    const { value } = e.currentTarget.dataset;

    if (value === this.data.activeMode) {
      return;
    }

    const approvalModes = this.data.approvalModes.map((item) => ({
      ...item,
      selected: item.value === value,
    }));

    this.setData(
      {
        activeMode: value,
        approvalModes,
        approvals: [],
        totalCount: 0,
        errorText: "",
        summaryLabel: value === MODE_PENDING ? "待审批" : "审批记录",
        emptyTitle: value === MODE_PENDING ? "暂无待审批的招待申请" : "暂无审批记录",
        emptyText: value === MODE_PENDING ? "新提交的招待申请会出现在这里" : "通过或驳回过的申请会出现在这里",
      },
      () => this.loadApprovals()
    );
  },

  onApprove(e) {
    const { id } = e.currentTarget.dataset;
    this.confirmApproval(id, "approve");
  },

  onReject(e) {
    const { id } = e.currentTarget.dataset;
    this.confirmApproval(id, "reject");
  },

  confirmApproval(id, action) {
    const isApprove = action === "approve";

    wx.showModal({
      title: isApprove ? "通过申请" : "驳回申请",
      content: isApprove ? "确认通过该招待申请？" : "确认驳回该招待申请？",
      confirmText: isApprove ? "通过" : "驳回",
      confirmColor: isApprove ? "#185C5D" : "#C9503F",
      success: (res) => {
        if (res.confirm) {
          this.processApproval(id, action);
        }
      },
    });
  },

  processApproval(id, action) {
    if (this.data.isProcessing) {
      return;
    }

    const target = this.data.approvals.filter((item) => item.id === id)[0];
    if (!target) {
      wx.showToast({
        title: "审批项目不存在",
        icon: "none",
      });
      return;
    }

    const nextStatus = action === "approve" ? "approved" : "rejected";

    this.setData({
      isProcessing: true,
      processingId: id,
    });

    if (!wx.cloud || !wx.cloud.callFunction) {
      wx.showToast({
        title: "请启用云开发后审批",
        icon: "none",
      });
      this.setData({
        isProcessing: false,
        processingId: "",
      });
      return;
    }

    if (!getReceptionId(target)) {
      wx.showToast({
        title: "请刷新后重试",
        icon: "none",
      });
      this.setData({
        isProcessing: false,
        processingId: "",
      });
      return;
    }

    wx.cloud.callFunction({
      name: "approveReception",
      data: {
        id: getReceptionId(target),
        action,
        approver: {
          name: this.data.user.name || "",
          department: this.data.user.department || "",
        },
      },
      success: (res) => {
        const result = (res && res.result) || {};

        if (!result.success) {
          wx.showToast({
            title: result.message || "审批失败",
            icon: "none",
          });
          return;
        }

        this.completeApproval(id, nextStatus);
      },
      fail: (err) => {
        console.error("approveReception failed", err);
        wx.showToast({
          title: "审批失败，请重试",
          icon: "none",
        });
      },
      complete: () => {
        this.setData({
          isProcessing: false,
          processingId: "",
        });
      },
    });
  },

  completeApproval(id, status) {
    updateLocalApprovalStatus(id, status, this.data.user || {});

    const approvals = this.data.approvals.filter((item) => item.id !== id);
    this.setData({
      approvals,
      totalCount: approvals.length,
    });

    wx.showToast({
      title: status === "approved" ? "已通过" : "已驳回",
      icon: "success",
    });
  },
});
