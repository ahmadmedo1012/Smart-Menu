import type { LinkingOptions } from "@react-navigation/native";

export const linking: LinkingOptions<Record<string, unknown>> = {
  prefixes: ["smartmenu://", "https://menu.smart-link.ly"],
  config: {
    screens: {
      // r103-N11: the web confirmation URL is /order-confirmed?orderNo=X (query
      // param), not the path-param form — the ":orderId" pattern never matched a
      // real URL, so logged-out cold deep links fell through to Landing. The
      // pathless form matches the path; query params pass through to
      // route.params (the screen reads orderNo — see OrderConfirmedScreen).
      Landing: "", Menu: "menu/:slug", Pricing: "pricing", Login: "login",
      OrderConfirmed: "order-confirmed", Terms: "terms", Privacy: "privacy",
    },
  },
};
