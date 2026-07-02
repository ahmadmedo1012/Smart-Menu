import requests, json, sys

APP_ID = "2059203361346260"
APP_SECRET = "54IXJSA0ssYHC6Onk3AxryXrb0s"  # from App Token
API = "https://graph.facebook.com/v22.0"

# Step 1: Get App Access Token (already have it)
app_token = f"{APP_ID}|{APP_SECRET}"
print(f"App Token: {app_token[:30]}...")

# Step 2: Test Graph API — get app info
r = requests.get(f"{API}/{APP_ID}", params={"access_token": app_token, "fields": "id,name,linked_business"})
print(f"\nApp Info: {json.dumps(r.json(), indent=2)[:200]}")

# Step 3: Get business info
r = requests.get(f"{API}/1414660969553894", params={"access_token": app_token})
print(f"\nBusiness: {json.dumps(r.json(), indent=2)[:200]}")

# Step 4: Try to get page info via business
r = requests.get(f"{API}/1414660969553894/owned_pages", params={"access_token": app_token})
print(f"\nOwned Pages: {json.dumps(r.json(), indent=2)[:300]}")

# Step 5: Check ad account
r = requests.get(f"{API}/act_659787046865664", params={"access_token": app_token})
print(f"\nAd Account: {json.dumps(r.json(), indent=2)[:200]}")
