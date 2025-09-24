const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || '5000';
const BASE_URL = `http://${HOST}:${PORT}`;

async function smokeTest() {
  console.log(`🔍 Testing server at ${BASE_URL}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/books`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is running and responding');
      console.log(`📊 Found ${data.books?.length || 0} books in database`);
      console.log('🎉 Smoke test PASSED');
    } else {
      console.log(`❌ Server responded with status: ${response.status}`);
      console.log('💥 Smoke test FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Could not connect to server');
    console.log('💥 Smoke test FAILED');
    console.log('💡 Make sure the server is running with: npm run dev');
    process.exit(1);
  }
}

smokeTest();
