import axios from 'axios';

async function testLogin() {
  try {
    console.log('--- Testing API Login ---');
    const response = await axios.post('http://localhost:3000/auth/login', {
      username: 'admin',
      password: 'OpenClaw@2024'
    });
    console.log('Success:', response.data);
  } catch (error: any) {
    console.error('Failed:', error.response?.status, error.response?.data || error.message);
  }
}

testLogin();
