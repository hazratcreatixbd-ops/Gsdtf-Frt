import WebSocket from 'ws';

async function testWebSocket(name: string, url: string): Promise<{ success: boolean; message: string; durationMs: number }> {
  console.log(`\nTesting WebSocket connection for [${name}]: ${url}`);
  const startTime = Date.now();
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ws.terminate(); } catch {}
      resolve({ success: false, message: 'Timed out waiting for session_ready (10s)', durationMs: Date.now() - startTime });
    }, 10000);

    let ws: WebSocket;
    try {
      ws = new WebSocket(url, {
        headers: {
          'User-Agent': 'FRIDAY-Diagnostic-Client/1.0',
        },
      });
    } catch (e: any) {
      clearTimeout(timer);
      return resolve({ success: false, message: `WebSocket construct error: ${e.message}`, durationMs: Date.now() - startTime });
    }

    ws.on('open', () => {
      console.log(`  [${name}] WS Open event fired after ${Date.now() - startTime}ms. Waiting for session message...`);
    });

    ws.on('message', (data) => {
      const elapsed = Date.now() - startTime;
      try {
        const parsed = JSON.parse(data.toString());
        console.log(`  [${name}] WS message received:`, parsed.type);
        if (parsed.type === 'session_ready') {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            ws.close();
            resolve({ success: true, message: `session_ready received! Model: ${parsed.model || 'gemini-3.8-live'}`, durationMs: elapsed });
          }
        } else if (parsed.type === 'error') {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            ws.close();
            resolve({ success: false, message: `Server error message: ${parsed.message}`, durationMs: elapsed });
          }
        }
      } catch (err: any) {
        console.log(`  [${name}] Non-JSON message: ${data.toString().slice(0, 100)}`);
      }
    });

    ws.on('error', (err: any) => {
      console.log(`  [${name}] WS Error event:`, err.message);
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ success: false, message: `Connection error: ${err.message}`, durationMs: Date.now() - startTime });
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`  [${name}] WS Close event. Code: ${code}, Reason: ${reason.toString() || 'none'}`);
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ success: false, message: `Closed before ready (code: ${code}, reason: ${reason.toString() || 'none'})`, durationMs: Date.now() - startTime });
      }
    });
  });
}

async function run() {
  console.log('====================================================');
  console.log('   FRIDAY BACKEND & WEBSOCKET DIAGNOSTIC SUITE      ');
  console.log('====================================================');

  const localRes = await testWebSocket('Localhost Express', 'ws://localhost:3000/api/live');
  console.log(`Result Localhost: success=${localRes.success}, msg=${localRes.message}, time=${localRes.durationMs}ms`);

  const devRes = await testWebSocket(
    'Cloud Dev Container',
    'wss://ais-dev-y34kxoace7g7txsixtaqn5-87869525848.asia-southeast1.run.app/api/live'
  );
  console.log(`Result Cloud Dev: success=${devRes.success}, msg=${devRes.message}, time=${devRes.durationMs}ms`);

  const preRes = await testWebSocket(
    'Cloud Shared/Pre Container',
    'wss://ais-pre-y34kxoace7g7txsixtaqn5-87869525848.asia-southeast1.run.app/api/live'
  );
  console.log(`Result Cloud Pre: success=${preRes.success}, msg=${preRes.message}, time=${preRes.durationMs}ms`);

  console.log('\n====================================================');
  console.log('DIAGNOSTIC COMPLETE');
  console.log('====================================================');
}

run();
