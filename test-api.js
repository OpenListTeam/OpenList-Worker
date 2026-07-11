import { POST } from './api/[...route].ts';

const req = new Request('http://localhost:3000/api/fs/list', {
  method: 'POST',
  body: JSON.stringify({ path: "/", password: "", page: 1, per_page: 30, refresh: false }),
  headers: { 'Content-Type': 'application/json' }
});

POST(req, {}).then(res => {
  console.log(res.status);
  res.text().then(console.log);
});
