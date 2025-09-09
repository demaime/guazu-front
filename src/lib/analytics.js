// use client

const GA_ID = "G-2ZV4LVXFNY";

export const trackEvent = (name, params = {}) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }
};

export const pageview = (path, title) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "page_view", {
      page_title: title || document.title,
      page_location: window.location.href,
      page_path: path,
    });
  }
};

export const setUserId = (userId) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", GA_ID, { user_id: userId });
  }
};

export const setUserProperties = (props) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("set", "user_properties", props);
  }
};

export const analytics = {
  trackEvent,
  pageview,
  setUserId,
  setUserProperties,
};
