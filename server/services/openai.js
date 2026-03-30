/**
 * LeadScout - OpenAI Integration
 * Handles AI-powered opening line generation
 */

const OpenAI = require('openai');
const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompts');

let openai = null;
let mockMode = false;

/**
 * Check if we're using a placeholder/invalid API key
 */
function isPlaceholderKey(key) {
  if (!key) return true;
  const placeholders = ['sk-your', 'sk-test', 'sk-xxx', 'your-api-key', 'placeholder'];
  return placeholders.some(p => key.toLowerCase().includes(p));
}

/**
 * Initialize OpenAI client
 * Call this after environment variables are loaded
 */
function initializeOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  // Check if we're using a placeholder key - enable mock mode for testing
  if (isPlaceholderKey(process.env.OPENAI_API_KEY)) {
    console.log('⚠️  Mock mode enabled: Using placeholder API key. Set a real OPENAI_API_KEY for production.');
    mockMode = true;
    return;
  }
  
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/**
 * Generate mock opening lines for testing
 * @param {Object} profile - LinkedIn profile data
 * @returns {Array} Array of mock generated lines
 */
function generateMockLines(profile) {
  const name = profile.name ? profile.name.split(' ')[0] : 'there';
  const company = profile.company || 'your company';
  const role = profile.currentRole || profile.headline || 'your role';
  
  return [
    {
      type: 'casual',
      text: `Hey ${name}! Saw your work at ${company} — really impressive stuff. Quick question about how you're handling outreach at scale?`
    },
    {
      type: 'professional',
      text: `${name}, your experience as ${role} at ${company} caught my attention. I'd love to share how we're helping similar leaders streamline their prospecting.`
    },
    {
      type: 'pain_point',
      text: `Scaling outreach while maintaining personalization is brutal — especially at ${company}'s growth stage. What if your team could personalize 50 emails/day instead of 15?`
    }
  ];
}

/**
 * Generate personalized opening lines from profile data
 * @param {Object} profile - LinkedIn profile data
 * @returns {Promise<Array>} Array of generated lines
 */
async function generateOpeningLines(profile) {
  // Return mock data in mock mode (for testing with placeholder API keys)
  if (mockMode) {
    console.log('📝 Generating mock lines (mock mode active)');
    return generateMockLines(profile);
  }
  
  if (!openai) {
    throw new Error('OpenAI client not initialized. Call initializeOpenAI() first.');
  }

  const userPrompt = buildUserPrompt(profile);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error(`Failed to parse OpenAI response: ${content}`);
    }

    // Handle both array and object responses
    let lines;
    if (Array.isArray(parsed)) {
      lines = parsed;
    } else if (parsed.lines && Array.isArray(parsed.lines)) {
      lines = parsed.lines;
    } else if (parsed.response && Array.isArray(parsed.response)) {
      lines = parsed.response;
    } else {
      // Try to extract lines from object format
      lines = [
        { type: 'casual', text: parsed.casual || parsed.CASUAL || '' },
        { type: 'professional', text: parsed.professional || parsed.PROFESSIONAL || '' },
        { type: 'pain_point', text: parsed.pain_point || parsed.PAIN_POINT || '' }
      ].filter(l => l.text);
    }

    // Validate response structure
    if (!Array.isArray(lines) || lines.length === 0) {
      console.error('Invalid response format. Parsed:', JSON.stringify(parsed));
      throw new Error('Invalid response format from OpenAI');
    }

    // Normalize line types
    return lines.map(line => ({
      type: line.type.toLowerCase().replace(' ', '_'),
      text: line.text
    }));

  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('OpenAI API timeout. Please try again.');
    }
    throw error;
  }
}

module.exports = {
  initializeOpenAI,
  generateOpeningLines
};
