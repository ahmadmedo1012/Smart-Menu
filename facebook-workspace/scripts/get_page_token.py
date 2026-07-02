#!/usr/bin/env python3
"""Generate Page Access Token from User Token.
Usage: python3 get_page_token.py <user_token>
"""

import requests, json, sys

API = "https://graph.facebook.com/v22.0"
APP_ID = "2059203361346260"

PAGES = {
    "1235690416285843": "Smart Link-الربط الذكي",
    "502352372970389": "GameBox / جيم بوكس",
    "355806144287241": "GameBox-Alt",
}

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 get_page_token.py <user_token>")
        print("\nFirst get your User Token from Graph API Explorer:")
        print(f"  https://developers.facebook.com/tools/explorer/{APP_ID}/")
        sys.exit(1)

    user_token = sys.argv[1]

    # Step 1: Verify token
    r = requests.get(f"{API}/me", params={
        "access_token": user_token,
        "fields": "id,name"
    })
    data = r.json()
    if "error" in data:
        print(f"❌ Error: {data['error']['message']}")
        sys.exit(1)
    print(f"✅ User: {data.get('name')} (ID: {data.get('id')})")

    # Step 2: List accessible pages
    print("\n📋 Checking page access...")
    r = requests.get(f"{API}/me/accounts", params={
        "access_token": user_token
    })
    accounts = r.json().get("data", [])
    if not accounts:
        print("⚠️  No pages accessible. Grant pages_show_list permission.")
        # Fallback: try reading pages directly
        for pid, pname in PAGES.items():
            r2 = requests.get(f"{API}/{pid}", params={
                "access_token": user_token,
                "fields": "id,name,access_token"
            })
            d2 = r2.json()
            if "access_token" in d2:
                print(f"\n✅ {pname}")
                print(f"   Page Token: {d2['access_token'][:50]}...")
                print(f"   Save this token!")
            else:
                print(f"❌ {pname}: No token access")
        sys.exit(0)

    # Step 3: Get page tokens
    print(f"\nFound {len(accounts)} pages:\n")
    for acc in accounts:
        name = acc.get("name", "?")
        pid = acc.get("id", "?")
        token = acc.get("access_token", "N/A")
        print(f"✅ {name}")
        print(f"   Page ID: {pid}")
        print(f"   Token: {token[:50]}...")
        print()

    # Step 4: Exchange for long-lived User Token
    print("To extend user token to 60 days:")
    print(f"  Use App Secret (click Show in settings)")
    print(f"  GET {API}/oauth/access_token")
    print(f"    ?grant_type=fb_exchange_token")
    print(f"    &client_id={APP_ID}")
    print(f"    &client_secret=<APP_SECRET>")
    print(f"    &fb_exchange_token=<current_token>")

if __name__ == "__main__":
    main()
