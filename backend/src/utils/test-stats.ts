import axios from 'axios';

async function testStats() {
  try {
    console.log('--- Testing Dashboard Stats API ---');
    const response = await axios.get('http://localhost:3000/dashboard/stats');
    console.log('Success:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('Failed:', error.response.status, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Failed:', error.message);
    }
  }
}

testStats();
