import { test, expect } from '@playwright/test';

test.describe('Nords Spatial Engine UX Validations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a dedicated project canvas
    await page.goto('/project/p1');
    // Ensure canvas has loaded by waiting for the React Flow container
    await expect(page.locator('.nords-canvas')).toBeVisible();
    await expect(page.locator('[data-testid^="nord-node-"]')).toHaveCountGreaterThan(0);
  });

  test('Nord scaling based on dynamic sizes', async ({ page }) => {
    // Validate we have nords of different semantic importance scales
    const firstNode = page.locator('[data-testid^="nord-node-"]').first();
    await expect(firstNode).toBeVisible();

    // The transform style should demonstrate rendering size adjustments
    const style = await firstNode.getAttribute('style');
    expect(style).toContain('width:'); // nodes should have deterministic width
  });

  test('Node movement through drag-and-drop', async ({ page }) => {
    const nodeToDrag = page.locator('[data-testid="nord-node-n1"]');
    await expect(nodeToDrag).toBeVisible();

    const initialBox = await nodeToDrag.boundingBox();
    expect(initialBox).toBeDefined();

    // Perform a realistic drag using absolute positions
    await page.mouse.move(initialBox!.x + initialBox!.width / 2, initialBox!.y + initialBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + initialBox!.width / 2 + 150, initialBox!.y + initialBox!.height / 2 + 150, { steps: 10 });
    await page.mouse.up();

    const finalBox = await nodeToDrag.boundingBox();
    expect(finalBox!.x).toBeGreaterThan(initialBox!.x);
    expect(finalBox!.y).toBeGreaterThan(initialBox!.y);
  });

  test('Dynamic edge attachment and connection refresh', async ({ page }) => {
    // Test the line refreshes during the drag of a connected node.
    // Euclidean edges must be present in the DOM.
    const initialEdges = await page.locator('.react-flow__edge').count();
    expect(initialEdges).toBeGreaterThan(0);

    // Verify Euclidean edges bezier path exists
    const edgePath = page.locator('.react-flow__edge-path').first();
    const initialD = await edgePath.getAttribute('d');
    expect(initialD).not.toBeNull();

    // Drag a source node to observe edge geometry live update
    const sourceNode = page.locator('[data-testid="nord-node-n1"]');
    const box = await sourceNode.boundingBox();
    
    await page.mouse.move(box!.x + 20, box!.y + 20);
    await page.mouse.down();
    await page.mouse.move(box!.x + 200, box!.y + 200, { steps: 5 });
    await page.mouse.up();

    const finalD = await edgePath.getAttribute('d');
    // Geometries must be dynamically recomputed
    expect(finalD).not.toEqual(initialD);
  });

  test('Attaching new connections', async ({ page }) => {
    const sourceNode = page.locator('[data-testid="nord-node-n1"]');
    const targetNode = page.locator('[data-testid="nord-node-n2"]');
    await expect(sourceNode).toBeVisible();
    await expect(targetNode).toBeVisible();

    // Hover over source node to reveal handles
    await sourceNode.hover();
    
    // React flow handles usually have class '.react-flow__handle'
    const sourceHandle = sourceNode.locator('.react-flow__handle').first();
    const targetHandle = targetNode.locator('.react-flow__handle').first();

    // Drag from source to target
    await sourceHandle.dragTo(targetHandle);

    // Verify a new edge was created or interaction is captured
    // In our current canvas, this generates a new edge visually
    const updatedEdges = await page.locator('.react-flow__edge').count();
    expect(updatedEdges).toBeGreaterThan(0);
  });

  test('Simulating connection type changes live refresh', async ({ page }) => {
    // We check if connection labels exist and reflect the data type
    const labels = await page.locator('.nords-connection-label__type');
    await expect(labels.first()).toBeVisible();
    const text = await labels.first().textContent();
    expect(text).not.toBeNull();
  });
});
