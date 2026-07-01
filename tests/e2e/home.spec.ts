import { expect, test } from "@playwright/test";

test("renders the Erdium workspace scaffold", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Erdium/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Erdium" })
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "SQL source" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Parse" })).toBeDisabled();

  const diagram = page.getByTestId("schema-diagram");

  await expect(diagram).toBeVisible();
  await expect(
    diagram.getByRole("heading", { level: 3, name: "organizations" })
  ).toBeVisible();
  await expect(
    diagram.getByRole("heading", { level: 3, name: "users" })
  ).toBeVisible();
  await expect(
    diagram.getByRole("heading", { level: 3, name: "projects" })
  ).toBeVisible();
  await expect(diagram.getByText("fk_projects_owner")).toBeVisible();

  const projectsHeading = diagram.getByRole("heading", {
    level: 3,
    name: "projects"
  });
  const beforeDrag = await projectsHeading.boundingBox();

  if (!beforeDrag) {
    throw new Error("Expected projects table to have a visible bounding box.");
  }

  await page.mouse.move(
    beforeDrag.x + beforeDrag.width / 2,
    beforeDrag.y + beforeDrag.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    beforeDrag.x + beforeDrag.width / 2 + 140,
    beforeDrag.y + beforeDrag.height / 2 + 70,
    { steps: 10 }
  );
  await page.mouse.up();

  const afterDrag = await projectsHeading.boundingBox();

  if (!afterDrag) {
    throw new Error("Expected projects table to remain visible after drag.");
  }

  expect(Math.abs(afterDrag.x - beforeDrag.x)).toBeGreaterThan(40);
});
