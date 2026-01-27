import requests
import sys
from datetime import datetime
import json

class ContentFactoryAPITester:
    def __init__(self, base_url="https://createflow-10.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            self.results.append({
                "test": name,
                "success": success,
                "status_code": response.status_code,
                "expected_status": expected_status,
                "response": response.text[:500] if not success else "OK"
            })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.results.append({
                "test": name,
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_status_create(self):
        """Test status creation"""
        return self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data={"client_name": "test_client"}
        )

    def test_status_get(self):
        """Test getting status checks"""
        return self.run_test("Get Status Checks", "GET", "status", 200)

    def test_tweet_generation(self):
        """Test tweet generation (will fail without OpenAI key)"""
        return self.run_test(
            "Generate Tweet",
            "POST",
            "generate/tweet",
            520,  # Expected to fail without API key
            data={
                "topic": "Test tweet about AI",
                "mode": "classic",
                "length": "short",
                "variants": 1,
                "persona": "expert",
                "tone": "casual",
                "language": "en"
            }
        )

    def test_quote_generation(self):
        """Test quote generation (will fail without OpenAI key)"""
        return self.run_test(
            "Generate Quote",
            "POST",
            "generate/quote",
            520,  # Expected to fail without API key
            data={
                "tweet_url": "https://x.com/test/status/123",
                "tweet_content": "This is a test tweet",
                "length": "short",
                "variants": 1
            }
        )

    def test_reply_generation(self):
        """Test reply generation (will fail without OpenAI key)"""
        return self.run_test(
            "Generate Reply",
            "POST",
            "generate/reply",
            520,  # Expected to fail without API key
            data={
                "tweet_url": "https://x.com/test/status/123",
                "tweet_content": "This is a test tweet",
                "length": "short",
                "reply_mode": "support",
                "variants": 1
            }
        )

    def test_article_generation(self):
        """Test article generation (will fail without OpenAI key)"""
        return self.run_test(
            "Generate Article",
            "POST",
            "generate/article",
            520,  # Expected to fail without API key
            data={
                "topic": "Test article about AI technology",
                "length": "standard",
                "style": "authority",
                "language": "en"
            }
        )

    def test_generation_history(self):
        """Test generation history endpoint"""
        return self.run_test("Get Generation History", "GET", "generations/history", 200)

    def test_user_stats(self):
        """Test user stats endpoint"""
        return self.run_test("Get User Stats", "GET", "user/stats", 200)

    def test_favorites_get(self):
        """Test get favorites endpoint"""
        return self.run_test("Get Favorites", "GET", "favorites", 200)

    def test_favorites_add(self):
        """Test add to favorites endpoint"""
        return self.run_test(
            "Add to Favorites",
            "POST",
            "favorites",
            200,
            data={
                "content": "Test favorite content",
                "type": "tweet"
            }
        )

def main():
    print("🚀 Starting ContentFactory API Tests...")
    print("=" * 50)
    
    tester = ContentFactoryAPITester()

    # Test basic endpoints
    tester.test_health_check()
    tester.test_root_endpoint()
    
    # Test status endpoints
    tester.test_status_create()
    tester.test_status_get()
    
    # Test generation endpoints (expected to fail without OpenAI key)
    print("\n📝 Testing Content Generation Endpoints (Expected to fail without OpenAI API key):")
    tester.test_tweet_generation()
    tester.test_quote_generation()
    tester.test_reply_generation()
    tester.test_article_generation()
    
    # Test history endpoint
    tester.test_generation_history()

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    # Detailed results
    print("\n📋 Detailed Results:")
    for result in tester.results:
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['test']}")
        if not result["success"] and "error" in result:
            print(f"   Error: {result['error']}")
    
    return 0 if tester.tests_passed >= 6 else 1  # At least basic endpoints should work

if __name__ == "__main__":
    sys.exit(main())