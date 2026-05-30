import { test, expect } from '@playwright/test';
import { DEMO_PROJECT_ID } from './helpers';

test('Diagnostic — inject logging', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Listen for network requests
  const apiCalls: string[] = [];
  page.on('response', response => {
    if (response.url().includes('/api/projects/') && response.url().includes('/graph')) {
      apiCalls.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`/project/${DEMO_PROJECT_ID}`);
  await page.waitForTimeout(8000);

  // Check graph data through React state using __REACT_DEVTOOLS_GLOBAL_HOOK__
  const deepCheck = await page.evaluate(() => {
    // Check the node layer
    const nodeLayer = document.querySelector('.react-flow__nodes');
    
    // Check if there's an error boundary
    const errorBoundary = document.querySelector('[class*="error-boundary"]');
    
    // Try to find ANY element with nord in the class or id
    const anyNord = document.querySelectorAll('[class*="nord"], [id*="nord"]');
    
    // Check the canvas loading state
    const loadingEl = document.querySelector('.nords-canvas-loading');
    
    // Check all network requests that happened
    const perfEntries = performance.getEntriesByType('resource')
      .filter((e: any) => e.name.includes('graph'))
      .map((e: any) => `${e.name} - ${e.responseStatus || 'unknown'} - ${Math.round(e.duration)}ms`);

    return {
      nodeLayerExists: !!nodeLayer,
      nodeLayerChildCount: nodeLayer?.childElementCount ?? -1,
      errorBoundary: !!errorBoundary,
      nordsElements: anyNord.length,
      nordsClasses: Array.from(anyNord).slice(0, 5).map(el => el.className).join(', '),
      loading: !!loadingEl,
      graphRequests: perfEntries,
    };
  });
  
  console.log('Deep check:', JSON.stringify(deepCheck, null, 2));
  console.log(`API graph calls: ${apiCalls.join(', ') || 'none'}`);
  
  // Print console logs related to graph
  const graphLogs = logs.filter(l => 
    l.toLowerCase().includes('graph') || 
    l.toLowerCase().includes('node') ||
    l.toLowerCase().includes('error') ||
    l.toLowerCase().includes('fail')
  );
  console.log(`Relevant console (${graphLogs.length}):`);
  for (const l of graphLogs.slice(0, 20)) console.log(`  ${l}`);

  expect(true).toBe(true);
});
