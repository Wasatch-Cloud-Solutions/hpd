import { notificationAllowed } from "../src/notification-preferences";

describe("notification preferences", () => {
  it("enables categories by default", () => {
    expect(notificationAllowed({}, "messages")).toBe(true);
  });

  it("honors category-level opt-outs", () => {
    expect(
      notificationAllowed(
        { notifications: { messages: false, announcements: true } },
        "messages",
      ),
    ).toBe(false);
    expect(
      notificationAllowed(
        { notifications: { messages: false, announcements: true } },
        "announcements",
      ),
    ).toBe(true);
  });

  it("treats malformed preference values as enabled rather than dropping alerts", () => {
    expect(notificationAllowed({ notifications: "off" }, "inventory")).toBe(true);
  });
});
