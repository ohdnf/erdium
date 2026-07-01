import { readFile, stat, writeFile } from "node:fs/promises";
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
  await expect(page.getByRole("button", { name: "Re-layout" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Reset local" })).toBeEnabled();
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
  await expect(page.getByText("SQL_PARSE_ERROR")).toBeHidden();
  await parseButton.click();

  await expect(page.getByText("Parsed 1 tables and 0 relationships.")).toBeVisible();
  await expect(
    diagram.getByRole("heading", { level: 3, name: "teams" })
  ).toBeVisible();
});

test("restores SQL and moved table positions after refresh", async ({ page }) => {
  await page.goto("/");

  const sqlSource = page.getByRole("textbox", { name: "SQL source" });
  const parseButton = page.getByRole("button", { name: "Parse" });
  const diagram = page.getByTestId("schema-diagram");
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
    beforeDrag.x + beforeDrag.width / 2 + 130,
    beforeDrag.y + beforeDrag.height / 2 + 40,
    { steps: 10 }
  );
  await page.mouse.up();

  const afterDrag = await projectsHeading.boundingBox();

  if (!afterDrag) {
    throw new Error("Expected projects table to remain visible after drag.");
  }

  expect(Math.abs(afterDrag.x - beforeDrag.x)).toBeGreaterThan(40);
  await expect(page.getByText("Local project saved.")).toBeVisible({
    timeout: 5000
  });

  await page.reload();
  await expect(
    page.getByText("Parsed 3 tables and 2 relationships.")
  ).toBeVisible();

  const restoredProjectsHeading = page
    .getByTestId("schema-diagram")
    .getByRole("heading", { level: 3, name: "projects" });
  const restoredPosition = await restoredProjectsHeading.boundingBox();

  if (!restoredPosition) {
    throw new Error("Expected projects table to restore after refresh.");
  }

  expect(Math.abs(restoredPosition.x - afterDrag.x)).toBeLessThan(30);

  await sqlSource.fill(`CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);`);
  await parseButton.click();
  await expect(page.getByText("Parsed 1 tables and 0 relationships.")).toBeVisible();
  await expect(page.getByText("Local project saved.")).toBeVisible({
    timeout: 5000
  });

  await page.reload();
  await expect(page.getByRole("textbox", { name: "SQL source" })).toHaveValue(
    /CREATE TABLE teams/
  );
  await expect(
    page
      .getByTestId("schema-diagram")
      .getByRole("heading", { level: 3, name: "teams" })
  ).toBeVisible();
});

test("exports and imports project JSON", async ({ page }, testInfo) => {
  await page.goto("/");

  const exportDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const exportDownload = await exportDownloadPromise;

  expect(exportDownload.suggestedFilename()).toMatch(
    /^erdium-project-.+\.json$/
  );

  const exportedPath = await exportDownload.path();

  if (!exportedPath) {
    throw new Error("Expected exported project download to have a path.");
  }

  const exportedDocument = JSON.parse(await readFile(exportedPath, "utf8")) as {
    formatVersion?: unknown;
    sourceSql?: unknown;
    layout?: unknown;
  };

  expect(exportedDocument.formatVersion).toBe(1);
  expect(exportedDocument.sourceSql).toContain("CREATE TABLE organizations");
  expect(exportedDocument.layout).toEqual(
    expect.objectContaining({
      positions: expect.any(Object),
      viewport: expect.any(Object)
    })
  );
  await expect(page.getByText("Project JSON exported.")).toBeVisible();

  const unsupportedImportPath = testInfo.outputPath(
    "unsupported-import-project.json"
  );

  await writeFile(
    unsupportedImportPath,
    JSON.stringify({
      formatVersion: 2,
      projectId: "local-default",
      name: "Unsupported project",
      dialect: "postgresql",
      sourceSql: "CREATE TABLE unsupported (id BIGSERIAL PRIMARY KEY);",
      layout: {
        positions: {},
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      updatedAt: "2026-07-01T00:00:00.000Z"
    })
  );

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });

  const unsupportedFileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  const unsupportedFileChooser = await unsupportedFileChooserPromise;
  await unsupportedFileChooser.setFiles(unsupportedImportPath);

  await expect(
    page.getByText("Unsupported project document version.")
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "SQL source" })).toHaveValue(
    /CREATE TABLE organizations/
  );

  const importPath = testInfo.outputPath("import-project.json");

  await writeFile(
    importPath,
    JSON.stringify(
      {
        formatVersion: 1,
        projectId: "local-default",
        name: "Imported project",
        dialect: "postgresql",
        sourceSql: `CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);`,
        layout: {
          positions: {},
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        updatedAt: "2026-07-01T00:00:00.000Z"
      },
      null,
      2
    )
  );

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("replace the current local work");
    await dialog.accept();
  });

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(importPath);

  await expect(page.getByText("Project JSON imported.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "SQL source" })).toHaveValue(
    /CREATE TABLE teams/
  );
  await expect(
    page
      .getByTestId("schema-diagram")
      .getByRole("heading", { level: 3, name: "teams" })
  ).toBeVisible();
});

test("exports the current diagram as PNG", async ({ page }) => {
  await page.goto("/");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^erdium-diagram-.+\.png$/);

  const pngPath = await download.path();

  if (!pngPath) {
    throw new Error("Expected exported PNG download to have a path.");
  }

  const pngStat = await stat(pngPath);

  expect(pngStat.size).toBeGreaterThan(1000);
  await expect(page.getByText("Diagram PNG exported.")).toBeVisible();
});
