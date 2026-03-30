/**
 * LeadScout - Frontend Application
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profile-form');
  const generateBtn = document.getElementById('generate-btn');
  const btnText = generateBtn.querySelector('.btn-text');
  const btnLoading = generateBtn.querySelector('.btn-loading');
  const resultsSection = document.getElementById('results-section');
  const resultsContainer = document.getElementById('results-container');
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');
  const toast = document.getElementById('toast');

  // URL fetch elements
  const linkedinUrlInput = document.getElementById('linkedinUrl');
  const fetchProfileBtn = document.getElementById('fetch-profile-btn');
  const fetchText = fetchProfileBtn.querySelector('.fetch-text');
  const fetchLoading = fetchProfileBtn.querySelector('.fetch-loading');
  const urlInfoBanner = document.getElementById('url-info-banner');

  // Load stats on page load
  loadStats();

  /**
   * Validate LinkedIn URL with specific error messages
   * Returns { valid: boolean, error?: string }
   */
  function validateLinkedInUrl(url) {
    if (!url) {
      return { valid: false, error: 'Please enter a LinkedIn URL' };
    }

    // Check for Sales Navigator URLs
    if (/linkedin\.com\/sales\//i.test(url)) {
      return { 
        valid: false, 
        error: 'Sales Navigator URLs are not supported — please use the standard LinkedIn profile URL (linkedin.com/in/username)' 
      };
    }

    // Check for mobile LinkedIn URLs
    if (/linkedin\.com\/mweb\//i.test(url)) {
      return { 
        valid: false, 
        error: 'Mobile LinkedIn URLs detected — please use the desktop profile URL (linkedin.com/in/username)' 
      };
    }

    // Check for company pages
    if (/linkedin\.com\/company\//i.test(url)) {
      return { 
        valid: false, 
        error: 'Company page URLs are not supported — please use a personal profile URL (linkedin.com/in/username)' 
      };
    }

    // Check for jobs/posts/other LinkedIn pages
    if (/linkedin\.com\/(jobs|posts|pulse|groups|events|learning)\//i.test(url)) {
      return { 
        valid: false, 
        error: 'This LinkedIn URL type is not supported — please use a profile URL (linkedin.com/in/username)' 
      };
    }

    // Validate standard profile URL format
    if (!url.match(/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/i)) {
      return { 
        valid: false, 
        error: 'Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)' 
      };
    }

    return { valid: true };
  }

  /**
   * Show or hide the URL info banner
   */
  function showUrlInfoBanner(message, type = 'info') {
    if (!urlInfoBanner) return;
    
    urlInfoBanner.textContent = message;
    urlInfoBanner.className = `url-info-banner ${type}`;
    urlInfoBanner.style.display = 'block';
  }

  function hideUrlInfoBanner() {
    if (urlInfoBanner) {
      urlInfoBanner.style.display = 'none';
    }
  }

  // Fetch Profile button handler
  fetchProfileBtn.addEventListener('click', async () => {
    const url = linkedinUrlInput.value.trim();
    
    // Hide previous banners and errors
    hideUrlInfoBanner();
    errorSection.style.display = 'none';

    // Validate URL with specific error messages
    const validation = validateLinkedInUrl(url);
    if (!validation.valid) {
      showError(validation.error);
      return;
    }

    // Show loading state
    setFetchLoading(true);

    try {
      const response = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        // Use detailed error message from server if available
        throw new Error(data.details || data.error || 'Failed to fetch profile');
      }

      // Pre-fill form fields - always populate whatever we have
      const profile = data.profile;
      
      // Always set name (at minimum we have this from URL parsing)
      document.getElementById('name').value = profile.name || '';
      document.getElementById('company').value = profile.company || '';
      document.getElementById('headline').value = profile.headline || '';
      document.getElementById('currentRole').value = profile.currentRole || '';
      document.getElementById('location').value = profile.location || '';
      document.getElementById('about').value = profile.about || '';

      // Show appropriate feedback based on data completeness
      if (data.limitedData) {
        // Show prominent info banner for limited data
        showUrlInfoBanner(
          '📋 Basic info extracted from URL. For complete profile data (headline, about, recent posts), visit the LinkedIn profile and click the LeadScout extension icon.',
          'warning'
        );
        showToastMessage('Name extracted — fill in additional details manually');
      } else {
        showToastMessage(data.note || 'Profile data loaded! Review and generate.');
      }

      // Focus on the next empty field for easier completion
      const fieldsToCheck = ['name', 'company', 'headline', 'currentRole'];
      for (const fieldId of fieldsToCheck) {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
          field.focus();
          return;
        }
      }
      // If all main fields filled, focus on name for review
      document.getElementById('name').focus();

    } catch (error) {
      showError(error.message);
    } finally {
      setFetchLoading(false);
    }
  });

  /**
   * Set fetch button loading state
   */
  function setFetchLoading(loading) {
    fetchProfileBtn.disabled = loading;
    fetchText.style.display = loading ? 'none' : 'inline';
    fetchLoading.style.display = loading ? 'inline' : 'none';
  }

  /**
   * Show toast with custom message
   */
  function showToastMessage(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      toast.textContent = 'Copied to clipboard!';
    }, 3000);
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hide previous results/errors
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    // Get form data
    const formData = new FormData(form);
    const profileData = {
      name: formData.get('name'),
      headline: formData.get('headline') || '',
      company: formData.get('company') || '',
      currentRole: formData.get('currentRole') || '',
      location: formData.get('location') || '',
      about: formData.get('about') || '',
      recentPosts: formData.get('recentPosts') 
        ? formData.get('recentPosts').split('\n').filter(p => p.trim())
        : []
    };

    // Validate required fields
    if (!profileData.name.trim()) {
      showError('Name is required');
      return;
    }

    // Show loading state
    setLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate lines');
      }

      // Display results
      displayResults(data.lines);
      
      // Refresh stats
      loadStats();

    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  });

  /**
   * Display generated lines
   */
  function displayResults(lines) {
    resultsContainer.innerHTML = '';

    lines.forEach(line => {
      const card = document.createElement('div');
      card.className = 'line-card';
      
      const typeClass = line.type.toLowerCase().replace('_', '-');
      
      card.innerHTML = `
        <span class="line-type ${typeClass}">${formatType(line.type)}</span>
        <p class="line-text">${escapeHtml(line.text)}</p>
        <button class="copy-btn" data-text="${escapeAttr(line.text)}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/>
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
          </svg>
          Copy
        </button>
      `;

      // Copy button handler
      const copyBtn = card.querySelector('.copy-btn');
      copyBtn.addEventListener('click', () => {
        copyToClipboard(line.text, copyBtn);
      });

      resultsContainer.appendChild(card);
    });

    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Copy text to clipboard
   */
  async function copyToClipboard(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      
      // Update button state
      btn.classList.add('copied');
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
        Copied!
      `;
      
      // Show toast
      showToast();
      
      // Reset button after 2s
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/>
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
          </svg>
          Copy
        `;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  /**
   * Show toast notification
   */
  function showToast() {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  /**
   * Show error message
   */
  function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Set loading state
   */
  function setLoading(loading) {
    generateBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline';
    btnLoading.style.display = loading ? 'inline' : 'none';
  }

  /**
   * Load usage stats
   */
  async function loadStats() {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      
      document.getElementById('stats-today').textContent = `Today: ${data.today || 0}`;
      document.getElementById('stats-total').textContent = `Total: ${data.allTime || 0}`;
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  /**
   * Format line type for display
   */
  function formatType(type) {
    const types = {
      'casual': 'Casual',
      'professional': 'Professional',
      'pain_point': 'Pain Point',
      'pain-point': 'Pain Point'
    };
    return types[type.toLowerCase()] || type;
  }

  /**
   * Escape HTML entities
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escape attribute value
   */
  function escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
});
