# Sales Prospecting Agent

This agent automates sales prospecting by finding potential leads, enriching contact data, and managing outreach campaigns.

## Implementation

```typescript
import { BaseAgent } from '@squad/agents';
import { ComposioToolSet, Action, App } from 'composio-langchain';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { SupabaseVectorStore } from '@squad/integrations';

interface ProspectProfile {
  name: string;
  title: string;
  company: string;
  email?: string;
  linkedin?: string;
  industry: string;
  interests?: string[];
  recentActivity?: string[];
}

interface OutreachTemplate {
  id: string;
  name: string;
  content: string;
  useCase: string;
  personalizationPoints: string[];
}

export class ProspectingAgent extends BaseAgent {
  private tools: ComposioToolSet;
  private model: ChatOpenAI;
  private vectorStore: SupabaseVectorStore;
  private outreachTemplates: OutreachTemplate[];

  constructor(config: AgentConfig) {
    super(config);
    
    this.model = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.7
    });

    this.tools = new ComposioToolSet({
      api_key: process.env.COMPOSIO_API_KEY,
      apps: [
        App.LINKEDIN,
        App.CLEARBIT,
        App.SALESFORCE,
        App.GMAIL,
        App.APOLLO
      ]
    });

    this.vectorStore = new SupabaseVectorStore({
      tableName: 'prospect_embeddings',
      queryName: 'match_prospects'
    });
  }

  async findProspects(criteria: {
    industry: string;
    companySize: string;
    location: string;
    jobTitles: string[];
  }): Promise<ProspectProfile[]> {
    // Search LinkedIn for matching profiles
    const linkedinProfiles = await this.tools.execute(
      Action.LINKEDIN_SEARCH_PEOPLE,
      {
        keywords: criteria.jobTitles.join(' OR '),
        industry: criteria.industry,
        location: criteria.location
      }
    );

    // Enrich profiles with additional data
    const enrichedProfiles = await Promise.all(
      linkedinProfiles.map(async profile => {
        // Get company details
        const companyData = await this.tools.execute(
          Action.CLEARBIT_ENRICH_COMPANY,
          { domain: profile.company_domain }
        );

        // Get person details
        const personData = await this.tools.execute(
          Action.APOLLO_ENRICH_PERSON,
          { 
            name: profile.name,
            company: profile.company
          }
        );

        return {
          ...profile,
          ...personData,
          company_details: companyData
        };
      })
    );

    // Score and filter prospects
    const qualifiedProspects = await this.scoreProspects(enrichedProfiles);

    return qualifiedProspects;
  }

  private async scoreProspects(
    profiles: any[]
  ): Promise<ProspectProfile[]> {
    const scoredProspects = await Promise.all(
      profiles.map(async profile => {
        // Get prospect's recent activity
        const activities = await this.tools.execute(
          Action.LINKEDIN_GET_ACTIVITY,
          { profileId: profile.linkedin_id }
        );

        // Score based on activity and engagement
        const score = await this.model.predict(
          `Score this prospect's fit based on:
          1. Job title relevance
          2. Company fit
          3. Recent activity
          4. Engagement signals

          Profile: ${JSON.stringify(profile)}
          Activities: ${JSON.stringify(activities)}

          Return a score between 0 and 1.`
        );

        return {
          ...profile,
          score: parseFloat(score),
          activities
        };
      })
    );

    // Filter and sort by score
    return scoredProspects
      .filter(p => p.score >= 0.7)
      .sort((a, b) => b.score - a.score);
  }

  async createOutreachCampaign(
    prospects: ProspectProfile[]
  ): Promise<void> {
    // Group prospects by persona/use case
    const groupedProspects = this.groupProspectsByPersona(prospects);

    for (const [persona, personaProspects] of Object.entries(groupedProspects)) {
      // Get matching template
      const template = await this.findBestTemplate(persona);

      // Create personalized messages
      const messages = await Promise.all(
        personaProspects.map(async prospect => {
          const personalizedContent = await this.personalizeMessage(
            template,
            prospect
          );

          return {
            prospect,
            content: personalizedContent
          };
        })
      );

      // Create Salesforce campaign
      const campaign = await this.tools.execute(
        Action.SALESFORCE_CREATE_CAMPAIGN,
        {
          name: `${persona} Outreach - ${new Date().toISOString()}`,
          type: 'Email',
          status: 'Planned'
        }
      );

      // Add prospects to campaign
      await Promise.all(
        messages.map(async message => {
          // Create/update Salesforce lead
          const lead = await this.tools.execute(
            Action.SALESFORCE_UPSERT_LEAD,
            {
              email: message.prospect.email,
              firstName: message.prospect.name.split(' ')[0],
              lastName: message.prospect.name.split(' ').slice(1).join(' '),
              company: message.prospect.company,
              title: message.prospect.title
            }
          );

          // Create campaign member
          await this.tools.execute(
            Action.SALESFORCE_CREATE_CAMPAIGN_MEMBER,
            {
              campaignId: campaign.id,
              leadId: lead.id,
              status: 'Planned'
            }
          );

          // Schedule email
          await this.tools.execute(
            Action.GMAIL_SCHEDULE_EMAIL,
            {
              to: message.prospect.email,
              subject: template.subject,
              body: message.content,
              sendAt: this.calculateSendTime(message.prospect)
            }
          );
        })
      );
    }
  }

  private async personalizeMessage(
    template: OutreachTemplate,
    prospect: ProspectProfile
  ): Promise<string> {
    // Get relevant context for personalization
    const recentPosts = await this.tools.execute(
      Action.LINKEDIN_GET_POSTS,
      { profileId: prospect.linkedin_id, limit: 5 }
    );

    const companyNews = await this.tools.execute(
      Action.CLEARBIT_GET_COMPANY_NEWS,
      { domain: prospect.company_domain }
    );

    // Generate personalized message
    const personalizedMessage = await this.model.predict(
      `Personalize this outreach template:
      ${template.content}

      For this prospect:
      ${JSON.stringify(prospect)}

      Using these personalization points:
      ${template.personalizationPoints.join('\n')}

      Recent activities:
      ${JSON.stringify(recentPosts)}

      Company news:
      ${JSON.stringify(companyNews)}

      Create a highly personalized message that references specific details.`
    );

    return personalizedMessage;
  }

  private groupProspectsByPersona(
    prospects: ProspectProfile[]
  ): Record<string, ProspectProfile[]> {
    // Group prospects by similar characteristics
    const groups: Record<string, ProspectProfile[]> = {};

    prospects.forEach(prospect => {
      const persona = this.determinePersona(prospect);
      if (!groups[persona]) {
        groups[persona] = [];
      }
      groups[persona].push(prospect);
    });

    return groups;
  }

  private async findBestTemplate(
    persona: string
  ): Promise<OutreachTemplate> {
    // Find similar successful templates
    const similarTemplates = await this.vectorStore.similaritySearch(
      persona,
      5
    );

    // Get performance metrics for templates
    const templatePerformance = await Promise.all(
      similarTemplates.map(async template => {
        const metrics = await this.tools.execute(
          Action.SALESFORCE_GET_TEMPLATE_METRICS,
          { templateId: template.metadata.templateId }
        );

        return {
          template,
          metrics
        };
      })
    );

    // Select best performing template
    return templatePerformance
      .sort((a, b) => b.metrics.responseRate - a.metrics.responseRate)[0]
      .template;
  }

  private calculateSendTime(prospect: ProspectProfile): Date {
    // Implement send time optimization logic
    // Consider:
    // - Prospect's timezone
    // - Historical engagement patterns
    // - A/B test results
    return new Date(); // Placeholder
  }
}

// Example usage in Supabase Edge Function
serve(async (req) => {
  const agent = new ProspectingAgent({
    id: 'sales-prospector',
    name: 'Sales Prospecting Assistant',
    description: 'Automates sales prospecting and outreach'
  });

  const { criteria } = await req.json();
  
  // Find prospects
  const prospects = await agent.findProspects(criteria);
  
  // Create outreach campaign
  await agent.createOutreachCampaign(prospects);

  return new Response(
    JSON.stringify({ 
      status: 'success',
      prospectsFound: prospects.length
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## Configuration

```typescript
// config/prospecting-config.ts
export const prospectingConfig = {
  target_personas: [
    {
      name: 'Tech Decision Maker',
      titles: ['CTO', 'VP of Engineering', 'Technical Director'],
      companySize: '50-1000',
      industries: ['Software', 'SaaS', 'Technology']
    },
    {
      name: 'Sales Leader',
      titles: ['VP of Sales', 'Sales Director', 'Revenue Leader'],
      companySize: '20-500',
      industries: ['B2B', 'Professional Services']
    }
  ],
  outreach_rules: {
    max_attempts: 3,
    min_interval_days: 5,
    optimal_times: {
      'US/Pacific': '9:00-11:00',
      'US/Eastern': '10:00-12:00'
    }
  },
  scoring_weights: {
    title_match: 0.3,
    company_fit: 0.3,
    engagement_signals: 0.2,
    recent_activity: 0.2
  }
};
```

## Monitoring

```typescript
interface ProspectingMetrics {
  prospects_found: number;
  qualified_prospects: number;
  campaigns_created: number;
  emails_sent: number;
  response_rate: number;
  meetings_booked: number;
  conversion_rate: number;
}

// Add to agent class
class ProspectingAgent {
  private metrics: ProspectingMetrics;

  async collectMetrics(): Promise<void> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get campaign metrics
    const campaignMetrics = await this.tools.execute(
      Action.SALESFORCE_GET_CAMPAIGN_METRICS,
      {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    );

    // Update metrics
    this.metrics = {
      prospects_found: campaignMetrics.totalProspects,
      qualified_prospects: campaignMetrics.qualifiedProspects,
      campaigns_created: campaignMetrics.campaigns,
      emails_sent: campaignMetrics.emailsSent,
      response_rate: campaignMetrics.responseRate,
      meetings_booked: campaignMetrics.meetingsBooked,
      conversion_rate: campaignMetrics.conversionRate
    };

    // Store metrics
    await this.storeMetrics(this.metrics);
  }
}
```

## Best Practices

1. **Prospect Research:**
   - Use multiple data sources
   - Validate contact information
   - Monitor engagement signals
   - Regular data enrichment

2. **Personalization:**
   - Reference recent activities
   - Include company-specific insights
   - Maintain natural language
   - Test different approaches

3. **Campaign Management:**
   - Optimal sending times
   - Follow-up sequences
   - A/B testing
   - Response tracking

4. **Data Management:**
   - Regular data cleaning
   - Duplicate prevention
   - Update frequency
   - Data privacy compliance

5. **Performance:**
   - Batch operations
   - Cache prospect data
   - Rate limit API calls
   - Regular maintenance