const BASE = 'http://localhost:5000/api';
const j = async (res) => { const t = await res.text(); try { return JSON.parse(t); } catch { return t; } };

// Disposable test account
const reg = await fetch(`${BASE}/users`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ firstName: 'Test', lastName: 'Vision', email: `throwaway_vision_${Date.now()}@test.com`, password: 'Test1234' })
});
const regData = await j(reg);
console.log('Register:', reg.status);
const { token, userId } = regData;

// Send the synthetic receipt image to the real scan-receipt endpoint (real Vision API call)
const fs = await import('fs');
const imageBuffer = fs.readFileSync('/tmp/test_receipt.png');
const form = new FormData();
form.append('receipt', new Blob([imageBuffer], { type: 'image/png' }), 'test_receipt.png');

const scanRes = await fetch(`${BASE}/expenses/scan-receipt`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form
});
console.log('Scan status:', scanRes.status);
const scanData = await j(scanRes);
console.log('Scan response:', JSON.stringify(scanData, null, 2));

// Cleanup
const delRes = await fetch(`${BASE}/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
console.log('Cleanup:', delRes.status);
