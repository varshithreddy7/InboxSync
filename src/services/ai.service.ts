import OpenAI from "openai";

//Integrating AI for EmailCategorizer - Using GPT-4o-mini to categorize emails
class AiEmailCategorizer {
  private openai: OpenAI;
  private model = 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({ apiKey });
  }

  //Categorize a single email
  async categorizingEmail(subject: string, body: string, from: string): Promise<{ category: string; confidence: number; reasoning: string; }> {
    try {
      console.log(`Categorizing Eamil: ${subject}`);

  const instructionText = `You are an experienced email triage assistant focused on B2B outreach.

Your task: Read the incoming message and decide which single category best describes the sender intent. Use the provided categories.

CATEGORY DEFINITIONS:
1. **Interested** - Clear signals of genuine interest in the product/service
   - Examples: "Tell me more", "How much does it cost?", "Can we schedule a demo?", "This looks promising"
   
2. **Meeting Booked** - Explicit confirmation of scheduled or proposed meeting
   - Examples: "Let's meet Tuesday", "Call scheduled for 3 PM", "Available next week", "I've sent a calendar invite"
   
3. **Not Interested** - Explicit rejection or disinterest
   - Examples: "Not right now", "We're using a competitor", "Not interested", "No thank you"
   
4. **Spam** - Irrelevant, promotional, or auto-generated content
   - Examples: Marketing blast emails, notifications, system messages, completely unrelated content
   
5. **Out of Office** - Auto-reply or absence notification
   - Examples: "I'm out of office until...", "Auto-reply", "I'll be back on..."

IMPORTANT RULES:
- Respond ONLY with valid JSON (no markdown, no explanation)
- If email is unclear, choose the most likely category
- If multiple categories apply, prioritize: Meeting Booked > Interested > Not Interested > Spam > Out of Office
- Confidence should reflect your certainty (0.0 to 1.0)

RESPONSE FORMAT (MUST BE VALID JSON):
{
  "category": "Category Name",
  "confidence": 0.95,
  "reasoning": "Short explanation of the signal(s) used to choose this category"
}`;

      const userMessage = `
Subject: ${subject}
From: ${from}
Body: ${body}

Categorize this email.`;
      const aiResponse = await (this.openai as any).chat.completions.create({
        model: this.model,
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: instructionText,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      } as any);
      const replyText = aiResponse.choices?.[0]?.message?.content;
      if (typeof replyText !== 'string') throw new Error('Unexpected response type');

      // Parse JSON response from assistant output
      const result = this.parseJsonFromText(replyText);
      console.log(`Categorized as: ${result.category} (${(result.confidence * 100).toFixed(0)}%)`);

      return {
        category: result.category,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error("Error while categorizing email:", error);
      return {
        category: 'Spam',
        confidence: 0.5,
        reasoning: 'Error in categorization - defaulted to Spam',
      }
    }
  }

  // Extract JSON object embedded in assistant text
  private parseJsonFromText(text: string): any {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse AI response');
    try {
      return JSON.parse(match[0]);
    } catch (err) {
      throw new Error('Invalid JSON from AI');
    }
  }
  
  // Categorize multiple emails (batch)
  async categorizeEmailsBatch(
    emails: Array<{ subject: string; body: string; from: string }>
  ): Promise<
    Array<{
      id: number;
      category: string;
      confidence: number;
      reasoning: string;
    }>
  > {
    try {
      console.log(`Batch categorizing ${emails.length} emails`);

      const results = await Promise.all(
        emails.map(async (email, index) => {
          const result = await this.categorizingEmail(email.subject, email.body, email.from);
          return {
            id: index,
            ...result,
          };
        })
      );

      return results;
    } catch (error) {
      console.error('Error in batch categorization:', error);
      return [];
    }
  }

  /**
   * Validate category name
   */
  validateCategory(category: string): boolean {
    const validCategories = [
      'Interested',
      'Meeting Booked',
      'Not Interested',
      'Spam',
      'Out of Office',
    ];
    return validCategories.includes(category);
  }

  /**
   * Get category stats
   */
  getCategoryStats(): {
    categories: string[];
    description: Record<string, string>;
  } {
    return {
      categories: [
        'Interested',
        'Meeting Booked',
        'Not Interested',
        'Spam',
        'Out of Office',
      ],
      description: {
        Interested:
          'Customer shows genuine interest in the product/service',
        'Meeting Booked':
          'Customer has scheduled or confirmed a meeting',
        'Not Interested':
          'Customer explicitly declined or showed disinterest',
        Spam: 'Irrelevant, promotional, or auto-generated content',
        'Out of Office':
          'Auto-reply or out-of-office response',
      },
    };
  }
}

export default new AiEmailCategorizer();
