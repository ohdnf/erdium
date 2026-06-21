import { expect, test } from "@playwright/test";

test("renders the Erdium workspace scaffold", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Erdium/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Erdium" })
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "SQL source" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Parse" })).toBeDisabled();
});
