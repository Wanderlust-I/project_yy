const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const COLLECTION_NAME = "receptionApplications";
const VALID_TYPES = ["商务接待", "项目沟通", "调研交流", "内部协同"];
const VALID_SERVICES = ["会议室", "茶水", "桌签", "用餐", "车辆", "投影"];

function normalizeString(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeStringList(value, validValues) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item, 50))
    .filter((item, index, list) => item && validValues.indexOf(item) > -1 && list.indexOf(item) === index);
}

function normalizePeople(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      name: normalizeString(item && item.name, 50),
      position: normalizeString(item && item.position, 80),
    }))
    .filter((item) => item.name || item.position);
}

function normalizeVehicles(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      plate: normalizeString(item && item.plate, 30).toUpperCase(),
      driverPhone: normalizeString(item && item.driverPhone, 30),
    }))
    .filter((item) => item.plate || item.driverPhone);
}

function normalizeReception(input) {
  const services = normalizeStringList(input.services, VALID_SERVICES);
  const hasVehicleService = services.indexOf("车辆") > -1;
  const visitorCount = Number(input.visitorCount);

  return {
    applicantName: normalizeString(input.applicantName, 50),
    department: normalizeString(input.department, 80),
    type: VALID_TYPES.indexOf(input.type) > -1 ? input.type : VALID_TYPES[0],
    title: normalizeString(input.title, 100),
    company: normalizeString(input.company, 100),
    contactName: normalizeString(input.contactName, 50),
    contactPhone: normalizeString(input.contactPhone, 20),
    visitDate: normalizeString(input.visitDate, 20),
    startTime: normalizeString(input.startTime, 10),
    endTime: normalizeString(input.endTime, 10),
    place: normalizeString(input.place, 100),
    visitorCount: Number.isFinite(visitorCount) && visitorCount > 0 ? Math.min(Math.floor(visitorCount), 999) : 1,
    staff: normalizePeople(input.staff),
    visitors: normalizePeople(input.visitors),
    services,
    notes: normalizeString(input.notes, 1000),
    vehicleApply: hasVehicleService ? normalizeVehicles(input.vehicleApply) : [],
    vehicleRegister: hasVehicleService ? normalizeVehicles(input.vehicleRegister) : [],
    status: "pending",
  };
}

function validateReception(reception) {
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
    if (!reception[field]) {
      return message;
    }
  }

  if (!/^1[3-9]\d{9}$/.test(reception.contactPhone)) {
    return "请输入正确手机号";
  }

  if (reception.startTime >= reception.endTime) {
    return "结束时间需晚于开始时间";
  }

  return "";
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const input = event && event.reception ? event.reception : {};
  const reception = normalizeReception(input);
  const validationMessage = validateReception(reception);

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  try {
    const now = db.serverDate();
    const addResult = await db.collection(COLLECTION_NAME).add({
      data: {
        ...reception,
        createdByOpenId: wxContext.OPENID,
        createdByAppId: wxContext.APPID,
        createdAt: now,
        updatedAt: now,
      },
    });

    return {
      success: true,
      id: addResult._id,
    };
  } catch (err) {
    console.error("createReception database add failed", err);

    return {
      success: false,
      message: "数据库写入失败",
      error: err && (err.errMsg || err.message || err.toString()),
    };
  }
};
