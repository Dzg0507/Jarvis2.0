// Simple test script to check MCP server directly
const fetch = require('node-fetch');

async function testMcpServer() {
  console.log('Testing MCP server directly...');

  try {
    // Test tools/list
    console.log('Testing tools/list...');
    const listResponse = await fetch('http://localhost:8080/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1
      })
    });

    if (!listResponse.ok) {
      throw new Error(`HTTP ${listResponse.status}: ${listResponse.statusText}`);
    }

    const listResult = await listResponse.json();
    console.log('Tools list result:', JSON.stringify(listResult, null, 2));

    if (listResult.result && listResult.result.tools) {
      console.log(`✅ Successfully connected - ${listResult.result.tools.length} tools available`);

      // Test a simple tool call
      if (listResult.result.tools.length > 0) {
        const firstTool = listResult.result.tools[0];
        console.log(`Testing tool: ${firstTool.name}`);

        const callResponse = await fetch('http://localhost:8080/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: firstTool.name,
              arguments: {}
            },
            id: 2
          })
        });

        if (!callResponse.ok) {
          throw new Error(`HTTP ${callResponse.status}: ${callResponse.statusText}`);
        }

        const callResult = await callResponse.json();
        console.log('Tool call result:', JSON.stringify(callResult, null, 2));
      }
    } else {
      console.log('❌ No tools available');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMcpServer();
