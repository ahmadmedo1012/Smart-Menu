import type { LinkingOptions } from "@react-navigation/native";

export const linking: LinkingOptions<Record<string, unknown>> = {
  prefixes: ["smartmenu://", "https://menu.smart-link.ly"],
  config: {
    screens: {
      Landing: "", Menu: "menu/:slug", Pricing: "pricing", Login: "login",
      OrderConfirmed: "order-confirmed/:orderId", Terms: "terms", Privacy: "privacy",
    },
  },
};
