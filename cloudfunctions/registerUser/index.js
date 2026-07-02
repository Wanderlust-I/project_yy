const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const COLLECTION_NAME = "users";

function normalizeString(value, maxLength = 100) {
  return String(value || "").trim().slice(0, maxLength);
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

function normalizeUserInfo(userInfo = {}) {
  const nickName = normalizeString(userInfo.nickName || userInfo.name || "微信用户", 50);

  return {
    nickName,
    avatarUrl: normalizeString(userInfo.avatarUrl, 500),
  };
}

function buildClientUser(user) {
  return {
    _id: user._id || "",
    openId: user.openId || "",
    name: user.name || user.nickName || "微信用户",
    nickName: user.nickName || user.name || "微信用户",
    avatarUrl: user.avatarUrl || "",
    department: user.department || "未设置部门",
    role: user.role || "申请人",
    status: user.status || "active",
  };
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const appId = wxContext.APPID;

  if (!openId) {
    return {
      success: false,
      message: "无法识别用户身份",
    };
  }

  try {
    await ensureCollection(COLLECTION_NAME);

    const now = db.serverDate();
    const userInfo = normalizeUserInfo(event.userInfo);
    const queryResult = await db.collection(COLLECTION_NAME).where({
      openId,
    }).limit(1).get();
    const existingUser = queryResult.data && queryResult.data[0];

    if (existingUser) {
      await db.collection(COLLECTION_NAME).doc(existingUser._id).update({
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          appId,
          lastLoginAt: now,
          updatedAt: now,
        },
      });

      return {
        success: true,
        isNew: false,
        user: buildClientUser({
          ...existingUser,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          appId,
        }),
      };
    }

    const createData = {
      ...userInfo,
      name: userInfo.nickName,
      openId,
      appId,
      department: "未设置部门",
      role: "申请人",
      status: "active",
      registeredAt: now,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const addResult = await db.collection(COLLECTION_NAME).add({
      data: createData,
    });

    return {
      success: true,
      isNew: true,
      user: buildClientUser({
        ...createData,
        _id: addResult._id,
      }),
    };
  } catch (err) {
    console.error("registerUser failed", err);

    return {
      success: false,
      message: "用户注册失败",
      error: err && (err.errMsg || err.message || err.toString()),
    };
  }
};
