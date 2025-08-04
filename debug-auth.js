// 调试认证状态的脚本
const axios = require('axios');

async function testAuth() {
  console.log('🔍 测试认证状态...\n');
  
  try {
    // 1. 测试登录
    console.log('1. 测试登录...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    const { token, user } = loginResponse.data;
    console.log('✅ 登录成功');
    console.log('Token:', token.substring(0, 20) + '...');
    console.log('User:', user.username, user.role);
    console.log('');
    
    // 2. 测试受保护的API
    console.log('2. 测试受保护的API...');
    const departmentsResponse = await axios.get('http://localhost:3002/api/departments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ 部门API调用成功');
    console.log('');
    
    // 3. 测试文件上传端点（不上传文件，只测试认证）
    console.log('3. 测试文件上传端点认证...');
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('departmentId', '1');
      
      const uploadResponse = await axios.post('http://localhost:3002/api/publications/import', form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...form.getHeaders()
        }
      });
      console.log('✅ 文件上传端点认证成功');
    } catch (uploadError) {
      if (uploadError.response?.status === 400) {
        console.log('✅ 文件上传端点认证成功（400错误是因为没有文件，认证通过了）');
      } else if (uploadError.response?.status === 401) {
        console.log('❌ 文件上传端点认证失败');
        console.log('错误:', uploadError.response.data);
      } else {
        console.log('⚠️ 文件上传端点其他错误:', uploadError.response?.status, uploadError.response?.data?.error);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testAuth();