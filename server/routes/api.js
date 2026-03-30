/**
 * LeadScout - API Routes
 * RESTful endpoints for generation and stats
 */

const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { generateOpeningLines } = require('../services/openai');

/**
 * POST /api/scrape-url
 * Fetch and parse LinkedIn profile data from a URL
 */
router.post('/scrape-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Missing required field: url'
      });
    }

    // Check for Sales Navigator URLs
    if (/linkedin\.com\/sales\//i.test(url)) {
      return res.status(400).json({
        error: 'Sales Navigator URL not supported',
        details: 'Sales Navigator URLs are not supported — please use the standard LinkedIn profile URL (linkedin.com/in/username)',
        urlType: 'sales_navigator'
      });
    }

    // Check for mobile LinkedIn URLs
    if (/linkedin\.com\/mweb\//i.test(url)) {
      return res.status(400).json({
        error: 'Mobile URL not supported',
        details: 'Mobile LinkedIn URLs detected — please use the desktop profile URL (linkedin.com/in/username)',
        urlType: 'mobile'
      });
    }

    // Validate LinkedIn URL format
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)\/?/;
    const match = url.match(linkedinPattern);

    if (!match) {
      return res.status(400).json({
        error: 'Invalid LinkedIn URL',
        details: 'Please provide a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)'
      });
    }

    const username = decodeURIComponent(match[2]);

    // Helper function to generate name from username
    const nameFromUsername = (uname) => uname
      .replace(/-/g, ' ')
      .replace(/\d+$/, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Attempt to fetch profile data
    // Note: LinkedIn blocks direct scraping, so we use a best-effort approach
    try {
      const fetch = (await import('node-fetch')).default;
      
      // Use AbortController for reliable timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      let response;
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const html = await response.text();

      // Extract data from meta tags and page content
      const profile = {
        name: '',
        headline: '',
        company: '',
        currentRole: '',
        location: '',
        about: ''
      };

      // Extract from Open Graph / meta tags
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
      if (ogTitleMatch) {
        const ogTitle = ogTitleMatch[1];
        // Format: "Name - Title - Company | LinkedIn"
        const titleParts = ogTitle.split(' - ');
        if (titleParts.length >= 1) {
          profile.name = titleParts[0].trim();
        }
        if (titleParts.length >= 2) {
          profile.headline = titleParts.slice(1).join(' - ').replace(/\s*\|\s*LinkedIn.*$/i, '').trim();
        }
      }

      const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
      if (ogDescMatch) {
        const desc = ogDescMatch[1];
        // Often contains location and connection info
        const locationMatch = desc.match(/^([^·]+)·/);
        if (locationMatch) {
          profile.location = locationMatch[1].trim();
        }
      }

      // Try to extract company from headline
      if (profile.headline) {
        const atMatch = profile.headline.match(/@\s*([^|,]+)/i);
        const atCompanyMatch = profile.headline.match(/at\s+([^|,]+)/i);
        if (atMatch) {
          profile.company = atMatch[1].trim();
        } else if (atCompanyMatch) {
          profile.company = atCompanyMatch[1].trim();
        }

        // Extract role from headline
        const rolePatterns = [
          /^([^@|]+?)(?:\s+@|\s+at\s+)/i,
          /^([^|]+)/
        ];
        for (const pattern of rolePatterns) {
          const roleMatch = profile.headline.match(pattern);
          if (roleMatch) {
            const role = roleMatch[1].trim();
            if (role.length < 100) {
              profile.currentRole = role;
              break;
            }
          }
        }
      }

      // Fallback: use username to generate name if not found
      if (!profile.name && username) {
        profile.name = nameFromUsername(username);
      }

      // Determine if we got limited data (only name from URL or minimal meta)
      const hasRichData = profile.headline || profile.company || profile.location || profile.about;
      const isLimitedData = !hasRichData;

      res.status(200).json({
        success: true,
        profile,
        source: isLimitedData ? 'url_parse' : 'meta_tags',
        limitedData: isLimitedData,
        note: isLimitedData 
          ? 'Limited data available — for full profile extraction, use the Chrome extension on LinkedIn.'
          : 'Profile data loaded successfully.'
      });

    } catch (fetchError) {
      // Handle specific error types
      let errorNote = 'Could not fetch profile data from LinkedIn.';
      
      if (fetchError.name === 'AbortError') {
        errorNote = 'Request timed out — LinkedIn may be slow or blocking requests.';
      } else if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED') {
        errorNote = 'Network error — please check your internet connection.';
      }

      // If fetch fails, return parsed username as fallback with clear messaging
      const name = nameFromUsername(username);

      res.status(200).json({
        success: true,
        profile: {
          name,
          headline: '',
          company: '',
          currentRole: '',
          location: '',
          about: ''
        },
        source: 'url_parse',
        limitedData: true,
        note: `${errorNote} Limited data available — for full profile extraction, use the Chrome extension on LinkedIn.`
      });
    }

  } catch (error) {
    console.error('Error scraping URL:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      details: error.message
    });
  }
});

/**
 * POST /api/generate
 * Generate personalized opening lines from LinkedIn profile data
 */
router.post('/generate', async (req, res) => {
  try {
    const profile = req.body;

    // Validate required field
    if (!profile.name || typeof profile.name !== 'string' || profile.name.trim() === '') {
      return res.status(400).json({ 
        error: 'Missing required field: name' 
      });
    }

    // Generate lines using OpenAI
    const lines = await generateOpeningLines(profile);

    // Save to database
    const generation = db.saveGeneration(profile, lines);

    // Return response
    res.status(200).json({
      id: generation.id,
      lines: generation.lines,
      createdAt: generation.createdAt
    });

  } catch (error) {
    console.error('Error generating lines:', error);
    
    // Handle specific error types
    if (error.message.includes('OPENAI_API_KEY')) {
      return res.status(500).json({ 
        error: 'OpenAI API error', 
        details: 'API key not configured' 
      });
    }
    
    if (error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: 'OpenAI API timeout', 
        details: 'Please try again' 
      });
    }

    res.status(500).json({ 
      error: 'OpenAI API error', 
      details: error.message 
    });
  }
});

/**
 * GET /api/generations
 * Retrieve recent generation history
 */
router.get('/generations', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    const generations = db.getRecentGenerations(limit);
    const stats = db.getStats();

    res.status(200).json({
      generations,
      total: stats.allTime
    });

  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ 
      error: 'Database error', 
      details: error.message 
    });
  }
});

/**
 * GET /api/generations/:id
 * Get full details of a specific generation
 */
router.get('/generations/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const generation = db.getGenerationById(id);
    
    if (!generation) {
      return res.status(404).json({ 
        error: 'Generation not found' 
      });
    }

    res.status(200).json(generation);

  } catch (error) {
    console.error('Error fetching generation:', error);
    res.status(500).json({ 
      error: 'Database error', 
      details: error.message 
    });
  }
});

/**
 * GET /api/stats
 * Get usage statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.status(200).json(stats);

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Database error', 
      details: error.message 
    });
  }
});

module.exports = router;
