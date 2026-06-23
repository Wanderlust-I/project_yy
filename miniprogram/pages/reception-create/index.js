const typeOptions = ["商务接待", "项目沟通", "调研交流", "内部协同"];
const serviceOptions = ["会议室", "茶水", "桌签", "用餐", "车辆", "投影"];
const placeOptions = ["总部会议室", "16楼第一会议室", "17楼贵宾室", "线上会议"];
const defaultServices = ["会议室", "茶水"];

function padNumber(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  return `${year}-${month}-${day}`;
}

function createInitialForm(user) {
  return {
    applicantName: user.name || "",
    department: user.department || "",
    type: typeOptions[0],
    title: "",
    company: "",
    contactName: "",
    contactPhone: "",
    visitDate: formatDate(new Date()),
    startTime: "09:30",
    endTime: "10:30",
    place: placeOptions[0],
    visitorCount: 1,
    services: defaultServices.slice(),
    notes: "",
    vehicles: "",
  };
}

function buildServiceItems(services) {
  return serviceOptions.map((name) => ({
    name,
    selected: services.indexOf(name) > -1,
  }));
}

function buildTypeItems(selectedType) {
  return typeOptions.map((name) => ({
    name,
    selected: name === selectedType,
  }));
}

Page({
  data: {
    typeItems: buildTypeItems(typeOptions[0]),
    serviceItems: buildServiceItems(defaultServices),
    placeOptions,
    placeIndex: 0,
    minDate: formatDate(new Date()),
    form: createInitialForm({}),
    selectedServicesText: "会议室、茶水",
    isSubmitting: false,
  },

  onLoad() {
    const app = getApp();
    if (!app.ensureLogin()) {
      return;
    }

    const currentUser = (app.globalData && app.globalData.currentUser) || {};
    const form = createInitialForm(currentUser);
    this.setData({
      form,
      typeItems: buildTypeItems(form.type),
    });
    this.updateServiceState(form.services);
  },

  setFormField(field, value) {
    this.setData({
      [`form.${field}`]: value,
    });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setFormField(field, e.detail.value);
  },

  onSelectType(e) {
    const type = e.currentTarget.dataset.value;
    this.setData({
      "form.type": type,
      typeItems: buildTypeItems(type),
    });
  },

  onPlaceChange(e) {
    const placeIndex = Number(e.detail.value);
    const place = this.data.placeOptions[e.detail.value];
    this.setData({
      placeIndex,
      "form.place": place,
    });
  },

  onDateChange(e) {
    this.setFormField("visitDate", e.detail.value);
  },

  onTimeChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setFormField(field, e.detail.value);
  },

  onStepVisitor(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const nextCount = Math.max(1, Math.min(99, this.data.form.visitorCount + delta));
    this.setFormField("visitorCount", nextCount);
  },

  onVisitorInput(e) {
    const value = Number(e.detail.value);
    this.setFormField("visitorCount", value > 0 ? Math.min(99, value) : 1);
  },

  onToggleService(e) {
    const value = e.currentTarget.dataset.value;
    const services = this.data.form.services.slice();
    const index = services.indexOf(value);

    if (index > -1) {
      services.splice(index, 1);
    } else {
      services.push(value);
    }

    this.setData({
      "form.services": services,
    });
    this.updateServiceState(services);
  },

  updateServiceState(services = this.data.form.services) {
    this.setData({
      serviceItems: buildServiceItems(services),
      selectedServicesText: services.length ? services.join("、") : "暂无会务需求",
    });
  },

  validateForm() {
    const { form } = this.data;
    const requiredFields = [
      ["title", "请输入接待主题"],
      ["company", "请输入来访单位"],
      ["contactName", "请输入联系人"],
      ["contactPhone", "请输入联系电话"],
      ["visitDate", "请选择到访日期"],
      ["startTime", "请选择开始时间"],
      ["endTime", "请选择结束时间"],
      ["place", "请选择接待地点"],
    ];

    for (let i = 0; i < requiredFields.length; i += 1) {
      const [field, message] = requiredFields[i];
      if (!String(form[field] || "").trim()) {
        wx.showToast({
          title: message,
          icon: "none",
        });
        return false;
      }
    }

    if (!/^1[3-9]\d{9}$/.test(form.contactPhone.trim())) {
      wx.showToast({
        title: "请输入正确手机号",
        icon: "none",
      });
      return false;
    }

    if (form.startTime >= form.endTime) {
      wx.showToast({
        title: "结束时间需晚于开始时间",
        icon: "none",
      });
      return false;
    }

    return true;
  },

  buildPayload(status) {
    return {
      ...this.data.form,
      status,
      updatedAt: new Date().toISOString(),
    };
  },

  onSaveDraft() {
    wx.setStorageSync("receptionApplicationDraft", this.buildPayload("draft"));
    wx.showToast({
      title: "已暂存",
      icon: "success",
    });
  },

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.setData({
      isSubmitting: true,
    });

    wx.setStorageSync("latestReceptionApplication", this.buildPayload("pending"));
    wx.showToast({
      title: "申请已提交",
      icon: "success",
    });

    this.setData({
      isSubmitting: false,
    });
  },
});
