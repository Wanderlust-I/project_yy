const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;
const COLLECTION_NAME = "receptionApplications";
const VALID_STATUSES = ["pending", "approved", "rejected", "processed"];

function normalizeStatus(value) {
  return VALID_STATUSES.indexOf(value) > -1 ? value : "pending";
}

function normalizeLimit(value) {
  const limit = Number(value);

  if (!Number.isFinite(limit) || limit <= 0) {
    return 50;
  }

  return Math.min(Math.floor(limit), 100);
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const status = normalizeStatus(event.status);
  const limit = normalizeLimit(event.limit);

  try {
    const query =
      status === "processed"
        ? {
            status: _.in(["approved", "rejected"]),
            approvedByOpenId: wxContext.OPENID,
          }
        : {
            status,
          };
    const collection = db.collection(COLLECTION_NAME).where(query);
    const countResult = await collection.count();

    if (event.onlyCount) {
      return {
        success: true,
        total: countResult.total,
        items: [],
      };
    }

    const orderField = status === "pending" ? "createdAt" : "updatedAt";
    const listResult = await collection.orderBy(orderField, "desc").limit(limit).get();

    return {
      success: true,
      total: countResult.total,
      items: listResult.data || [],
    };
  } catch (err) {
    console.error("listReceptionApprovals failed", err);

    return {
      success: false,
      message: "审批列表加载失败",
      error: err && (err.errMsg || err.message || err.toString()),
    };
  }
};
