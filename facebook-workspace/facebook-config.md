# Meta Application Configuration Guide — Smart-Link
# ================================================
# Generated: 2026-07-03
# Purpose: Complete guide to configure a Meta Developer Application
#          for autonomous AI-driven Facebook management.

## ─── TABLE OF CONTENTS ───
# 1. Create Facebook Developer App
# 2. Configure Products
# 3. Required Permissions
# 4. Token Generation
# 5. Webhook Setup
# 6. Security Checklist
# 7. Quick Reference

## ─── 1. CREATE DEVELOPER APP ───

### Step 1: Register as a Facebook Developer
1. Go to https://developers.facebook.com/
2. Click "Get Started" → Register (phone/credit card verification required)
3. Accept the Facebook Platform Policies

### Step 2: Create a New App
1. Go to https://developers.facebook.com/apps/create/
2. Choose "Business" as the app type (NOT Consumer)
   - Business type allows: Page management, Ads API, Business Manager integration
   - Consumer type is for login-only apps (insufficient for our needs)
3. Fill in:
   - App Name: `Smart-Link Business Manager`
   - Contact Email: (your email)
   - Business Manager: `1414660969553894` (link to your existing Business Manager)
4. Click "Create App"

### Step 3: Get App Credentials
After creation, on the Dashboard:
- **App ID**: Copy this → your `META_APP_ID`
- **App Secret**: Click "Show" → copy this → `META_APP_SECRET`

## ─── 2. CONFIGURE PRODUCTS ───

### Product: Facebook Login for Business
1. In left sidebar, go to "Products" → "Facebook Login" → "Settings"
2. Add platform: "Website"
3. Set Site URL: `https://smart-menu-sigma.vercel.app`
4. Save
5. Under "Facebook Login Settings":
   - Valid OAuth Redirect URIs:
     - `https://smart-menu-sigma.vercel.app/auth/facebook/callback`
     - `https://business.facebook.com` (for Business Manager auth)
   - Deauthorize Callback URL: `https://smart-menu-sigma.vercel.app/deauthorize`
   - Data Deletion Request Callback: `https://smart-menu-sigma.vercel.app/data-deletion`
6. Save

### Product: Graph API
- Pre-configured once Facebook Login is added
- Version: v22.0 (latest as of July 2026)
- Endpoint: `https://graph.facebook.com/v22.0/`

### Product: Marketing API (Ads)
1. In left sidebar, go to "Products" → "Marketing API"
2. Accept the Marketing API terms
3. Note your Ad Account ID: `659787046865664`
4. Marketing API endpoint: `https://graph.facebook.com/v22.0/act_659787046865664`

### Product: Webhooks
1. In left sidebar, go to "Products" → "Webhooks"
2. Click "Add Subscription" → select "Page"
3. Configure:
   - Callback URL: `https://smart-menu-sigma.vercel.app/api/webhooks/facebook`
   - Verify Token: Generate a random token (write it down)
   - Click "Verify and Save"

After verification, subscribe to these fields:
- ✅ `feed` — Page posts, status updates
- ✅ `messages` — Incoming messages (Messenger)
- ✅ `messaging_postbacks` — Postback callbacks
- ✅ `comments` — Comments on page posts
- ✅ `mentions` — Mentions of the page
- ✅ `ratings` — Page ratings (if applicable)

### Product: Instagram Basic Display (Future)
- Add when you need Instagram automation
- Requires separate app review

### Product: WhatsApp (Future)
- Add when you need WhatsApp messaging
- Requires WhatsApp Business Account setup

## ─── 3. REQUIRED PERMISSIONS ───

These permissions must be requested through App Review.
Some are auto-granted if you're the app admin.

### Auto-granted (no review needed for admin):
│ pages_show_list          │
│ pages_read_engagement    │
│ pages_manage_metadata    │
│ business_management      │

### Requires App Review:
| Permission                 | Why We Need It                        | Use Case                    |
|----------------------------|----------------------------------------|-----------------------------|
| pages_manage_posts         | Create, publish, schedule posts        | Posting & scheduling        |
| pages_manage_engagement    | Reply to comments, likes               | Community mgmt              |
| pages_messaging            | Read/reply to messages                 | Messenger automation        |
| read_insights              | Page analytics data                    | Reporting                   |
| ads_management             | Create, manage, pause campaigns        | Campaign manager            |
| ads_read                   | Read ad performance data               | Analytics                   |

### How to submit for App Review:
1. Go to App Dashboard → "App Review" → "Permissions and Features"
2. Request each permission with:
   - Detailed description of use (use the "Why We Need It" above)
   - Screen recording showing your app using the feature
   - Instructions for reviewers
3. Submit

## ─── 4. TOKEN GENERATION ───

### Short-lived User Token (2 hours)
```
GET https://graph.facebook.com/v22.0/oauth/access_token
  ?client_id=<APP_ID>
  &client_secret=<APP_SECRET>
  &grant_type=client_credentials
```

### Long-lived User Token (60 days)
Generate via Facebook Login flow, or extend from short-lived token:
```
GET https://graph.facebook.com/v22.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=<APP_ID>
  &client_secret=<APP_SECRET>
  &fb_exchange_token=<SHORT_TOKEN>
```

### Page Access Token (never expires with re-engagement)
```
GET https://graph.facebook.com/v22.0/<PAGE_ID>
  ?fields=access_token
  &access_token=<USER_TOKEN>
```

### Business Access Token
```
GET https://graph.facebook.com/v22.0/<BUSINESS_ID>
  ?fields=access_token
  &access_token=<USER_TOKEN>
```

## ─── 5. WEBHOOK SETUP ───

### Prerequisites
1. A public HTTPS server (Vercel, Render, Railway, etc.)
2. Deploy the webhook handler at an accessible URL

### Suggested api/webhook structure (for your Next.js app):
```
POST /api/webhooks/facebook
  - Validate x-hub-signature-256
  - Parse incoming events
  - Respond with 200 within 20 seconds

GET /api/webhooks/facebook
  - Required for verify challenge
  - Respond with hub.challenge
```

### Subscribe via API (alternative to dashboard):
```
POST https://graph.facebook.com/v22.0/<APP_ID>/subscriptions
  ?object=page
  &callback_url=<YOUR_URL>/api/webhooks/facebook
  &verify_token=<VERIFY_TOKEN>
  &fields=feed,messages,comments,mentions,messaging_postbacks,ratings
  &access_token=<APP_TOKEN>
```

## ─── 6. SECURITY CHECKLIST ───

- [ ] App Secret is stored securely (never in client-side code)
- [ ] Access tokens are stored in environment variables
- [ ] Webhook verify token is random and unique
- [ ] OAuth redirect URIs are restricted to known domains
- [ ] App is in "Development" mode until testing is complete
- [ ] App Review submitted for all required permissions
- [ ] Data Deletion callback URL is functional
- [ ] Rate limits understood:
  - Graph API: 200 calls/user/hour (per app)
  - Marketing API: based on ad account spend
  - Page Messaging: based on page quality
- [ ] Webhook signature validation is implemented

## ─── 7. QUICK REFERENCE ───

### Your Discovered IDs
| Resource                | ID                                     |
|------------------------|----------------------------------------|
| User ID                | 61553916910057                         |
| Smart Link Page ID     | 1235690416285843                       |
| GameBox Page ID        | 502352372970389                        |
| Business Manager ID    | 1414660969553894                       |
| Ad Account ID          | 659787046865664                        |
| Business Manager URL   | business.facebook.com                  |

### Graph API Base URL
```
https://graph.facebook.com/v22.0/
```

### Common Graph API Calls
```bash
# Get page info
curl -X GET "https://graph.facebook.com/v22.0/1235690416285843?access_token=<TOKEN>&fields=name,about,likes,followers"

# Publish a post
curl -X POST "https://graph.facebook.com/v22.0/1235690416285843/feed?message=<MESSAGE>&access_token=<TOKEN>"

# Get page insights
curl -X GET "https://graph.facebook.com/v22.0/1235690416285843/insights?metric=page_impressions,page_engaged_users&period=day&access_token=<TOKEN>"

# Get conversations
curl -X GET "https://graph.facebook.com/v22.0/1235690416285843/conversations?access_token=<TOKEN>"

# Create campaign (Marketing API)
curl -X POST "https://graph.facebook.com/v22.0/act_659787046865664/campaigns?name=MyCampaign&objective=ENGAGEMENT&status=PAUSED&special_ad_categories=NONE&access_token=<TOKEN>"

# Read messages
curl -X GET "https://graph.facebook.com/v22.0/1235690416285843/conversations?fields=messages&access_token=<TOKEN>"
```

### Automation Scripts (existing)
| Script                    | Function                    |
|---------------------------|-----------------------------|
| fb-publish.js             | Publish posts/stories       |
| fb-inbox.js               | Read/reply messages         |
| fb-campaign.js            | Create campaigns            |
| fb-exec.js                | NL command interface        |
| dashboard/index.html      | AI-powered control center   |

## ─── FUTURE EXPANSION ───

### Instagram
- Product: Instagram Basic Display + Instagram Graph API
- Permissions: instagram_basic, instagram_manage_messages
- Token: Page token with instagram_manage_messages

### WhatsApp
- Product: WhatsApp Cloud API
- Requires: WhatsApp Business Account → WABA ID
- Permission: whatsapp_business_messaging
- Webhook: messages field on WhatsApp object

### Multiple Workspaces
- The Business Manager (1414660969553894) supports multiple ad accounts
- Each page has its own Page Access Token
- Scale by adding pages to the existing Business Manager
