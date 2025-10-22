/**
 * Test Security Middleware
 * This endpoint intentionally includes sensitive data to test if sanitization works
 */

const testSecuritySanitization = async (req, res) => {
  // This response INTENTIONALLY includes sensitive data
  // The security middleware should automatically remove it
  res.json({
    success: true,
    message: "Testing security sanitization",
    user: {
      id: 123,
      email: "test@example.com",
      password: "should-be-removed",           // ⚠️ Should be removed
      password_hash: "$2b$10$test...",         // ⚠️ Should be removed
      session_token: "abc123def456",           // ⚠️ Should be removed
      role: "admin",
    },
    data: [
      {
        id: 1,
        name: "User 1",
        password_hash: "$2b$10$user1...",     // ⚠️ Should be removed
        session_token: "token123",             // ⚠️ Should be removed
      },
      {
        id: 2,
        name: "User 2",
        password: "secret123",                 // ⚠️ Should be removed
      }
    ]
  });
};

const testHeaders = async (req, res) => {
  res.json({
    success: true,
    message: "Check the response headers in browser DevTools",
    instructions: [
      "Open DevTools (F12)",
      "Go to Network tab",
      "Look at this request's Response Headers",
      "Verify X-Powered-By is NOT present",
      "Verify security headers ARE present"
    ]
  });
};

module.exports = {
  testSecuritySanitization,
  testHeaders,
};
