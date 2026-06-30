const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const COLLECTION_NAME = "receptions";

function normalizeLimit(value) {
  const limit = Number(value);

  if (!Number.isFinite(limit) || limit <= 0) {
    return 100;
  }

  return Math.min(Math.floor(limit), 100);
}

function isCollectionMissing(err) {
  const message = String((err && (err.errMsg || err.message || err.toString())) || "").toLowerCase();

  return Boolean(
    message &&
      (message.indexOf("collection") > -1 || message.indexOf("集合") > -1) &&
      (message.indexOf("not exist") > -1 || message.indexOf("不存在") > -1)
  );
}

exports.main = async (event = {}) => {
  const limit = normalizeLimit(event.limit);

  try {
    const collection = db.collection(COLLECTION_NAME);
    const countResult = await collection.count();
    const listResult = await collection.orderBy("createdAt", "desc").limit(limit).get();

    return {
      success: true,
      total: countResult.total,
      items: listResult.data || [],
    };
  } catch (err) {
    if (isCollectionMissing(err)) {
      return {
        success: true,
        total: 0,
        items: [],
      };
    }

    console.error("listReceptions failed", err);

    return {
      success: false,
      message: "正式接待列表加载失败",
      error: err && (err.errMsg || err.message || err.toString()),
    };
  }
};
