import { expect, test } from "@playwright/test";

test("health endpoint answers", async ({ request }) => {
  const res = await request.get("/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toMatchObject({ status: "ok" });
});

test("user can add a run through the UI", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Measurement Runs" })).toBeVisible();
  const rowsBefore = await page.locator("tbody#runs tr").count();

  await page.getByPlaceholder("Vehicle ID").fill("WVW-E2E1");
  await page.getByLabel("Cycle").selectOption("RDE");
  await page.getByPlaceholder("CO2 g/km").fill("123.4");
  await page.getByRole("button", { name: "Add run" }).click();

  await expect(page.getByRole("status")).toContainText("Created run-");
  await expect(page.locator("tbody#runs tr")).toHaveCount(rowsBefore + 1);
  await expect(page.locator("tbody#runs")).toContainText("WVW-E2E1");
});

test("user can filter runs by vehicle", async ({ page }) => {
  await page.goto("/");

  const table = page.getByRole("table", { name: "Runs" });
  const rowsBefore = await table.getByRole("row").count();

  await page.getByLabel("Filter by vehicle").fill("WVW-1001");

  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table).toContainText("WVW-1001");
  await expect(table).not.toContainText("WVW-2042");
  await expect(table).not.toContainText("WVW-3310");

  await page.getByLabel("Filter by vehicle").fill("");

  await expect(table.getByRole("row")).toHaveCount(rowsBefore);
  await expect(table).toContainText("WVW-2042");
  await expect(table).toContainText("WVW-3310");
});
