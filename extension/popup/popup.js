/**
 * LeadScout Extension - Popup Logic
 * Handles UI interactions, profile extraction, and API calls
 */

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// State
let currentProfile = null;

// DOM Elements
const elements = {
  notLinkedIn: document.getElementById('not-linkedin'),
  loading: document.getElementById('loading'),
  generating: document.getElementById('generating'),
  profileSection: document.getElementById('profile-section'),
  linesSection: document.getElementById('lines-section'),
  error: document.getElementById('error'),
  errorMessage: document.getElementById('error-message'),
  toast: document.getElementById('toast'),
  
  // Profile elements
  profileName: document.getElementById('profile-name'),
  profileHeadline: document.getElementById('profile-headline'),
  profileCompany: document.getElementById('profile-company'),
  profileLocation: document.getElementById('profile-location'),
  profileAbout: document.getElementById('profile-about'),
  profilePosts: document.getElementById('profile-posts'),
  
  // Buttons
  generateBtn: document.getElementById('generate-btn'),
  regenerateBtn: document.getElementById('regenerate-btn'),
  retryBtn: document.getElementById('retry-btn'),
  
  // Lines list
  linesList: document.getElementById('lines-list')
};

/**
 * Initialize popup
 */
async function init() {
  // Check if we're on LinkedIn
  const tab = await getCurrentTab();
  
  if (!tab || !tab.url || !tab.url.includes('linkedin.com/in/')) {
    showState('not-linkedin');
    return;
  }
  
  // We're on a LinkedIn profile, try to extract data
  showState('loading');
  
  try {
    const profile = await extractProfile(tab.id);
    
    if (profile && profile.name) {
      currentProfile = profile;
      displayProfile(profile);
      showState('profile');
    } else {
      showError('Could not extract profile data. Please refresh the LinkedIn page.');
    }
  } catch (err) {
    console.error('Extraction error:', err);
    showError('Failed to extract profile. Make sure you are on a LinkedIn profile page.');
  }
}

/**
 * Get the current active tab
 */
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Extract profile data from the LinkedIn page
 */
async function extractProfile(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      function: scrapeLinkedInProfile
    });
    
    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    
    return null;
  } catch (err) {
    console.error('Script execution error:', err);
    throw err;
  }
}

/**
 * This function runs in the LinkedIn page context
 * It extracts profile data from the DOM
 */
function scrapeLinkedInProfile() {
  // Helper to safely get text content
  const getText = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : '';
  };
  
  // Helper to get multiple elements text
  const getTexts = (selector, limit = 3) => {
    const els = document.querySelectorAll(selector);
    return Array.from(els).slice(0, limit).map(el => el.textContent.trim()).filter(Boolean);
  };
  
  // Extract profile data using LinkedIn's current selectors
  const name = getText('h1.text-heading-xlarge') || 
               getText('h1.inline.t-24') ||
               getText('h1');
  
  const headline = getText('div.text-body-medium.break-words') ||
                   getText('.text-body-medium');
  
  const location = getText('span.text-body-small.inline.t-black--light.break-words') ||
                   getText('.pv-top-card--list-bullet .text-body-small');
  
  // About section - try multiple selectors
  const aboutSection = document.querySelector('#about');
  let about = '';
  if (aboutSection) {
    const aboutText = aboutSection.closest('section')?.querySelector('.inline-show-more-text');
    about = aboutText ? aboutText.textContent.trim() : '';
  }
  if (!about) {
    about = getText('.pv-about-section .pv-about__summary-text') ||
            getText('[data-generated-suggestion-target="urn:li:fsu_profileAboutSummary"]');
  }
  
  // Current company and role
  const experienceSection = document.querySelector('#experience');
  let company = '';
  let currentRole = '';
  
  if (experienceSection) {
    const firstExp = experienceSection.closest('section')?.querySelector('.artdeco-list__item');
    if (firstExp) {
      currentRole = firstExp.querySelector('.t-bold span[aria-hidden="true"]')?.textContent.trim() || '';
      company = firstExp.querySelector('.t-normal span[aria-hidden="true"]')?.textContent.trim() || '';
    }
  }
  
  // Fallback for company from headline
  if (!company && headline) {
    const atMatch = headline.match(/(?:at|@)\s+([^|•]+)/i);
    if (atMatch) company = atMatch[1].trim();
  }
  
  // Recent posts/activity
  const recentPosts = getTexts('.feed-shared-update-v2 span.break-words', 3);
  
  return {
    name,
    headline,
    location,
    about: about.substring(0, 500), // Limit length
    company,
    currentRole: currentRole || headline.split(/[|•@]/)[0].trim(),
    recentPosts
  };
}

/**
 * Display extracted profile data
 */
function displayProfile(profile) {
  elements.profileName.textContent = profile.name || 'Unknown';
  elements.profileHeadline.textContent = profile.headline || '-';
  elements.profileCompany.textContent = profile.company || 'Unknown Company';
  elements.profileLocation.textContent = profile.location || '-';
  elements.profileAbout.textContent = truncate(profile.about, 100) || '-';
  
  if (profile.recentPosts && profile.recentPosts.length > 0) {
    elements.profilePosts.textContent = truncate(profile.recentPosts[0], 80);
  } else {
    elements.profilePosts.textContent = 'No recent posts';
  }
}

/**
 * Generate opening lines via API
 */
async function generateLines() {
  if (!currentProfile) {
    showError('No profile data available');
    return;
  }
  
  showState('generating');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(currentProfile)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    displayLines(data.lines);
    showState('lines');
    
  } catch (err) {
    console.error('Generation error:', err);
    
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showError('Cannot connect to server. Make sure LeadScout API is running on localhost:3000');
    } else {
      showError(err.message || 'Failed to generate lines');
    }
  }
}

/**
 * Display generated lines
 */
function displayLines(lines) {
  elements.linesList.innerHTML = '';
  
  lines.forEach((line, index) => {
    const card = document.createElement('div');
    card.className = 'line-card';
    
    const typeLabel = formatType(line.type);
    const typeClass = line.type.toLowerCase().replace(' ', '_');
    
    card.innerHTML = `
      <span class="line-type ${typeClass}">${typeLabel}</span>
      <p class="line-text">${escapeHtml(line.text)}</p>
      <button class="copy-button" data-text="${escapeAttr(line.text)}" title="Copy to clipboard">
        📋
      </button>
    `;
    
    elements.linesList.appendChild(card);
  });
  
  // Add copy handlers
  document.querySelectorAll('.copy-button').forEach(btn => {
    btn.addEventListener('click', handleCopy);
  });
}

/**
 * Handle copy button click
 */
async function handleCopy(e) {
  const btn = e.currentTarget;
  const text = btn.dataset.text;
  
  try {
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    btn.classList.add('copied');
    btn.textContent = '✓';
    
    // Show toast
    showToast();
    
    // Reset after delay
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.textContent = '📋';
    }, 2000);
    
  } catch (err) {
    console.error('Copy failed:', err);
    showError('Failed to copy to clipboard');
  }
}

/**
 * Show toast notification
 */
function showToast() {
  elements.toast.classList.add('show');
  elements.toast.classList.remove('hidden');
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
    setTimeout(() => {
      elements.toast.classList.add('hidden');
    }, 300);
  }, 2000);
}

/**
 * Show/hide UI states
 */
function showState(state) {
  // Hide all states
  elements.notLinkedIn.classList.add('hidden');
  elements.loading.classList.add('hidden');
  elements.generating.classList.add('hidden');
  elements.profileSection.classList.add('hidden');
  elements.linesSection.classList.add('hidden');
  elements.error.classList.add('hidden');
  
  // Show requested state
  switch (state) {
    case 'not-linkedin':
      elements.notLinkedIn.classList.remove('hidden');
      break;
    case 'loading':
      elements.loading.classList.remove('hidden');
      break;
    case 'generating':
      elements.generating.classList.remove('hidden');
      break;
    case 'profile':
      elements.profileSection.classList.remove('hidden');
      break;
    case 'lines':
      elements.linesSection.classList.remove('hidden');
      break;
    case 'error':
      elements.error.classList.remove('hidden');
      break;
  }
}

/**
 * Show error state
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  showState('error');
}

/**
 * Utility functions
 */
function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatType(type) {
  const types = {
    'casual': '💬 Casual',
    'professional': '💼 Professional',
    'pain_point': '🎯 Pain Point'
  };
  return types[type.toLowerCase()] || type;
}

/**
 * Event listeners
 */
elements.generateBtn.addEventListener('click', generateLines);
elements.regenerateBtn.addEventListener('click', generateLines);
elements.retryBtn.addEventListener('click', init);

// Initialize on popup open
document.addEventListener('DOMContentLoaded', init);
