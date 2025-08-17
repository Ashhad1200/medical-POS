const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

// Test data
const testAuth = {
  headers: {
    'Authorization': 'Bearer test-token', // You'll need to replace with actual token
    'Content-Type': 'application/json'
  }
};

async function testStatusTransitions() {
  try {
    console.log('🧪 Testing Purchase Order Status Transitions...');
    
    // 1. Get existing purchase orders
    console.log('\n1. Fetching existing purchase orders...');
    const response = await axios.get(`${BASE_URL}/purchase-orders`, testAuth);
    const purchaseOrders = response.data.data || response.data;
    
    if (!purchaseOrders || purchaseOrders.length === 0) {
      console.log('❌ No purchase orders found. Please create some test data first.');
      return;
    }
    
    const testPO = purchaseOrders.find(po => po.status === 'pending');
    if (!testPO) {
      console.log('❌ No pending purchase orders found for testing.');
      return;
    }
    
    console.log(`✅ Found test PO: ${testPO.po_number} (Status: ${testPO.status})`);
    
    // 2. Test Cancel endpoint
    console.log('\n2. Testing cancel endpoint...');
    try {
      const cancelResponse = await axios.patch(
        `${BASE_URL}/purchase-orders/${testPO.id}/cancel`,
        { reason: 'Testing cancel functionality' },
        testAuth
      );
      console.log('✅ Cancel endpoint works:', cancelResponse.data.message);
    } catch (error) {
      console.log('❌ Cancel endpoint failed:', error.response?.data?.message || error.message);
    }
    
    // 3. Test Apply endpoint (find another pending PO)
    const anotherTestPO = purchaseOrders.find(po => po.status === 'pending' && po.id !== testPO.id);
    if (anotherTestPO) {
      console.log('\n3. Testing apply endpoint...');
      try {
        const applyResponse = await axios.patch(
          `${BASE_URL}/purchase-orders/${anotherTestPO.id}/apply`,
          {},
          testAuth
        );
        console.log('✅ Apply endpoint works:', applyResponse.data.message);
      } catch (error) {
        console.log('❌ Apply endpoint failed:', error.response?.data?.message || error.message);
      }
    }
    
    // 4. Test Receive endpoint (find another pending PO)
    const thirdTestPO = purchaseOrders.find(po => 
      po.status === 'pending' && 
      po.id !== testPO.id && 
      po.id !== anotherTestPO?.id
    );
    if (thirdTestPO) {
      console.log('\n4. Testing receive endpoint...');
      try {
        const receiveResponse = await axios.patch(
          `${BASE_URL}/purchase-orders/${thirdTestPO.id}/receive`,
          {},
          testAuth
        );
        console.log('✅ Receive endpoint works:', receiveResponse.data.message);
      } catch (error) {
        console.log('❌ Receive endpoint failed:', error.response?.data?.message || error.message);
      }
    }
    
    console.log('\n🎉 Status transition testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testStatusTransitions();