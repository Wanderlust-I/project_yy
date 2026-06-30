const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const APPLICATION_COLLECTION_NAME = "receptionApplications";
const RECEPTION_COLLECTION_NAME = "receptions";

function normalizeString(value, maxLength = 100) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeAction(action) {
  if (action === "approve" || action === "approved") {
    return "approved";
  }

  if (action === "reject" || action === "rejected") {
    return "rejected";
  }

  return "";
}

async function ensureCollection(name) {
  if (typeof db.createCollection !== "function") {
    return;
  }

  try {
    await db.createCollection(name);
  } catch (err) {
    const message = err && (err.errMsg || err.message || err.toString());

    if (message && message.indexOf("exist") === -1 && message.indexOf("已存在") === -1) {
      console.warn("create collection failed", message);
    }
  }
}

function buildReception(application, approvalInfo) {
  const { _id, status, createdAt, updatedAt, ...receptionFields } = application;

  return {
    ...receptionFields,
    sourceApplicationId: _id,
    applicationCreatedAt: createdAt || null,
    applicationUpdatedAt: updatedAt || null,
    status: "ready",
    statusText: "已安排",
    approvedByOpenId: approvalInfo.approvedByOpenId,
    approvedByAppId: approvalInfo.approvedByAppId,
    approvedByName: approvalInfo.approvedByName,
    approvedByDepartment: approvalInfo.approvedByDepartment,
    approvedAt: approvalInfo.approvedAt,
    createdAt: approvalInfo.approvedAt,
    updatedAt: approvalInfo.approvedAt,
  };
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const id = normalizeString(event.id, 100);
  const status = normalizeAction(event.action);
  const approver = event.approver || {};

  if (!id) {
    return {
      success: false,
      message: "缺少审批项目",
    };
  }

  if (!status) {
    return {
      success: false,
      message: "审批动作不正确",
    };
  }

  try {
    const now = db.serverDate();
    const approvalInfo = {
      approvedByOpenId: wxContext.OPENID,
      approvedByAppId: wxContext.APPID,
      approvedByName: normalizeString(approver.name, 50),
      approvedByDepartment: normalizeString(approver.department, 80),
      approvedAt: now,
    };
    const applicationResult = await db.collection(APPLICATION_COLLECTION_NAME).doc(id).get();
    const application = applicationResult && applicationResult.data;

    if (!application || application.status !== "pending") {
      return {
        success: false,
        message: "审批项目不存在或已处理",
      };
    }

    let receptionId = "";

    if (status === "approved") {
      await ensureCollection(RECEPTION_COLLECTION_NAME);

      const existingReception = await db.collection(RECEPTION_COLLECTION_NAME).where({
        sourceApplicationId: id,
      }).limit(1).get();

      if (existingReception.data && existingReception.data.length) {
        receptionId = existingReception.data[0]._id;
      } else {
        const receptionResult = await db.collection(RECEPTION_COLLECTION_NAME).add({
          data: buildReception(application, approvalInfo),
        });
        receptionId = receptionResult._id;
      }
    }

    const updateResult = await db.collection(APPLICATION_COLLECTION_NAME).where({
      _id: id,
      status: "pending",
    }).update({
      data: {
        status,
        officialReceptionId: receptionId,
        ...approvalInfo,
        updatedAt: now,
      },
    });

    if (!updateResult.stats || updateResult.stats.updated === 0) {
      return {
        success: false,
        message: "审批项目不存在或已处理",
      };
    }

    return {
      success: true,
      status,
      receptionId,
    };
  } catch (err) {
    console.error("approveReception failed", err);

    return {
      success: false,
      message: "审批失败",
      error: err && (err.errMsg || err.message || err.toString()),
    };
  }
};
