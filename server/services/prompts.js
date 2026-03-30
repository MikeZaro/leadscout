/**
 * LeadScout - Prompt Templates
 * System and user prompts for OpenAI API
 */

const SYSTEM_PROMPT = `You are an expert B2B sales copywriter specializing in cold email personalization. Your task is to generate exactly 3 personalized opening lines for cold emails based on a LinkedIn profile.

For each line, follow these rules:
1. Must be 1-2 sentences max (under 40 words)
2. Reference specific details from their profile (company, role, posts, achievements)
3. Never be generic ("I hope this email finds you well")
4. Never mention that you found them on LinkedIn
5. Sound human, not AI-generated
6. Match the tone to B2B sales context

You will generate three lines:
- CASUAL: Friendly, conversational, references something specific and recent
- PROFESSIONAL: Business-focused, establishes credibility, clear value prop
- PAIN_POINT: Identifies a likely challenge based on their role/situation, offers insight

You MUST respond with ONLY valid JSON in this exact format:
[{"type": "casual", "text": "opening line here"}, {"type": "professional", "text": "opening line here"}, {"type": "pain_point", "text": "opening line here"}]`;

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
