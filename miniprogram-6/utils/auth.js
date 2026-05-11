const USER_INFO_KEY = "userInfo";
const USER_ID_KEY = "userId";
const POST_LOGIN_REDIRECT_KEY = "postLoginRedirect";

const TAB_PAGES = new Set([
  "pages/index/index",
  "pages/record/record",
  "pages/my/my",
]);

function getUserId() {
  let id = wx.getStorageSync(USER_ID_KEY);
  if (id !== "" && id != null && !Number.isNaN(Number(id))) {
    return Number(id);
  }
  const u = wx.getStorageSync(USER_INFO_KEY);
  if (u && u.id != null) {
    const n = Number(u.id);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function getUserInfo() {
  return wx.getStorageSync(USER_INFO_KEY) || null;
}

function setSession(apiUser) {
  const user = {
    id: Number(apiUser.id),
    nickName: apiUser.nickname || apiUser.nickName || "用户",
    avatarUrl: apiUser.avatarUrl || "",
  };
  wx.setStorageSync(USER_INFO_KEY, user);
  wx.setStorageSync(USER_ID_KEY, user.id);
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.userInfo = user;
      app.globalData.userId = user.id;
    }
  } catch (e) {
    // getApp 在部分生命周期可能不可用
  }
}

function clearSession() {
  wx.removeStorageSync(USER_INFO_KEY);
  wx.removeStorageSync(USER_ID_KEY);
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.userInfo = null;
      app.globalData.userId = null;
    }
  } catch (e) {}
}

function restoreAppSession() {
  const user = wx.getStorageSync(USER_INFO_KEY);
  const id = wx.getStorageSync(USER_ID_KEY);
  if (!user || id == null || id === "") return false;
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.userInfo = user;
      app.globalData.userId = Number(id);
    }
  } catch (e) {
    return false;
  }
  return true;
}

function getCurrentRouteInfo() {
  const pages = getCurrentPages();
  if (!pages || pages.length === 0) return null;
  const cur = pages[pages.length - 1];
  const route = cur.route || "";
  const options = cur.options || {};
  return { route, options };
}

function requireLogin() {
  if (getUserId()) return true;

  const routeInfo = getCurrentRouteInfo();
  const redirect =
    routeInfo && routeInfo.route
      ? { route: routeInfo.route, options: routeInfo.options }
      : null;
  if (redirect) {
    wx.setStorageSync(POST_LOGIN_REDIRECT_KEY, redirect);
  } else {
    wx.removeStorageSync(POST_LOGIN_REDIRECT_KEY);
  }

  const pages = getCurrentPages();
  const currentRoute =
    pages && pages.length ? pages[pages.length - 1].route : "";
  if (currentRoute === "pages/login/login") return false;

  wx.navigateTo({ url: "/pages/login/login" });
  return false;
}

function consumePostLoginRedirect() {
  const redirect = wx.getStorageSync(POST_LOGIN_REDIRECT_KEY);
  wx.removeStorageSync(POST_LOGIN_REDIRECT_KEY);
  return redirect || null;
}

function navigateAfterLogin() {
  const redirect = consumePostLoginRedirect();
  if (!redirect || !redirect.route) {
    wx.switchTab({ url: "/pages/index/index" });
    return;
  }

  const route = redirect.route.startsWith("pages/")
    ? redirect.route
    : `pages/${redirect.route}`;
  const qs = redirect.options
    ? Object.keys(redirect.options)
        .map(
          (k) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(redirect.options[k]))}`,
        )
        .join("&")
    : "";
  const url = `/${route}${qs ? `?${qs}` : ""}`;

  if (TAB_PAGES.has(route)) {
    wx.switchTab({ url: `/${route}` });
  } else {
    wx.redirectTo({ url });
  }
}

module.exports = {
  getUserId,
  getUserInfo,
  setSession,
  clearSession,
  restoreAppSession,
  requireLogin,
  navigateAfterLogin,
  consumePostLoginRedirect,
  USER_INFO_KEY,
  USER_ID_KEY,
  POST_LOGIN_REDIRECT_KEY,
};
