import { expect, test } from "@playwright/test";

test("renders the Erdium workspace scaffold", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Erdium/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Erdium" })
  ).toBeVisible();
  const sqlSource = page.getByRole("textbox", { name: "SQL source" });

  await expect(sqlSource).toBeVisible();
  await expect(page.getByRole("button", { name: "Parse" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Load sample" })).toBeEnabled();
  await expect(
    page.getByText("Parsed 3 tables and 2 relationships.")
  ).toBeVisible();

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

test("parses edited SQL and preserves the last valid diagram on errors", async ({
  page
}) => {
  await page.goto("/");

  const sqlSource = page.getByRole("textbox", { name: "SQL source" });
  const parseButton = page.getByRole("button", { name: "Parse" });
  const diagram = page.getByTestId("schema-diagram");

  await expect(
    diagram.getByRole("heading", { level: 3, name: "organizations" })
  ).toBeVisible();

  await sqlSource.fill("CREATE TABLE broken (");
  await expect(
    page.getByText("SQL changed since the last successful parse.")
  ).toBeVisible();
  await parseButton.click();

  await expect(
    page.getByText("Parse failed. The diagram is showing the last valid schema.")
  ).toBeVisible();
  await expect(page.getByText("SQL_PARSE_ERROR")).toBeVisible();
  await expect(
    diagram.getByRole("heading", { level: 3, name: "organizations" })
  ).toBeVisible();

  await sqlSource.fill(`CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);`);
  await parseButton.click();

  await expect(page.getByText("Parsed 1 tables and 0 relationships.")).toBeVisible();
  await expect(
    diagram.getByRole("heading", { level: 3, name: "teams" })
  ).toBeVisible();
});
