const typeOptions = ["商务接待", "项目沟通", "调研交流", "内部协同"];
const serviceOptions = ["会议室", "茶水", "桌签", "用餐", "车辆", "投影"];
const placeOptions = ["3911会议室", "线上会议"];
 const defaultServices = ["会议室","茶水"];

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
    staff: [],
    visitors: [],
    services: defaultServices.slice(),
    notes: "",
    vehicleApply: [],
    vehicleRegister: [],
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
    showVehicleSection: false,
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

  onAddPerson(e) {
    const { type } = e.currentTarget.dataset;
    const list = this.data.form[type].slice();
    list.push({ name: "", position: "" });
    this.setFormField(type, list);
  },

  onRemovePerson(e) {
    const { type, index } = e.currentTarget.dataset;
    const list = this.data.form[type].slice();
    list.splice(index, 1);
    this.setFormField(type, list);
  },

  onPersonInput(e) {
    const { type, index, field } = e.currentTarget.dataset;
    this.setData({
      [`form.${type}[${index}].${field}`]: e.detail.value,
    });
  },

  onAddVehicle(e) {
    const { vehicletype } = e.currentTarget.dataset;
    const list = this.data.form[vehicletype].slice();
    list.push({ plate: "", driverPhone: "" });
    this.setFormField(vehicletype, list);
  },

  onRemoveVehicle(e) {
    const { vehicletype, index } = e.currentTarget.dataset;
    const list = this.data.form[vehicletype].slice();
    list.splice(index, 1);
    this.setFormField(vehicletype, list);
  },

  onVehicleInput(e) {
    const { vehicletype, index, field } = e.currentTarget.dataset;
    this.setData({
      [`form.${vehicletype}[${index}].${field}`]: e.detail.value,
    });
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
      showVehicleSection: services.indexOf("车辆") > -1,
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
    const form = this.data.form;
    const hasVehicleService = form.services.indexOf("车辆") > -1;

    return {
      ...form,
      visitorCount: Number(form.visitorCount) || 1,
      vehicleApply: hasVehicleService ? form.vehicleApply : [],
      vehicleRegister: hasVehicleService ? form.vehicleRegister : [],
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
    if (this.data.isSubmitting) {
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    if (!wx.cloud || !wx.cloud.callFunction) {
      wx.showToast({
        title: "请启用云开发",
        icon: "none",
      });
      return;
    }

    const payload = this.buildPayload("pending");

    this.setData({
      isSubmitting: true,
    });

    wx.cloud.callFunction({
      name: "createReception",
      data: {
        reception: payload,
      },
      success: (res) => {
        const result = (res && res.result) || {};

        if (!result.success) {
          wx.showToast({
            title: result.message || "提交失败",
            icon: "none",
          });
          return;
        }

        wx.setStorageSync("latestReceptionApplication", {
          ...payload,
          _id: result.id,
        });
        wx.removeStorageSync("receptionApplicationDraft");

        wx.showToast({
          title: "申请已提交",
          icon: "success",
        });
      },
      fail: (err) => {
        console.error("createReception failed", err);
        wx.showToast({
          title: "提交失败，请重试",
          icon: "none",
        });
      },
      complete: () => {
        this.setData({
          isSubmitting: false,
        });
      },
    });
  },
});
