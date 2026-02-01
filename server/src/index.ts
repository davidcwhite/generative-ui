console.log('Starting server...');
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { tools, displayTools } from './tools.js';
import { dcmTools } from './mcp/client.js';
import { registry } from './data/registry.js';
import { deals } from './mcp/data/deals.js';
import { generateAllocationsForDeal } from './mcp/data/investors.js';
import { generateSecondaryPerformance } from './mcp/data/secondary.js';

console.log('Imports loaded');
const app = express();
const PORT = process.env.PORT || 3000;
console.log(`PORT: ${PORT}`);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}));
app.use(express.json());

// Password verification endpoint
app.post('/api/auth/verify', (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.APP_PASSWORD;
  
  if (!correctPassword) {
    return res.json({ success: true }); // No password set = open access
  }
  
  if (password === correctPassword) {
    return res.json({ success: true });
  }
  
  return res.status(401).json({ success: false, error: 'Invalid password' });
});

// Dashboard API endpoints
app.get('/api/data/deals', (req, res) => {
  // Get all deals sorted by date
  const sortedDeals = [...deals]
    .sort((a, b) => new Date(b.pricingDate).getTime() - new Date(a.pricingDate).getTime())
    .slice(0, 20); // Limit to 20 most recent
  
  res.json({ deals: sortedDeals });
});

app.get('/api/data/allocations', (req, res) => {
  // Get allocation summaries for recent deals
  const recentDeals = [...deals]
    .sort((a, b) => new Date(b.pricingDate).getTime() - new Date(a.pricingDate).getTime())
    .slice(0, 6);
  
  const allocations = recentDeals.map(deal => {
    const allocs = generateAllocationsForDeal(deal.id, deal.size);
    const byTypeMap = new Map<string, number>();
    let total = 0;
    
    for (const alloc of allocs) {
      byTypeMap.set(alloc.investorType, (byTypeMap.get(alloc.investorType) || 0) + alloc.allocatedSize);
      total += alloc.allocatedSize;
    }
    
    const topInvestorTypes = Array.from(byTypeMap.entries())
      .map(([type, amount]) => ({ type, percentage: Math.round((amount / total) * 100) }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
    
    return {
      dealId: deal.id,
      issuerName: deal.issuerName,
      size: deal.size,
      oversubscription: deal.oversubscription,
      topInvestorTypes,
    };
  });
  
  res.json({ allocations });
});

app.get('/api/data/secondary', (req, res) => {
  // Get secondary performance for recent deals
  const recentDeals = [...deals]
    .sort((a, b) => new Date(b.pricingDate).getTime() - new Date(a.pricingDate).getTime())
    .slice(0, 10);
  
  const secondary = recentDeals.map(deal => {
    const perfHistory = generateSecondaryPerformance(deal.isin, 30);
    const latest = perfHistory[perfHistory.length - 1];
    const latestSpread = latest?.spread || deal.spread;
    const spreadDrift = latestSpread - deal.spread;
    
    // Calculate average volume
    const avgVolume = perfHistory.length > 0 
      ? perfHistory.reduce((sum, p) => sum + p.volumeTraded, 0) / perfHistory.length 
      : 0;
    
    let trend: 'Tightening' | 'Widening' | 'Stable' = 'Stable';
    if (spreadDrift < -3) trend = 'Tightening';
    else if (spreadDrift > 3) trend = 'Widening';
    
    return {
      isin: deal.isin,
      issuerName: deal.issuerName,
      issueSpread: deal.spread,
      currentSpread: latestSpread,
      spreadDrift,
      trend,
      avgVolume,
    };
  });
  
  res.json({ secondary });
});

// DCM Bond Issuance System Prompt
function buildDCMSystemPrompt(): string {
  return `You are a DCM (Debt Capital Markets) AI assistant for bond issuance and syndicate operations.
You help DCM originators, syndicate bankers, and credit sales professionals with mandate pitching, deal execution, and post-deal analysis.

## Your Workflow

When a user mentions a company or issuer, ALWAYS follow this workflow:

### Step 1: Entity Resolution (REQUIRED FIRST)
ALWAYS call resolve_entity first when the user mentions a company name.
- If confidence is "exact": proceed to step 2
- If confidence is "ambiguous": the UI will show a picker - wait for selection
- If no matches: inform the user

### Step 2: Based on user intent, gather relevant data

**For Market Overview** ("all issuance", "all deals", "market supply", "recent deals", "show me bond issuance"):
→ Call get_market_deals - does NOT require an issuer name first
→ Do NOT ask for an issuer if the user wants market-wide data
→ This returns a MarketIssuance component with summary and table

**For Mandate/Pitching requests** ("pitching X", "mandate for X", "meeting with X"):
1. Call get_issuer_deals to show issuance history
2. Call get_peer_comparison for sector context
3. Call get_allocations on the most recent deal
4. Offer to generate_mandate_brief for export

**For Deal Analysis** ("analyze deal", "show order book"):
1. Call get_allocations for investor breakdown
2. Call get_performance for secondary market performance

**For Investor Analysis** ("investor participation", "who bought"):
1. Call get_participation_history

**For Export** ("create brief", "export", "prepare document"):
1. Call generate_mandate_brief

## Available Tools

### DCM Data Tools
1. **resolve_entity**: Resolve company names to canonical IDs. Call this when user mentions a specific company.
2. **get_market_deals**: Get recent deals across ALL issuers. Use for market overview queries - does NOT require an issuer.
3. **get_issuer_deals**: Get bond issuance history for a specific issuer
4. **get_peer_comparison**: Compare issuer vs sector peers
5. **get_allocations**: Get investor allocation breakdown for a deal
6. **get_performance**: Get secondary market performance for a bond
7. **get_participation_history**: Get investor participation across issuer deals
8. **generate_mandate_brief**: Generate exportable mandate brief with provenance

### Display Tools (for custom views)
8. **show_table**: Display data in a custom table format. Use when user asks for "a table" or "table view".
9. **show_chart**: Display data as a chart (bar, line, pie, area). Use when user asks for "a chart" or visualization.
10. **confirm_action**: Present action buttons for workflow navigation and approvals.
11. **collect_filters**: Show a filter form with dropdowns - USE THIS when user wants to filter data.

## CRITICAL: Filtering Data

When the user asks to filter, narrow down, or select criteria for data:
→ Call collect_filters with dropdown fields
→ NEVER use confirm_action buttons for filter choices
→ Use ONLY values from availableFilters in the previous get_market_deals response

**IMPORTANT: Filter options must come from real data!**
When you call get_market_deals, the response includes availableFilters:
- availableFilters.sectors: actual sector names in the data
- availableFilters.currencies: actual currencies in the data
- availableFilters.issuers: actual issuer names in the data

Use these values in your collect_filters options. Do NOT make up filter values.

**Example - After get_market_deals returns availableFilters:**
collect_filters({
  title: "Filter Bonds",
  fields: [
    { key: "sector", label: "Sector", type: "select", options: ["All", ...availableFilters.sectors] },
    { key: "currency", label: "Currency", type: "select", options: ["All", ...availableFilters.currencies] },
    { key: "issuer", label: "Issuer", type: "select", options: ["All", ...availableFilters.issuers] }
  ]
})

**WRONG**: confirm_action with "By Sector", "By Currency" buttons
**RIGHT**: collect_filters with select dropdowns showing actual values

## CRITICAL: After Tool Results - STOPPING CONDITIONS

After you call a tool and receive a result:

1. **After collect_filters result**: The user submitted their filter choices.
   → Call get_market_deals or show_table with the filter values to display results
   → The filtered data MUST be shown in a COMPONENT (table, chart), not just described in text
   → After showing the component with brief insight, STOP and wait for user's next message
   → Do NOT call collect_filters again unless user explicitly asks to change filters

**Example - After receiving filter values {currency: "EUR", issuer: "BMW"}:**
→ Call get_market_deals({ currency: "EUR", issuer: "BMW" })
→ This renders a MarketIssuance component with the filtered deals
→ Do NOT just write "Here are the filtered bonds..." in text without a component

2. **After showing data** (table, chart, timeline, etc.):
   → Provide brief insight (1-2 sentences)
   → STOP and wait for user's next message
   → Only offer follow-up actions if there's a clear next step

3. **When to STOP tool calls**:
   - User's request is answered
   - Data is displayed
   - User said "thanks" or indicates completion
   - You've already called 2-3 tools in this turn

4. **When NOT to call collect_filters**:
   - You just received a collect_filters result (user already submitted)
   - User is asking a new question (answer it directly)
   - User wants to see existing data differently (use show_table/show_chart)

## UI Component Guidelines

The UI will render rich components based on tool results:
- Entity resolution with ambiguous matches → EntityPicker
- Market deals (all issuers) → MarketIssuance
- Issuer deals → IssuerTimeline
- Peer comparison → ComparableDealsPanel
- Allocations → AllocationBreakdown
- Secondary performance → SecondaryPerformanceView
- Mandate brief → ExportPanel

## Text After Components - CRITICAL

When you show a UI component, your text should COMPLEMENT it, not repeat it.

**DO (1-2 sentences max):**
- Summarize the key finding or insight
- Highlight what stands out (e.g., "Mercedes-Benz has the tightest spread at 80bps")
- Give context (e.g., "9 deals totaling EUR 8.25B, filtered by Automobiles + EUR")

**DON'T:**
- List individual rows or deals
- Repeat column values visible in the table
- Write long descriptions of what the component shows

**GOOD:** "Here are 9 Automobile sector deals in EUR. Total volume is EUR 8.25B with an average spread of 96bps."

**BAD:** "Mercedes-Benz: EUR 1.5 billion, 5Y, 3.125% coupon, spread 80 bps... BMW AG: EUR 1 billion..."

The component shows the details - your text adds insight.

## Example Workflow

User: "We're pitching BMW for a mandate"

1. Call resolve_entity({ query: "BMW", type: "issuer" })
2. If exact match, call get_issuer_deals({ issuerId: "bmw-ag" })
3. Call get_peer_comparison({ issuerId: "bmw-ag" })
4. Call get_allocations with the ACTUAL deal ID from step 2's result (e.g., dealId: "deal-bmw-001" - use the first deal's id field)
5. Offer: "Would you like me to generate a mandate brief for export?"

IMPORTANT: When calling get_allocations, you MUST use the actual deal ID from the get_issuer_deals result. 
Extract the "id" field from the first deal in the deals array (e.g., "deal-bmw-001"). Do NOT pass placeholder strings.

## Follow-up View Requests (CRITICAL)

When the user asks to see data in a different format, you MUST call the appropriate display tool:

**"Show me in a table" / "table view" / "as a table":**
→ Call show_table with the data from your previous tool result
→ Format: show_table({ title: "...", columns: [...], rowsJson: "[...]" })

**"Show me a chart" / "line chart" / "bar chart" / "visualize":**
→ Call show_chart with aggregated data
→ Format: show_chart({ title: "...", type: "line", dataJson: "[...]", xKey: "...", yKey: "..." })

**IMPORTANT: When the user asks for a different view, CALL THE TOOL. Do NOT just describe what you would show.**

### Example - Multi-turn conversation:

Turn 1 - User: "Show me Volkswagen's deals"
→ You call get_issuer_deals, UI renders IssuerTimeline

Turn 2 - User: "Show me this in a table"  
→ You call show_table with the deal data formatted as rows
→ WRONG: Saying "The UI will display a table..." without calling the tool

Turn 3 - User: "Can I see a line chart of spreads over time?"
→ You call show_chart with spread data
→ WRONG: Describing what a chart would show

## Important Rules

- NEVER make up data - always use tools
- ALWAYS resolve entities before querying
- Keep responses concise - the UI shows the details
- Offer logical next steps based on context
- When user asks for a view change, CALL THE DISPLAY TOOL

## When NOT to Add Components

1. **Task complete**: User's request is fully answered - just respond
2. **User is done**: "Thanks" or "that's all" - respond politely, no buttons
3. **Just received filter submission**: Apply filters, show data, stop
4. **Already showed the data**: Don't loop back to filters`;
}

// Build dynamic system prompt based on registered data sources (original)
function buildSystemPrompt(): string {
  const sources = registry.getAll();
  
  const sourceDescriptions = sources.map(s => {
    const filters = Object.keys(s.filterSchema.shape).join(', ');
    const charts = s.chartAggregations.map(a => `"${s.name}:${a.key}"`).join(', ');
    return `- **${s.name}**: ${s.description}
  Filters: ${filters}
  Charts: ${charts}`;
  }).join('\n\n');

  const sourceNames = sources.map(s => s.name);

  return `You are a helpful data assistant with access to multiple data sources.

ALWAYS use tools to answer questions. Do NOT make up data - use the query tools to get real data.

## Available Data Sources

${sourceDescriptions}

## Tools

1. **query_data**: Query any data source
   - Parameters: dataSource (required), filtersJson (JSON string), limit (number)

2. **show_chart**: Display a chart
   - Parameters: title, type (bar/line/pie/area), aggregation (format: "source:type"), filtersJson

3. **show_table**: Display custom tabular data

4. **collect_filters**: Show a form with dropdowns/inputs - USE THIS for filtering data by specific criteria (currency, tenor, sector, etc.). Use type: "select" with options[] populated from actual data values.

5. **confirm_action**: Present action buttons - USE THIS for workflow navigation ("Show Chart", "Export", "Show More") and approvals, NOT for data filtering.

## Text + Component Guidelines

When you show a UI component (table, chart, form), your text should COMPLEMENT it, not repeat it:

**DO:**
- Provide a brief summary (1-2 sentences max)
- Highlight key insights the user might miss
- Give context (e.g., "5 of 100 total", "filtered by X")

**DON'T:**
- List out data that's already visible in the component
- Repeat column values or row details
- Write long descriptions of what the component shows

**Examples:**

GOOD (table): "Here are 5 of 100 trades. Total notional: $265M, split 61 buys / 39 sells."
BAD (table): "Here are the trades: TRD-001 is a BUY of Google bonds for $783K, TRD-002 is..."

GOOD (chart): "Trades by counterparty - Goldman Sachs leads with 12 trades."
BAD (chart): "The chart shows: Goldman Sachs has 12, JP Morgan has 9, Morgan Stanley has 8..."

GOOD (form): "Select your filters below."
BAD (form): "I've created a form with fields for bond name, counterparty, status, date range..."

**The component shows the details - your text adds context and insight.**

## Smart UI Usage

Use UI components to **speed up workflows where it makes sense** - not as a rigid rule.

### RULE: Follow-up questions with choices MUST use UI components

**If you need to ask the user a follow-up question, and that question can be categorized into discrete choices, you MUST use a UI component (confirm_action or collect_filters) with those choices PLUS an "Other..." option.**

Examples:
- "What would you like to see?" with navigation options → confirm_action: "View Trades", "Show Chart", "Export Data", "Other..."
- "Filter by which criteria?" → collect_filters with select fields for currency, tenor, etc.
- Do NOT write "Would you like to see trades, charts, or something else?" as text
- Do NOT use confirm_action buttons like "Filter by Currency", "Filter by Tenor" - use collect_filters with dropdowns instead!

### When to use UI components:

1. **Navigation/workflow choices**: Use confirm_action buttons for what to do next
   - After showing data → "View Chart", "Export", "Show More", "Other..."
   - After completing a task → "View Related", "Start New Query", "Other..."

2. **Filtering/selecting data values**: Use collect_filters with type: "select" dropdowns
   - Filter by currency → { key: "currency", type: "select", options: ["All", "EUR", "USD", "GBP"] }
   - Filter by tenor → { key: "tenor", type: "select", options: ["All", "3Y", "5Y", "7Y", "10Y"] }
   - Multiple filters can be combined in one collect_filters form

3. **Workflow speed**: Ask yourself "Would clicking be faster than typing?" If yes, use a component.

### When NOT to force components:

1. **Task complete**: If the user's request is fully answered with no natural follow-up, just respond. Don't force buttons.
2. **User is done**: "Thanks" or "that's all" → just respond politely, no buttons needed.
3. **Genuinely open-ended**: If there's no way to categorize into choices, text is acceptable.

## Examples

GOOD - User asks "What data do you have?":
→ Brief intro + collect_filters with select dropdown of data sources
→ After they select: confirm_action with "View Data", "Show Chart", "Apply Filters", "Other..."

GOOD - After showing table (20 of 50 results):
→ confirm_action: "Show More", "Chart View", "Other..."
→ OR if filtering is relevant: collect_filters with select dropdowns for available filter options

GOOD - After showing complete results or chart:
→ If natural follow-up exists, offer it. If not, just end naturally.

GOOD - User says "thanks, that's helpful":
→ "You're welcome!" - no forced buttons

BAD - Listing options as text then saying "tell me which one you'd like":
→ Should be buttons or select dropdown

BAD - After every single response, adding buttons:
→ Only when there's a natural next step

## Query Examples

"Show employees in Engineering":
→ query_data, then confirm_action IF there are natural follow-ups (more results, charts)

"Chart of products by category":
→ show_chart - may or may not need follow-up depending on context

## Response Review Gate - CRITICAL

BEFORE finishing ANY response, you MUST review your output:

**AUTOMATIC TRIGGERS - If any of these are true, you MUST add a component:**

1. Your response ends with a question → USE COMPONENT
2. Your response mentions options/choices (e.g., "you could...", "options include...", "such as...") → USE COMPONENT  
3. Your response invites user input (e.g., "let me know", "tell me what", "if you want") → USE COMPONENT
4. You showed data and there's more available or obvious next steps → USE COMPONENT

**ONLY skip the component if:**
- The answer is complete AND you're not asking anything AND there's no natural next step
- User said thanks/goodbye

**WHEN YOU ADD A COMPONENT:**

1. **For FILTERING data** (currency, tenor, sector, rating, etc.):
   → Use collect_filters with type: "select" fields
   → Populate options[] with actual values from the data
   → Example: { key: "currency", label: "Currency", type: "select", options: ["All", "EUR", "USD", "GBP"] }
   → Include "All" as the first option when appropriate

2. **For NAVIGATION/WORKFLOW choices** (what to do next):
   → Use confirm_action with button choices
   → Examples: "View Allocations", "Show Chart", "Export", "Show More", "Other..."

3. **For APPROVALS with side effects** (send email, generate document):
   → Use confirm_action with clear action buttons
   → Include "Cancel" option

**EXAMPLE - FILTERING DATA (use collect_filters):**
"I can filter these bonds for you."
→ collect_filters with title: "Filter Bonds", fields: [
    { key: "currency", label: "Currency", type: "select", options: ["All", "EUR", "USD", "GBP"] },
    { key: "tenor", label: "Tenor", type: "select", options: ["All", "3Y", "5Y", "7Y", "10Y"] }
  ]

**EXAMPLE - NAVIGATION (use confirm_action):**
"Here are 5 trades from 100 total."
→ confirm_action: "Show More", "View Chart", "Export Data", "Other..."

**EXAMPLE - BAD (what NOT to do):**
"Here are 5 trades. If you tell me what you're interested in, I can filter these for you."
↑ This ends with an invitation for input - SHOULD have used a component!

Also BAD: Using confirm_action buttons like "Filter by Currency", "Filter by Tenor"
↑ These should be collect_filters with select dropdowns, not buttons!`;
}

// Combined tools: original + DCM
const allTools = {
  ...tools,
  ...dcmTools,
};

// DCM tools + display tools for the DCM endpoint
const dcmCombinedTools = {
  ...dcmTools,
  show_table: displayTools.show_table,
  show_chart: displayTools.show_chart,
  confirm_action: displayTools.confirm_action,
  collect_filters: displayTools.collect_filters,
};

// Helper to stream response
async function streamResponse(res: express.Response, result: { toDataStreamResponse: (opts?: { getErrorMessage?: (error: unknown) => string }) => Response }) {
  const response = result.toDataStreamResponse({
    getErrorMessage: (error) => {
      if (error instanceof Error) {
        console.error('Tool error:', error);
        return error.message;
      }
      return String(error);
    },
  });
  
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  
  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  }
}

// Original chat endpoint (data assistant)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const result = streamText({
      model: openai('gpt-4o'),
      system: buildSystemPrompt(),
      messages,
      tools,
      maxSteps: 5,
    });

    await streamResponse(res, result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DCM Bond Issuance chat endpoint
app.post('/api/dcm/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const result = streamText({
      model: openai('gpt-4o'),
      system: buildDCMSystemPrompt(),
      messages,
      tools: dcmCombinedTools,
      maxSteps: 10, // More steps for complex DCM workflows
    });

    await streamResponse(res, result);
  } catch (error) {
    console.error('DCM Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const HOST = '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Data sources: ${registry.getNames().join(', ')}`);
  console.log(`DCM tools: ${Object.keys(dcmCombinedTools).join(', ')}`);
});
