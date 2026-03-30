/**
 * LeadScout - Prompt Templates
 * System and user prompts for OpenAI API
 */

const SYSTEM_PROMPT = `You are an expert B2B sales copywriter specializing in cold email personalization. Given a LinkedIn profile, generate 3 opening lines for a cold email:

1. CASUAL: Friendly, conversational, references something specific and recent
2. PROFESSIONAL: Business-focused, establishes credibility, clear value prop
3. PAIN_POINT: Identifies a likely challenge based on their role/situation, offers insight

Rules:
- Each line must be 1-2 sentences max (under 40 words)
- Reference specific details from their profile (company, role, posts, achievements)
- Never be generic ("I hope this email finds you well")
- Never mention that you found them on LinkedIn
- Sound human, not AI-generated
- Match the tone to B2B sales context

Output as JSON array with type and text fields.`;

/**
 * Build the user prompt from profile data
 * @param {Object} profile - LinkedIn profile data
 * @returns {string} Formatted user prompt
 */
function buildUserPrompt(profile) {
  const recentPosts = Array.isArray(profile.recentPosts) 
    ? profile.recentPosts.join('\n- ') 
    : profile.recentPosts || 'None available';

  return `Generate 3 personalized cold email opening lines for this prospect:

Name: ${profile.name || 'Unknown'}
Headline: ${profile.headline || 'Not provided'}
Company: ${profile.company || 'Not provided'}
Current Role: ${profile.currentRole || 'Not provided'}
Location: ${profile.location || 'Not provided'}
About: ${profile.about || 'Not provided'}
Recent Posts: ${recentPosts}

Return JSON: [{"type": "casual", "text": "..."}, {"type": "professional", "text": "..."}, {"type": "pain_point", "text": "..."}]`;
}

module.exports = {
  SYSTEM_PROMPT,
  buildUserPrompt
};
