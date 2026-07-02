#!/usr/bin/env node
/**
 * fb-exec.js — Command interface for Facebook Business Agent
 * Usage: fb-exec.js "<natural language command>"
 *
 * Parses natural language commands and executes the right action.
 */

const { execSync } = require('child_process');

const COMMANDS = {
  // Posting
  'post': { type: 'publish', desc: 'Publish a post' },
  'story': { type: 'publish', desc: 'Create a story' },
  'publish': { type: 'publish', desc: 'Publish content' },

  // Messages
  'reply': { type: 'message', desc: 'Reply to conversation' },
  'message': { type: 'inbox', desc: 'Read inbox' },
  'inbox': { type: 'inbox', desc: 'List inbox' },
  'unread': { type: 'inbox', desc: 'Show unread' },

  // Campaigns
  'campaign': { type: 'campaign', desc: 'Create campaign' },
  'ad': { type: 'campaign', desc: 'Create ad' },
  'boost': { type: 'campaign', desc: 'Boost post' },
  'promote': { type: 'campaign', desc: 'Promote page' },

  // Analytics
  'analytics': { type: 'analytics', desc: 'Show analytics' },
  'report': { type: 'analytics', desc: 'Generate report' },
  'insights': { type: 'analytics', desc: 'View insights' },

  // Community
  'comments': { type: 'community', desc: 'Manage comments' },
  'reviews': { type: 'community', desc: 'Read reviews' },
};

const PAGES = {
  'smart link': '1235690416285843',
  'gamebox': '502352372970389',
  'luka': '736631022862990',
  'bayane': '689719514220951',
  'ha store': '584703364724653',
};

async function main() {
  const input = process.argv.slice(2).join(' ').toLowerCase();

  // Extract page name
  let pageId = null;
  for (const [name, id] of Object.entries(PAGES)) {
    if (input.includes(name)) { pageId = id; break; }
  }
  if (!pageId) pageId = '1235690416285843'; // default to Smart Link

  // Extract action
  let action = null;
  for (const [keyword, cmd] of Object.entries(COMMANDS)) {
    if (input.includes(keyword)) { action = cmd; break; }
  }

  if (!action) {
    console.log(`I understand these commands:
  • "Post [message] to [page]" — Publish content
  • "Create a Story for [page]" — Create story
  • "Reply to [contact]" — Send message
  • "Check inbox for [page]" — Read messages
  • "Create a campaign for [page]" — Ad campaigns
  • "Show analytics for [page]" — Page insights
  • "Read comments on [page]" — Community

Pages: Smart Link, GameBox, Luka Store, Bayane Kitchen, HA Store`);
    return;
  }

  console.log(`[${action.type}] ${action.desc} | Page ID: ${pageId}`);
  console.log(`Execute: node scripts/fb-${action.type === 'campaign' ? 'campaign' : action.type}.js ${pageId}`);
}

main().catch(console.error);
