/**
 * LeadScout - Background Service Worker
 * 
 * Minimal service worker for Manifest V3 compliance.
 * Handles extension lifecycle events and could be extended
 * for features like:
 * - Badge updates showing generation count
 * - Context menu integration
 * - Keyboard shortcuts
 */

// Log installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('LeadScout installed:', details.reason);
  
  if (details.reason === 'install') {
    // First time install - could show onboarding
    console.log('Welcome to LeadScout!');
  } else if (details.reason === 'update') {
    console.log('LeadScout updated to version:', chrome.runtime.getManifest().version);
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_TAB_URL':
      // Return current tab URL
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ url: tabs[0]?.url || '' });
      });
      return true; // Keep channel open
      
    case 'OPEN_DASHBOARD':
      // Open dashboard in new tab
      chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
      sendResponse({ success: true });
      break;
      
    case 'LOG':
      // Centralized logging from content scripts
      console.log(`[${sender.tab?.url || 'popup'}]`, message.data);
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
  
  return false;
});

// Update badge with generation count (future feature)
// chrome.storage.local.get(['todayCount'], (result) => {
//   const count = result.todayCount || 0;
//   if (count > 0) {
//     chrome.action.setBadgeText({ text: count.toString() });
//     chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
//   }
// });

console.log('LeadScout: Service worker started');
