import axios from 'axios';
import { getDbClient } from './db.js';
import 'dotenv/config';

async function verifyAI() {
  const client = getDbClient();

  try {
    await client.connect();
    
    console.log('--- Phase 0: Login as Admin ---');
    const loginRes = await axios.post('http://127.0.0.1:3000/auth/login', {
      username: 'admin',
      password: 'OpenClaw@2024'
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('Login successful, token obtained.');

    console.log('\n--- Phase 1: Create Content ---');
    const testTitle = `Bản tin thực tế AI ${Date.now()}`;
    const { rows: contentRows } = await client.query(
        "INSERT INTO content_items (title, body, status) VALUES ($1, $2, $3) RETURNING id",
        [testTitle, 'Nội dung rà soát thực tế: Đơn vị cần nâng cao cảnh giác, tuyệt đối không tiết lộ bí mật quân sự trên mạng xã hội.', 'draft']
    );
    const contentId = contentRows[0].id;
    console.log(`Content created with ID: ${contentId}`);

    console.log('\n--- Phase 2: Trigger AI Review ---');
    const reviewRes = await axios.get(`http://127.0.0.1:3000/ai/review/${contentId}`, { headers });
    console.log('Review Result:', JSON.stringify(reviewRes.data, null, 2));

    // Verify content update
    const { rows: updatedContent } = await client.query('SELECT summary, tags, status FROM content_items WHERE id = $1', [contentId]);
    console.log('Updated Content:', updatedContent[0]);
    if (updatedContent[0].summary && updatedContent[0].tags.includes('AI_Reviewed')) {
        console.log('SUCCESS: Content item updated with AI summary and tags.');
    }

    console.log('\n--- Phase 3: Check Suggestions ---');
    const suggRes = await axios.get('http://127.0.0.1:3000/ai/suggestions', { headers });
    const mySugg = suggRes.data.find((s: any) => s.content_id === contentId);
    if (mySugg) {
        console.log('SUCCESS: AI Suggestion found for content.');
        const suggestionId = mySugg.id;

        console.log('\n--- Phase 4: Apply Suggestion ---');
        const applyRes = await axios.get(`http://127.0.0.1:3000/ai/suggestions/${suggestionId}/apply`, { headers });
        console.log('Apply Result:', applyRes.data);

        // Verify schedule
        const { rows: schedules } = await client.query('SELECT * FROM broadcast_schedules WHERE content_id = $1', [contentId]);
        if (schedules.length > 0) {
            console.log('SUCCESS: Broadcast schedule created from suggestion.');
        }
    } else {
        console.error('FAILURE: AI Suggestion NOT found.');
    }

  } catch (err: any) {
    if (err.response) {
      console.error('Verification Error (Response):', err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Verification Error (Message):', err.message);
      console.error(err);
    }
  } finally {
    await client.end();
  }
}

verifyAI();
