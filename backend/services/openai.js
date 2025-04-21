const OpenAI = require('openai');
require('dotenv').config();

// Log API key status (but not the actual key)
console.log("OpenAI API Key Status:", process.env.OPENAI_API_KEY ? "Set" : "Missing");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: false, // Ensure server-side only
});

/**
 * Extracts assignments from syllabus text using OpenAI's GPT model
 * @param {string} syllabusText - The raw text from a syllabus
 * @returns {Promise<Object>} - Object with items array containing assignment objects
 */
async function extractAssignmentsFromSyllabus(syllabusText) {
  try {
    console.log("Starting assignment extraction with text length:", syllabusText.length);
    
    // Craft the prompt for GPT
    // Truncate syllabus if too long to avoid token limits
    const MAX_LENGTH = 15000; // Reasonable text length limit
    const truncatedText = syllabusText.length > MAX_LENGTH 
      ? syllabusText.substring(0, MAX_LENGTH) + "... [text truncated for token limit]"
      : syllabusText;
    
    const prompt = `You are an intelligent assistant that extracts academic assignments from a syllabus.

The syllabus text may be structured or unstructured. Your task is to identify all student-facing deliverables, and return them in JSON format.

For each item, identify:
- \`title\`: Name of the deliverable
- \`type\`: One of ['assignment', 'quiz', 'exam', 'paper', 'project'] 
- \`description\`: A short summary if available
- \`due_date\`: The date it's due (in YYYY-MM-DD format)
- \`start_date\`: Only include this if the type is 'paper' or 'project', and the start date is mentioned

IMPORTANT: Your response MUST be a properly formatted JSON object containing an array called "items". The structure should look like this:

{
  "items": [
    {
      "title": "Final Project Presentation",
      "type": "project",
      "start_date": "2025-03-10",
      "due_date": "2025-04-01",
      "description": "Team presentation on final project findings."
    },
    {
      "title": "Quiz 2",
      "type": "quiz",
      "due_date": "2025-02-15",
      "description": "Covers chapters 4–6."
    }
  ]
}

Or if no assignments are found:
{
  "items": []
}

Tips for extracting dates:
- If a date is mentioned like "September 15", convert it to "2025-09-15" format.
- If a day of week is mentioned like "due Friday", look for context to determine the date.
- If relative dates are mentioned like "Week 3", try to resolve to an actual date if possible.
- If no year is specified, assume the current academic year (2025).
- IMPORTANT: Even if a date is unclear, make your best estimate rather than excluding the item.

Be generous in your extraction. Even if you're not 100% sure something is an assignment, include it if it has:
1. A title or clear description
2. Any mention of a due date or deadline
3. Language that suggests submission, completion, or evaluation

If you can't find any assignments at all, still return: {"items": []}

Now process the following syllabus text:

${truncatedText}`;

    console.log("Sending request to OpenAI with API key:", process.env.OPENAI_API_KEY ? "Key is set" : "Missing key");
    
    // Ensure we're actually sending a valid OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is missing - check your environment variables");
      throw new Error("OpenAI API key is missing or invalid. Please check your .env file.");
    }
    
    // Set timeout for API calls - 45 seconds max
    const TIMEOUT_MS = 45000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("OpenAI API request timed out after 45 seconds")), TIMEOUT_MS);
    });
    
    // Call the OpenAI API with a timeout
    let response;
    try {
      // Try GPT-4 with timeout
      console.log("Attempting to call GPT-4o...");
      const gpt4Promise = openai.chat.completions.create({
        model: "gpt-4o",  // Using GPT-4o as it's the latest model compatible with project-scoped keys
        messages: [
          { role: "system", content: "You are a helpful assistant that extracts assignment information from syllabi." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,  // Lower temperature for more focused responses
        max_tokens: 4000,  // Allow enough tokens for the response
        response_format: { type: "json_object" }  // Request JSON format
      });
      
      response = await Promise.race([gpt4Promise, timeoutPromise]);
      console.log("Received response from GPT-4o");
    } catch (error) {
      console.warn("Error or timeout with GPT-4o, trying GPT-3.5-Turbo:", error.message);
      
      try {
        // Try GPT-3.5-Turbo with timeout
        const gpt35Promise = openai.chat.completions.create({
          model: "gpt-3.5-turbo",  // Fallback model
          messages: [
            { role: "system", content: "You are a helpful assistant that extracts assignment information from syllabi." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4000,
          response_format: { type: "json_object" }
        });
        
        response = await Promise.race([gpt35Promise, timeoutPromise]);
        console.log("Received response from GPT-3.5-Turbo");
      } catch (fallbackError) {
        console.error("Both GPT-4o and GPT-3.5-Turbo failed:", fallbackError.message);
        // Return an empty result rather than failing completely
        return { items: [] };
      }
    }

    if (!response || !response.choices || !response.choices[0]) {
      console.error("Invalid response format from OpenAI");
      return { items: [] };
    }

    // Extract the content from the response
    const content = response.choices[0].message.content;
    console.log("Received content length:", content.length);
    
    // Parse the JSON string to an object
    // The content might be a string containing JSON, or it might be a string containing
    // JSON within a code block, so we need to parse it carefully
    let assignments;
    try {
      // Log the content for debugging
      console.log("Raw content from OpenAI:", content.substring(0, 200) + "...");
      
      // First try to parse it directly
      const parsedContent = JSON.parse(content);
      
      // Check if the expected structure exists
      if (parsedContent.items) {
        assignments = parsedContent;
      } else if (Array.isArray(parsedContent)) {
        // If it's an array of assignments, wrap it in the expected structure
        assignments = { items: parsedContent };
      } else {
        // If there's no items property and it's not an array, look for any array property
        // that might contain the assignments
        const possibleArrayProps = Object.keys(parsedContent).find(key => 
          Array.isArray(parsedContent[key]) && 
          parsedContent[key].length > 0 && 
          parsedContent[key][0].title
        );
        
        if (possibleArrayProps) {
          assignments = { items: parsedContent[possibleArrayProps] };
        } else {
          console.warn("JSON parsed but no assignments found");
          assignments = { items: [] };
        }
      }
      
    } catch (error) {
      // If that fails, try to extract JSON from a code block
      console.warn("Failed to parse JSON directly, trying to extract from code block:", error.message);
      const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || content.match(/```\n([\s\S]*)\n```/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsedJson = JSON.parse(jsonMatch[1]);
          
          // Apply the same structure logic as above
          if (parsedJson.items) {
            assignments = parsedJson;
          } else if (Array.isArray(parsedJson)) {
            assignments = { items: parsedJson };
          } else {
            const possibleArrayProps = Object.keys(parsedJson).find(key => 
              Array.isArray(parsedJson[key]) && 
              parsedJson[key].length > 0 && 
              parsedJson[key][0].title
            );
            
            if (possibleArrayProps) {
              assignments = { items: parsedJson[possibleArrayProps] };
            } else {
              console.warn("JSON extracted from code block but no assignments found");
              assignments = { items: [] };
            }
          }
          
        } catch (innerError) {
          console.error("Failed to parse JSON from code block:", innerError.message);
          assignments = { items: [] };
        }
      } else {
        console.error('Failed to extract JSON from OpenAI response');
        assignments = { items: [] };
      }
    }
    
    // If no assignments were found, make a more detailed log
    if (!assignments.items || assignments.items.length === 0) {
      console.log("Complete OpenAI response content:", content);
    }

    console.log(`Successfully extracted ${assignments.items.length} assignments`);
    return assignments;
  } catch (error) {
    console.error('Error extracting assignments from syllabus:', error);
    // Return empty result rather than throwing
    return { items: [] };
  }
}

module.exports = {
  extractAssignmentsFromSyllabus
};