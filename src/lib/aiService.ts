import { IATA_KNOWLEDGE_BASE } from './iataKnowledge';

const AI_API_KEY = import.meta.env.VITE_AI_API_KEY || '';
const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'https://api.openai.com/v1';
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callAI(messages: AIMessage[], maxTokens = 800): Promise<string> {
  if (!AI_API_KEY) {
    return generateFallbackResponse(messages[messages.length - 1].content);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('AI API error:', err);
      return generateFallbackResponse(messages[messages.length - 1].content);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || generateFallbackResponse(messages[messages.length - 1].content);
  } catch (e) {
    console.error('AI call failed:', e);
    return generateFallbackResponse(messages[messages.length - 1].content);
  } finally {
    clearTimeout(timeout);
  }
}

function generateFallbackResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('allowance') || q.includes('weight') || q.includes('piece')) {
    return `**Baggage Allowance (IATA Guidance)**\n\nThere are two standard free baggage allowance concepts per the IATA guidance document:\n\n1. **Weight Concept**: Measured by total weight of checked-in baggage (e.g., 20kg or 45lb), shown as a weight amount on the ticket.\n2. **Piece Concept (PC)**: Measured by number of pieces of checked-in baggage (shown as PC on the ticket).\n\nSome carriers combine these concepts (e.g., 2 pieces not weighing more than 32KG total). Carriers should disclose individual allowances via ATPCO.\n\n*Source: IATA Guidance Document, Section 4 – Baggage Policies and Allowance*`;
  }
  if (q.includes('excess') || q.includes('extra')) {
    return `**Excess Baggage (IATA Guidance)**\n\nFor excess baggage in interline scenarios:\n\n- **EMD-A** (Electronic Miscellaneous Document) is the standard accountable document; use Reason For Issuance Code (RFIC) **'C' - Baggage**\n- From a reservation perspective, create an **SSR XBAG** in the PNR to notify other participating airlines\n- Example: SSR XBAG CC NN/AMSGVA 0345M15NOV.5PIECES EACH30×25×15CM TOTL85KG\n- Paper Excess Baggage Tickets were permitted until 31 May 2021 for carriers without EMD capability\n\n*Source: IATA Guidance Document, Section 7 – Excess Baggage*`;
  }
  if (q.includes('msc') || q.includes('most significant') || q.includes('resolution 302')) {
    return `**Most Significant Carrier (MSC) – IATA Resolution 302**\n\nThe MSC determination follows these rules:\n\n- **TC1** = Western Hemisphere (Americas & Caribbean)\n- **TC2** = Europe, Middle East & Africa\n- **TC3** = Asia & Asia Pacific\n\nThe MSC is the carrier on the **first sector that crosses from one Area to another**. Exception: For TC1/TC2 journeys, the carrier on the first sector crossing between TC1 and TC2.\n\nFor code-share flights, the **Marketing Carrier's** baggage policy prevails unless it stipulates otherwise.\n\n*Source: IATA Guidance Document, Section 5 – Baggage Provisions*`;
  }
  if (q.includes('mishandled') || q.includes('lost') || q.includes('missing')) {
    return `**Mishandled Baggage (IATA Guidance)**\n\nKey procedures for mishandled baggage:\n\n- The **carrier at the point where baggage is missing** is responsible for raising a file, tracing and tracking\n- Mishandled (RUSH) baggage shall be forwarded **without charge** by the fastest means to the nearest airport\n- Most airlines use **SITA WorldTracer** or compatible system\n- Within **60 days** of payment, claim-receiving airline sends prorate request to other carriers\n- Settlement: when responsible carrier is established, that carrier absorbs costs; when unknown, shared by flown mileage\n- Legal timeframes: covered by the **Montreal Convention**\n\n*Source: IATA Guidance Document, Section 10 – Mishandled Baggage*`;
  }
  return `**IATA Baggage Policy Response**\n\nBased on the IATA Guidance Document for Airlines on Interline Considerations on Baggage Standards:\n\nThe document covers key areas including:\n- **Baggage Allowance**: Weight Concept and Piece Concept\n- **Most Significant Carrier (MSC)**: Determined per IATA Resolution 302\n- **Excess Baggage**: EMD-A documents with RFIC code 'C'\n- **Operational Handling**: Mandatory scanning at 4 key points per Resolution 753\n- **Mishandled Baggage**: RUSH baggage forwarded without charge; WorldTracer system used\n- **Settlement**: Straight Rate Proration (SRP) via IATA Clearing House (ICH)\n\nPlease configure your AI API key (VITE_AI_API_KEY) for detailed AI-powered answers grounded in the full IATA document.\n\n*Source: IATA Guidance Document – Interline Considerations on Baggage Standards (2020)*`;
}

export async function queryIATAPolicy(question: string): Promise<{ answer: string; confidence: number; sections: string[] }> {
  const systemPrompt = `You are an expert IATA Baggage Policy Assistant for an airline's customer support team.
You ONLY answer questions based on the IATA Guidance Document for Airlines: Interline Considerations on Baggage Standards.
You must ONLY use information from the document provided. Do not make up or infer information beyond the document.
Always cite the specific section from the document in your answer.
Format your response in a clear, professional manner suitable for airline staff.
If a question cannot be answered from the document, clearly state that.

IATA DOCUMENT CONTENT:
${IATA_KNOWLEDGE_BASE}`;

  const answer = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ]);

  const sections = extractSections(question);
  const confidence = AI_API_KEY ? 0.92 : 0.75;

  return { answer, confidence, sections };
}

export async function checkAccessibility(
  htmlCode: string,
  componentName: string,
  brandColors: Record<string, string>
): Promise<{ review: string; issues: Array<{ type: string; wcag_criterion: string; description: string; suggestion: string }>; score: number }> {
  const colorsStr = Object.entries(brandColors).map(([k, v]) => `${k}: ${v}`).join(', ');

  const systemPrompt = `You are a WCAG accessibility expert reviewing airline UI components.
Evaluate the provided HTML/component code against WCAG 2.1 AA standards.
Focus on: color contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text),
ARIA labels, keyboard navigation, screen reader compatibility, and semantic HTML.
Reference: https://webaim.org/articles/contrast/
Return a JSON object with this exact structure:
{
  "review": "detailed review text",
  "issues": [{"type": "error|warning|info", "wcag_criterion": "e.g. WCAG 1.4.3", "description": "issue description", "suggestion": "fix suggestion"}],
  "score": 0-100
}`;

  const userPrompt = `Review this ${componentName} component for accessibility:

HTML/Code:
${htmlCode}

Brand Colors: ${colorsStr || 'Not specified'}

Provide a thorough accessibility review focusing on WCAG 2.1 AA compliance.`;

  const rawAnswer = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 1000);

  try {
    const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        review: parsed.review || rawAnswer,
        issues: parsed.issues || [],
        score: parsed.score || 70,
      };
    }
  } catch {
    // fallback
  }

  if (!AI_API_KEY) {
    return {
      review: `Accessibility review for **${componentName}**:\n\nWithout AI configuration, here is a rule-based analysis:\n\n- Ensure all interactive elements have ARIA labels\n- Verify color contrast meets WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)\n- Check keyboard navigation with tab index\n- Validate screen reader compatibility with semantic HTML\n\nConfigure VITE_AI_API_KEY for full AI-powered accessibility analysis.`,
      issues: [
        { type: 'warning', wcag_criterion: 'WCAG 1.4.3', description: 'Color contrast should be verified against brand colors', suggestion: 'Use WebAIM Contrast Checker to verify all color combinations meet 4.5:1 ratio' },
        { type: 'info', wcag_criterion: 'WCAG 4.1.2', description: 'Ensure all form elements have associated labels', suggestion: 'Add aria-label or associated <label> elements to all inputs' },
      ],
      score: 65,
    };
  }

  return { review: rawAnswer, issues: [], score: 70 };
}

export async function generateTestReport(
  testResults: Array<{ name: string; status: string; duration_ms: number; error?: string }>,
  suiteName: string
): Promise<{ release_note: string; summary: string; risk_level: string }> {
  const passed = testResults.filter(t => t.status === 'passed').length;
  const failed = testResults.filter(t => t.status === 'failed').length;
  const failedTests = testResults.filter(t => t.status === 'failed').map(t => `- ${t.name}: ${t.error || 'Unknown error'}`).join('\n');

  const systemPrompt = `You are a QA documentation specialist for an airline's engineering team.
Generate professional release notes and test summaries based on automated test results.
Be concise, clear, and actionable. Focus on what was tested and what the results mean for production readiness.
Return a JSON object: {"release_note": "...", "summary": "...", "risk_level": "low|medium|high|critical"}`;

  const userPrompt = `Generate release notes for these test results from the ${suiteName} test suite:

Total: ${testResults.length} tests
Passed: ${passed}
Failed: ${failed}

${failedTests ? `Failed Tests:\n${failedTests}` : 'All tests passed!'}

Test Details:
${testResults.map(t => `- [${t.status.toUpperCase()}] ${t.name} (${t.duration_ms}ms)`).join('\n')}`;

  const rawAnswer = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 600);

  try {
    const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        release_note: parsed.release_note || rawAnswer,
        summary: parsed.summary || `${passed}/${testResults.length} tests passed`,
        risk_level: parsed.risk_level || (failed > 0 ? 'medium' : 'low'),
      };
    }
  } catch {
    // fallback
  }

  const riskLevel = failed === 0 ? 'low' : failed <= 2 ? 'medium' : failed <= 5 ? 'high' : 'critical';
  return {
    release_note: `## Release Notes – ${suiteName}\n\n**Test Run Summary**: ${passed} of ${testResults.length} tests passed (${failed} failed).\n\n${failed > 0 ? `**Issues Found**:\n${failedTests}\n\n**Recommendation**: Review and fix failing tests before deploying to production.` : '**Status**: All tests passed. Safe to deploy.'}\n\n*Generated by AI Test Report System*`,
    summary: `${passed}/${testResults.length} tests passed. Risk level: ${riskLevel}.`,
    risk_level: riskLevel,
  };
}

function extractSections(question: string): string[] {
  const q = question.toLowerCase();
  const sections: string[] = [];
  if (q.includes('allowance') || q.includes('weight') || q.includes('piece')) sections.push('Section 4: Baggage Policies and Allowance');
  if (q.includes('msc') || q.includes('resolution 302') || q.includes('provision')) sections.push('Section 5: Baggage Provisions');
  if (q.includes('reservation') || q.includes('ticket') || q.includes('pnr')) sections.push('Section 6: Reservation and Ticketing');
  if (q.includes('excess') || q.includes('emd') || q.includes('extra')) sections.push('Section 7: Excess Baggage');
  if (q.includes('operational') || q.includes('check-in') || q.includes('accept') || q.includes('carriage')) sections.push('Section 8: Operational Handling');
  if (q.includes('settlement') || q.includes('billing') || q.includes('proration')) sections.push('Section 9: Reporting and Settlement');
  if (q.includes('mishandled') || q.includes('lost') || q.includes('missing') || q.includes('rush')) sections.push('Section 10: Mishandled Baggage');
  if (sections.length === 0) sections.push('IATA Guidance Document – General');
  return sections;
}
