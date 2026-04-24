import type {
  ConsistencyReport,
  CascadeData,
  SummaryData,
  Impact,
} from "../types/index";

// ============================================================
// Mock Scenario: "US imposes 25% tariff on imported coffee"
// ============================================================

// --- Consistency Report ---

export const mockConsistencyReport: ConsistencyReport = {
  unknown_percentage: 12,
  no_sources_found: false,
  facts: [
    {
      id: "fact-1",
      statement:
        "The US has imposed a 25% tariff on all imported coffee beans effective Q3 2025.",
      status: "consistent",
      agreement_percentage: 100,
      supporting_sources: ["NYT", "Reuters", "Bloomberg"],
      contradicting_sources: [],
    },
    {
      id: "fact-2",
      statement:
        "Brazil, Colombia, and Vietnam are the top three coffee exporters to the US, accounting for over 70% of imports.",
      status: "consistent",
      agreement_percentage: 92,
      supporting_sources: ["Reuters", "Bloomberg"],
      contradicting_sources: [],
    },
    {
      id: "fact-3",
      statement:
        "Retail coffee prices are expected to rise 15-30% within six months of the tariff taking effect.",
      status: "inconsistent",
      agreement_percentage: 45,
      supporting_sources: ["Bloomberg"],
      contradicting_sources: ["NYT", "Reuters"],
    },
    {
      id: "fact-4",
      statement:
        "Major US coffee chains have announced plans to absorb part of the tariff cost rather than pass it fully to consumers.",
      status: "consistent",
      agreement_percentage: 78,
      supporting_sources: ["NYT", "Bloomberg"],
      contradicting_sources: ["Reuters"],
    },
    {
      id: "fact-5",
      statement:
        "The tariff is expected to reduce US coffee imports by approximately 18% in the first year.",
      status: "unverified",
      agreement_percentage: 33,
      supporting_sources: ["Reuters"],
      contradicting_sources: ["NYT"],
    },
    {
      id: "fact-6",
      statement:
        "Domestic coffee roasters have lobbied against the tariff, citing potential job losses in the processing sector.",
      status: "consistent",
      agreement_percentage: 85,
      supporting_sources: ["NYT", "Reuters", "Bloomberg"],
      contradicting_sources: [],
    },
    {
      id: "fact-7",
      statement:
        "Coffee futures on the ICE exchange surged 12% following the tariff announcement.",
      status: "consistent",
      agreement_percentage: 95,
      supporting_sources: ["Bloomberg", "Reuters"],
      contradicting_sources: [],
    },
    {
      id: "fact-8",
      statement:
        "Several Latin American nations have threatened retaliatory trade measures targeting US agricultural exports.",
      status: "inconsistent",
      agreement_percentage: 40,
      supporting_sources: ["NYT"],
      contradicting_sources: ["Reuters", "Bloomberg"],
    },
    {
      id: "fact-9",
      statement:
        "The tariff exempts specialty single-origin coffees priced above $50/lb.",
      status: "unverified",
      agreement_percentage: 20,
      supporting_sources: [],
      contradicting_sources: ["Bloomberg"],
    },
    {
      id: "fact-10",
      statement:
        "US coffee consumption has been growing at 3% annually and is unlikely to decline significantly despite price increases.",
      status: "consistent",
      agreement_percentage: 72,
      supporting_sources: ["NYT", "Bloomberg"],
      contradicting_sources: [],
    },
  ],
};

// --- Helper to build Impact trees ---

function impact(overrides: Partial<Impact> & Pick<Impact, "id" | "title" | "description" | "type" | "severity">): Impact {
  return {
    is_hidden_factor: false,
    hidden_factor_category: null,
    confidence: 0.8,
    causal_chain: [],
    originating_facts: [],
    children: [],
    ...overrides,
  };
}

// --- Cascade Data ---

export const mockCascadeData: CascadeData = {
  sectors: [
    // ---- Agriculture (>5 impacts to satisfy edge case) ----
    {
      name: "Agriculture",
      icon: "🌾",
      impacts: [
        impact({
          id: "ag-1",
          title: "Coffee bean import costs surge",
          description: "Direct 25% cost increase on all imported green coffee beans entering the US market.",
          type: "direct",
          severity: 9,
          confidence: 0.95,
          causal_chain: ["US imposes 25% tariff", "Import costs rise 25%"],
          originating_facts: ["fact-1"],
          children: [
            impact({
              id: "ag-1-1",
              title: "Domestic roaster margin squeeze",
              description: "US-based coffee roasters face compressed margins as input costs rise faster than retail price adjustments.",
              type: "indirect",
              severity: 7,
              confidence: 0.85,
              causal_chain: ["Tariff raises bean costs", "Roasters absorb partial cost", "Margins compress 10-15%"],
              originating_facts: ["fact-1", "fact-4"],
              children: [
                impact({
                  id: "ag-1-1-1",
                  title: "Small roaster closures",
                  description: "Independent and craft coffee roasters with thin margins face potential closure within 12-18 months.",
                  type: "indirect",
                  severity: 6,
                  confidence: 0.6,
                  causal_chain: ["Tariff raises costs", "Margins compress", "Small operators cannot absorb", "Business closures"],
                  originating_facts: ["fact-4", "fact-6"],
                  // depth 3 child
                  children: [
                    impact({
                      id: "ag-1-1-1-1",
                      title: "Local job losses in craft coffee sector",
                      description: "Estimated 8,000-12,000 jobs at risk in independent roasting and specialty retail.",
                      type: "indirect",
                      is_hidden_factor: true,
                      hidden_factor_category: "Labor Market Shift",
                      severity: 5,
                      confidence: 0.45,
                      causal_chain: ["Tariff", "Cost squeeze", "Small roaster closures", "Job losses in craft sector"],
                      originating_facts: ["fact-6"],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        impact({
          id: "ag-2",
          title: "Shift to domestic coffee alternatives",
          description: "Increased interest in domestically grown coffee from Hawaii and Puerto Rico, though supply is limited.",
          type: "indirect",
          severity: 5,
          confidence: 0.7,
          causal_chain: ["Import costs rise", "Buyers seek domestic alternatives", "Hawaiian/PR coffee demand spikes"],
          originating_facts: ["fact-1", "fact-2"],
        }),
        impact({
          id: "ag-3",
          title: "Latin American farmer income decline",
          description: "Reduced US demand lowers prices paid to coffee farmers in Brazil, Colombia, and Vietnam.",
          type: "indirect",
          severity: 8,
          confidence: 0.8,
          causal_chain: ["Tariff reduces US imports", "Demand drops for exporters", "Farm-gate prices fall"],
          originating_facts: ["fact-2", "fact-5"],
          is_hidden_factor: true,
          hidden_factor_category: "Social Capital",
        }),
        impact({
          id: "ag-4",
          title: "Retaliatory tariffs on US grain exports",
          description: "Latin American nations may impose counter-tariffs on US corn, wheat, and soy exports.",
          type: "indirect",
          severity: 7,
          confidence: 0.55,
          causal_chain: ["US coffee tariff", "Trade tensions escalate", "Retaliatory tariffs on US agriculture"],
          originating_facts: ["fact-8"],
        }),
        impact({
          id: "ag-5",
          title: "Tea and cocoa substitution effect",
          description: "Consumers shift spending toward tea and cocoa beverages as coffee prices rise.",
          type: "indirect",
          severity: 4,
          confidence: 0.65,
          causal_chain: ["Coffee prices rise", "Consumer substitution", "Tea/cocoa demand increases"],
          originating_facts: ["fact-3", "fact-10"],
        }),
        impact({
          id: "ag-6",
          title: "Coffee futures market volatility",
          description: "ICE coffee futures experience sustained volatility, increasing hedging costs for the entire supply chain.",
          type: "direct",
          severity: 7,
          confidence: 0.9,
          causal_chain: ["Tariff announced", "Futures surge 12%", "Sustained volatility"],
          originating_facts: ["fact-7"],
        }),
        impact({
          id: "ag-7",
          title: "Organic certification cost pressure",
          description: "Organic coffee importers face compounded costs from tariff plus certification compliance, threatening the organic segment.",
          type: "indirect",
          severity: 4,
          confidence: 0.5,
          causal_chain: ["Tariff adds 25%", "Organic premium already high", "Combined cost becomes prohibitive"],
          originating_facts: ["fact-1"],
          is_hidden_factor: true,
          hidden_factor_category: "Supply Chain Ripple",
        }),
      ],
    },
    // ---- Energy ----
    {
      name: "Energy",
      icon: "⚡",
      impacts: [
        impact({
          id: "en-1",
          title: "Increased shipping fuel demand",
          description: "Rerouting of coffee supply chains to avoid tariff increases total shipping miles and fuel consumption.",
          type: "indirect",
          severity: 5,
          confidence: 0.6,
          causal_chain: ["Tariff disrupts trade routes", "Supply chains reroute", "Shipping miles increase", "Fuel demand rises"],
          originating_facts: ["fact-1", "fact-2"],
          is_hidden_factor: true,
          hidden_factor_category: "Environmental Debt",
          children: [
            impact({
              id: "en-1-1",
              title: "Carbon emissions from rerouted logistics",
              description: "An estimated 2-4% increase in carbon emissions from coffee-related shipping as routes lengthen.",
              type: "indirect",
              severity: 4,
              confidence: 0.5,
              causal_chain: ["Routes lengthen", "More fuel burned", "CO2 emissions rise"],
              originating_facts: ["fact-2"],
              is_hidden_factor: true,
              hidden_factor_category: "Environmental Debt",
            }),
          ],
        }),
        impact({
          id: "en-2",
          title: "Roasting facility energy costs",
          description: "Domestic roasters running at higher capacity to process remaining imports face increased energy bills.",
          type: "indirect",
          severity: 3,
          confidence: 0.55,
          causal_chain: ["Import volume shifts", "Remaining roasters increase throughput", "Energy consumption rises"],
          originating_facts: ["fact-6"],
        }),
      ],
    },

    // ---- Transport ----
    {
      name: "Transport",
      icon: "🚢",
      impacts: [
        impact({
          id: "tr-1",
          title: "Port volume decline at major coffee hubs",
          description: "Ports like New Orleans, Houston, and New York/New Jersey see reduced coffee container throughput.",
          type: "direct",
          severity: 6,
          confidence: 0.75,
          causal_chain: ["Tariff reduces imports", "Fewer coffee containers", "Port throughput declines"],
          originating_facts: ["fact-5"],
          children: [
            impact({
              id: "tr-1-1",
              title: "Longshoreman hour reductions",
              description: "Reduced container volume leads to fewer shifts for port workers handling coffee imports.",
              type: "indirect",
              severity: 4,
              confidence: 0.55,
              causal_chain: ["Port volume drops", "Less cargo to handle", "Worker hours cut"],
              originating_facts: ["fact-5"],
              is_hidden_factor: true,
              hidden_factor_category: "Labor Market Shift",
            }),
          ],
        }),
        impact({
          id: "tr-2",
          title: "Trucking route restructuring",
          description: "Domestic coffee distribution networks adjust as import points and volumes shift.",
          type: "indirect",
          severity: 3,
          confidence: 0.5,
          causal_chain: ["Import patterns change", "Distribution hubs shift", "Trucking routes restructured"],
          originating_facts: ["fact-1"],
        }),
      ],
    },

    // ---- Finance ----
    {
      name: "Finance",
      icon: "💰",
      impacts: [
        impact({
          id: "fi-1",
          title: "Coffee commodity ETF repricing",
          description: "Exchange-traded funds tracking coffee commodities see significant NAV increases and volatility.",
          type: "direct",
          severity: 7,
          confidence: 0.9,
          causal_chain: ["Tariff announced", "Coffee futures surge", "ETFs reprice"],
          originating_facts: ["fact-7"],
        }),
        impact({
          id: "fi-2",
          title: "Restaurant sector stock pressure",
          description: "Publicly traded coffee chains and restaurant groups face analyst downgrades on margin concerns.",
          type: "indirect",
          severity: 6,
          confidence: 0.7,
          causal_chain: ["Input costs rise", "Margin forecasts cut", "Analyst downgrades", "Stock prices decline"],
          originating_facts: ["fact-3", "fact-4"],
          children: [
            impact({
              id: "fi-2-1",
              title: "Venture capital pullback from coffee startups",
              description: "Early-stage coffee tech and DTC coffee brands see reduced investor interest amid margin uncertainty.",
              type: "indirect",
              severity: 4,
              confidence: 0.45,
              causal_chain: ["Public coffee stocks decline", "Sector sentiment sours", "VC funding slows"],
              originating_facts: ["fact-4"],
              is_hidden_factor: true,
              hidden_factor_category: "Supply Chain Ripple",
            }),
          ],
        }),
        impact({
          id: "fi-3",
          title: "Trade finance cost increase",
          description: "Letters of credit and trade financing for coffee imports become more expensive due to tariff uncertainty.",
          type: "indirect",
          severity: 5,
          confidence: 0.6,
          causal_chain: ["Tariff creates uncertainty", "Banks increase risk premiums", "Trade finance costs rise"],
          originating_facts: ["fact-1"],
        }),
      ],
    },
    // ---- Retail ----
    {
      name: "Retail",
      icon: "🛒",
      impacts: [
        impact({
          id: "re-1",
          title: "Grocery shelf price increases",
          description: "Retail coffee prices projected to rise 15-30% across supermarket brands within 6 months.",
          type: "direct",
          severity: 8,
          confidence: 0.85,
          causal_chain: ["Tariff raises import costs", "Roasters pass costs through", "Retail prices increase"],
          originating_facts: ["fact-3"],
          children: [
            impact({
              id: "re-1-1",
              title: "Consumer downtrading to cheaper brands",
              description: "Shoppers shift from premium to value coffee brands, reshuffling market share.",
              type: "indirect",
              severity: 5,
              confidence: 0.7,
              causal_chain: ["Prices rise", "Budget pressure", "Consumers switch to cheaper options"],
              originating_facts: ["fact-3", "fact-10"],
            }),
          ],
        }),
        impact({
          id: "re-2",
          title: "Café foot traffic decline",
          description: "Independent cafés and coffee shops see 8-15% reduction in customer visits as prices rise.",
          type: "indirect",
          severity: 6,
          confidence: 0.65,
          causal_chain: ["Coffee prices rise", "Café prices increase", "Discretionary visits decline"],
          originating_facts: ["fact-3", "fact-4"],
        }),
        impact({
          id: "re-3",
          title: "Private label coffee growth",
          description: "Supermarket own-brand coffee lines gain market share as consumers seek value.",
          type: "indirect",
          severity: 4,
          confidence: 0.6,
          causal_chain: ["Brand coffee prices rise", "Price gap widens", "Private label gains share"],
          originating_facts: ["fact-3"],
        }),
      ],
    },

    // ---- Health ----
    {
      name: "Health",
      icon: "🏥",
      impacts: [
        impact({
          id: "he-1",
          title: "Reduced caffeine consumption patterns",
          description: "Price-sensitive consumers reduce coffee intake, potentially affecting workplace productivity and alertness.",
          type: "indirect",
          severity: 3,
          confidence: 0.4,
          causal_chain: ["Coffee prices rise", "Some consumers reduce intake", "Caffeine consumption patterns shift"],
          originating_facts: ["fact-3", "fact-10"],
          is_hidden_factor: true,
          hidden_factor_category: "Social Capital",
        }),
        impact({
          id: "he-2",
          title: "Mental health impact on farming communities",
          description: "Income decline for coffee-dependent farming communities in Latin America increases stress and mental health burden.",
          type: "indirect",
          severity: 6,
          confidence: 0.5,
          causal_chain: ["US demand drops", "Farm income falls", "Community economic stress", "Mental health impact"],
          originating_facts: ["fact-2", "fact-5"],
          is_hidden_factor: true,
          hidden_factor_category: "Social Capital",
        }),
      ],
    },

    // ---- Environment ----
    {
      name: "Environment",
      icon: "🌍",
      impacts: [
        impact({
          id: "ev-1",
          title: "Deforestation pressure from alternative crops",
          description: "Coffee farmers facing lower US demand may clear additional land for alternative cash crops.",
          type: "indirect",
          severity: 7,
          confidence: 0.45,
          causal_chain: ["US coffee demand drops", "Farm income falls", "Farmers switch crops", "Land clearing increases"],
          originating_facts: ["fact-2", "fact-5"],
          is_hidden_factor: true,
          hidden_factor_category: "Environmental Debt",
          children: [
            impact({
              id: "ev-1-1",
              title: "Biodiversity loss in coffee-growing regions",
              description: "Shade-grown coffee farms that support bird habitats may be converted to monoculture.",
              type: "indirect",
              severity: 5,
              confidence: 0.35,
              causal_chain: ["Farm income drops", "Shade coffee abandoned", "Habitat conversion", "Biodiversity decline"],
              originating_facts: ["fact-2"],
              is_hidden_factor: true,
              hidden_factor_category: "Environmental Debt",
              children: [
                impact({
                  id: "ev-1-1-1",
                  title: "Pollinator population decline",
                  description: "Loss of shade-grown coffee ecosystems reduces pollinator habitats, affecting broader agricultural productivity.",
                  type: "indirect",
                  severity: 4,
                  confidence: 0.25,
                  causal_chain: ["Shade farms converted", "Habitat lost", "Pollinator populations decline", "Agricultural knock-on effects"],
                  originating_facts: ["fact-2"],
                  is_hidden_factor: true,
                  hidden_factor_category: "Environmental Debt",
                }),
              ],
            }),
          ],
        }),
        impact({
          id: "ev-2",
          title: "Packaging waste from brand switching",
          description: "Consumer brand switching generates transitional packaging waste as inventory rotates.",
          type: "indirect",
          severity: 2,
          confidence: 0.35,
          causal_chain: ["Consumers switch brands", "Old inventory discarded", "Packaging waste increases"],
          originating_facts: ["fact-3"],
        }),
      ],
    },

    // ---- Manufacturing ----
    {
      name: "Manufacturing",
      icon: "🏭",
      impacts: [
        impact({
          id: "ma-1",
          title: "Coffee equipment manufacturer slowdown",
          description: "Reduced roasting activity leads to lower demand for commercial coffee roasting and brewing equipment.",
          type: "indirect",
          severity: 5,
          confidence: 0.55,
          causal_chain: ["Roaster closures", "Equipment demand drops", "Manufacturers see order decline"],
          originating_facts: ["fact-6"],
          children: [
            impact({
              id: "ma-1-1",
              title: "Packaging industry adjustment",
              description: "Coffee packaging suppliers face volume reductions and must diversify or downsize.",
              type: "indirect",
              severity: 4,
              confidence: 0.5,
              causal_chain: ["Less coffee processed domestically", "Packaging orders decline", "Suppliers adjust capacity"],
              originating_facts: ["fact-5", "fact-6"],
            }),
          ],
        }),
        impact({
          id: "ma-2",
          title: "Regulatory compliance burden",
          description: "New tariff documentation and customs compliance requirements increase administrative costs for importers.",
          type: "direct",
          severity: 5,
          confidence: 0.8,
          causal_chain: ["New tariff enacted", "Customs procedures change", "Compliance costs rise"],
          originating_facts: ["fact-1"],
          is_hidden_factor: true,
          hidden_factor_category: "Regulatory Risk",
        }),
      ],
    },
  ],
};

// --- Summary Data ---

export const mockSummaryData: SummaryData = {
  sectors: [
    {
      name: "Agriculture",
      icon: "🌾",
      summary_blurb:
        "Agriculture bears the heaviest direct impact. Coffee bean import costs surge immediately, squeezing domestic roasters and triggering a cascade of substitution effects, farmer income declines, and futures market volatility.",
      worldwide_implications:
        "Global coffee trade worth $460B annually faces restructuring. Brazilian and Colombian farmers lose their largest export market, potentially destabilizing rural economies across Latin America. Retaliatory tariffs could disrupt US grain exports worth $35B.",
      charts: [
        {
          chart_type: "bar",
          title: "Projected Coffee Price Impact by Category",
          labels: ["Green Beans", "Roasted Retail", "Café Beverages", "Instant Coffee", "Specialty Single-Origin"],
          datasets: [
            {
              label: "Price Increase (%)",
              values: [25, 22, 18, 15, 30],
            },
            {
              label: "Volume Decline (%)",
              values: [18, 12, 15, 8, 5],
            },
          ],
        },
        {
          chart_type: "pie",
          title: "US Coffee Import Sources Affected",
          labels: ["Brazil", "Colombia", "Vietnam", "Honduras", "Ethiopia", "Other"],
          datasets: [
            {
              label: "Import Share (%)",
              values: [32, 18, 16, 8, 6, 20],
            },
          ],
        },
      ],
      impacts_summary: [
        {
          title: "Coffee bean import costs surge",
          description: "Direct 25% cost increase on all imported green coffee beans.",
          severity: 9,
        },
        {
          title: "Latin American farmer income decline",
          description: "Reduced US demand lowers prices paid to coffee farmers in exporting nations.",
          severity: 8,
        },
        {
          title: "Coffee futures market volatility",
          description: "ICE coffee futures experience sustained volatility and hedging cost increases.",
          severity: 7,
        },
      ],
    },
    {
      name: "Energy",
      icon: "⚡",
      summary_blurb:
        "Energy impacts are indirect but significant. Rerouted supply chains increase shipping fuel demand, while domestic roasters running at altered capacity face changing energy consumption patterns.",
      worldwide_implications:
        "Global shipping routes for coffee transport add an estimated 15-20% more nautical miles, contributing to increased bunker fuel consumption. This compounds existing pressure on maritime emissions targets set by the IMO.",
      charts: [
        {
          chart_type: "area",
          title: "Projected Shipping Fuel Consumption Change (Monthly)",
          labels: ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"],
          datasets: [
            {
              label: "Baseline (M barrels)",
              values: [2.1, 2.1, 2.1, 2.1, 2.1, 2.1],
            },
            {
              label: "Post-Tariff (M barrels)",
              values: [2.1, 2.25, 2.35, 2.4, 2.38, 2.42],
            },
          ],
        },
      ],
      impacts_summary: [
        {
          title: "Increased shipping fuel demand",
          description: "Rerouted supply chains increase total shipping miles and fuel consumption.",
          severity: 5,
        },
        {
          title: "Carbon emissions from rerouted logistics",
          description: "Estimated 2-4% increase in coffee-related shipping emissions.",
          severity: 4,
        },
      ],
    },
    {
      name: "Transport",
      icon: "🚢",
      summary_blurb:
        "Major US coffee ports face throughput declines as import volumes drop. The ripple effect reaches longshoremen, trucking networks, and warehousing operations tied to coffee logistics.",
      worldwide_implications:
        "Port cities like New Orleans and Houston could see measurable economic impact from reduced coffee container traffic. The broader logistics industry faces route restructuring costs estimated at $200M in the first year.",
      charts: [
        {
          chart_type: "bar",
          title: "Port Volume Impact (Container TEUs, Thousands)",
          labels: ["New Orleans", "Houston", "NY/NJ", "Savannah", "Miami"],
          datasets: [
            {
              label: "Pre-Tariff",
              values: [45, 38, 52, 22, 18],
            },
            {
              label: "Post-Tariff (Projected)",
              values: [37, 31, 44, 19, 15],
            },
          ],
        },
      ],
      impacts_summary: [
        {
          title: "Port volume decline at major coffee hubs",
          description: "Reduced coffee container throughput at key US ports.",
          severity: 6,
        },
        {
          title: "Longshoreman hour reductions",
          description: "Fewer shifts for port workers handling coffee imports.",
          severity: 4,
        },
      ],
    },
    {
      name: "Finance",
      icon: "💰",
      summary_blurb:
        "Financial markets react swiftly to the tariff. Coffee commodity ETFs reprice, restaurant sector stocks face downgrades, and trade finance costs climb as banks adjust risk premiums for coffee-related transactions.",
      worldwide_implications:
        "Global coffee commodity markets worth $25B in daily trading volume face repricing. Emerging market currencies in coffee-exporting nations (BRL, COP, VND) face depreciation pressure, potentially triggering broader EM volatility.",
      charts: [
        {
          chart_type: "line",
          title: "Coffee Futures Price Trajectory ($/lb)",
          labels: ["Week 0", "Week 1", "Week 2", "Week 4", "Week 8", "Week 12"],
          datasets: [
            {
              label: "Arabica Futures",
              values: [1.85, 2.07, 2.15, 2.22, 2.18, 2.25],
            },
            {
              label: "Robusta Futures",
              values: [0.95, 1.06, 1.12, 1.15, 1.1, 1.14],
            },
          ],
        },
        {
          chart_type: "donut",
          title: "Financial Impact Distribution",
          labels: ["ETF Repricing", "Stock Downgrades", "Trade Finance", "VC Pullback", "Insurance Costs"],
          datasets: [
            {
              label: "Impact Share (%)",
              values: [35, 28, 18, 12, 7],
            },
          ],
        },
      ],
      impacts_summary: [
        {
          title: "Coffee commodity ETF repricing",
          description: "Significant NAV increases and volatility in coffee-tracking ETFs.",
          severity: 7,
        },
        {
          title: "Restaurant sector stock pressure",
          description: "Coffee chains and restaurant groups face analyst downgrades.",
          severity: 6,
        },
        {
          title: "Trade finance cost increase",
          description: "Letters of credit and trade financing become more expensive.",
          severity: 5,
        },
      ],
    },
    {
      name: "Retail",
      icon: "🛒",
      summary_blurb:
        "Retail is the consumer-facing front line. Grocery shelf prices climb 15-30%, driving brand switching, café traffic declines, and accelerated growth of private label coffee products.",
      worldwide_implications:
        "US retail coffee market ($48B) faces significant restructuring. Consumer behavior shifts could permanently alter brand loyalty patterns. International coffee chains may redirect supply to non-US markets, affecting global pricing.",
      charts: [
        {
          chart_type: "bar",
          title: "Retail Price Impact by Channel",
          labels: ["Supermarket", "Specialty Stores", "Online/DTC", "Cafés", "Convenience"],
          datasets: [
            {
              label: "Current Avg Price ($)",
              values: [9.5, 16.0, 14.0, 5.5, 3.0],
            },
            {
              label: "Projected Avg Price ($)",
              values: [12.0, 20.5, 17.5, 6.8, 3.7],
            },
          ],
        },
      ],
      impacts_summary: [
        {
          title: "Grocery shelf price increases",
          description: "Retail coffee prices projected to rise 15-30% within 6 months.",
          severity: 8,
        },
        {
          title: "Café foot traffic decline",
          description: "Independent cafés see 8-15% reduction in customer visits.",
          severity: 6,
        },
        {
          title: "Private label coffee growth",
          description: "Supermarket own-brand coffee lines gain market share.",
          severity: 4,
        },
      ],
    },
    {
      name: "Health",
      icon: "🏥",
      summary_blurb:
        "Health impacts are subtle but far-reaching. Changing caffeine consumption patterns affect workplace productivity, while farming communities in exporting nations face increased mental health burdens from economic stress.",
      worldwide_implications:
        "Coffee-dependent communities across 50+ countries face economic disruption. WHO estimates that economic shocks to agricultural communities increase depression and anxiety rates by 15-25%. Workplace productivity losses from reduced caffeine consumption are difficult to quantify but potentially significant.",
      charts: [
        {
          chart_type: "bar",
          title: "Health Impact Severity Assessment",
          labels: ["Caffeine Pattern Shift", "Farming Community Stress", "Workplace Productivity", "Nutrition Access"],
          datasets: [
            {
              label: "Severity (1-10)",
              values: [3, 6, 4, 2],
            },
          ],
        },
      ],
      impacts_summary: [
        {
          title: "Mental health impact on farming communities",
          description: "Income decline increases stress and mental health burden in Latin American farming communities.",
          severity: 6,
        },
        {
          title: "Reduced caffeine consumption patterns",
          description: "Price-sensitive consumers reduce coffee intake, affecting productivity.",
          severity: 3,
        },
      ],
    },
    {
      name: "Environment",
      icon: "🌍",
      summary_blurb:
        "Environmental consequences are among the most hidden impacts. Deforestation pressure, biodiversity loss, and pollinator decline create long-term ecological debt that far outlasts the tariff itself.",
      worldwide_implications:
        "Coffee-growing regions overlap with critical biodiversity hotspots. Conversion of shade-grown coffee farms could accelerate deforestation in the Amazon basin and Central American cloud forests, undermining global carbon sequestration goals.",
      charts: [
        {
          chart_type: "area",
          title: "Projected Deforestation Risk (Hectares, Thousands)",
          labels: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
          datasets: [
            {
              label: "Baseline Deforestation",
              values: [120, 125, 128, 130, 132],
            },
            {
              label: "Post-Tariff Scenario",
              values: [120, 138, 155, 168, 175],
            },
          ],
        },
        {
          chart_type: "pie",
          title: "Environmental Debt Categories",
          labels: ["Deforestation", "Biodiversity Loss", "Carbon Emissions", "Water Usage", "Packaging Waste"],
          datasets: [
            {
              label: "Share of Environmental Impact (%)",
              values: [40, 25, 20, 10, 5],
            },
          ],
        },
      ],
      impacts_summary: [
        {
          title: "Deforestation pressure from alternative crops",
          description: "Coffee farmers may clear additional land for alternative cash crops.",
          severity: 7,
        },
        {
          title: "Biodiversity loss in coffee-growing regions",
          description: "Shade-grown coffee farms supporting bird habitats may be converted.",
          severity: 5,
        },
        {
          title: "Pollinator population decline",
          description: "Loss of shade-grown ecosystems reduces pollinator habitats.",
          severity: 4,
        },
      ],
    },
    {
      name: "Manufacturing",
      icon: "🏭",
      summary_blurb:
        "Manufacturing feels the tariff through reduced equipment demand and increased regulatory compliance costs. Coffee roasting equipment makers and packaging suppliers face order declines as the domestic processing sector contracts.",
      worldwide_implications:
        "Global coffee equipment manufacturing ($8B market) faces demand contraction in its largest market. European and Asian equipment makers may benefit as processing shifts overseas, but the net effect is increased fragmentation and inefficiency.",
      charts: [
        {
          chart_type: "bar",
          title: "Manufacturing Sector Impact",
          labels: ["Roasting Equipment", "Packaging", "Brewing Equipment", "Quality Testing", "Compliance/Admin"],
          datasets: [
            {
              label: "Revenue Impact (%)",
              values: [-15, -12, -8, -5, 20],
            },
          ],
        },
      ],
      impacts_summary: [
        {
          title: "Coffee equipment manufacturer slowdown",
          description: "Reduced roasting activity lowers demand for commercial equipment.",
          severity: 5,
        },
        {
          title: "Regulatory compliance burden",
          description: "New tariff documentation increases administrative costs for importers.",
          severity: 5,
        },
        {
          title: "Packaging industry adjustment",
          description: "Coffee packaging suppliers face volume reductions.",
          severity: 4,
        },
      ],
    },
  ],

  hidden_factors_summary: [
    {
      factor: "Carbon emissions from rerouted coffee logistics",
      category: "Environmental Debt",
      explanation:
        "Rerouting coffee supply chains to circumvent or adjust to the tariff adds 15-20% more shipping miles, increasing bunker fuel consumption and maritime carbon emissions. This environmental cost is invisible in trade policy discussions but compounds global shipping's contribution to climate change.",
    },
    {
      factor: "Deforestation and biodiversity loss in coffee regions",
      category: "Environmental Debt",
      explanation:
        "Reduced US demand pressures coffee farmers to convert shade-grown coffee farms — which serve as critical bird and pollinator habitats — into monoculture cash crops. This creates long-term ecological debt through deforestation, biodiversity loss, and reduced carbon sequestration capacity.",
    },
    {
      factor: "Mental health burden on farming communities",
      category: "Social Capital",
      explanation:
        "Coffee-dependent communities across Latin America face income declines that increase economic stress, depression, and anxiety. The social capital erosion in these communities has generational effects on education, migration patterns, and community cohesion that are never captured in tariff impact assessments.",
    },
    {
      factor: "Latin American farmer income decline",
      category: "Social Capital",
      explanation:
        "Reduced US demand directly lowers farm-gate prices for millions of smallholder coffee farmers in Brazil, Colombia, and Vietnam. This income shock ripples through rural economies, affecting schools, healthcare access, and local businesses far beyond the coffee sector.",
    },
    {
      factor: "Venture capital pullback from coffee startups",
      category: "Supply Chain Ripple",
      explanation:
        "Declining public market valuations for coffee companies create a chilling effect on venture capital investment in coffee tech, DTC brands, and supply chain innovation. This slows the pace of sustainability and efficiency improvements across the entire coffee value chain.",
    },
    {
      factor: "Organic certification cost compounding",
      category: "Supply Chain Ripple",
      explanation:
        "The 25% tariff compounds with existing organic certification premiums, making certified organic coffee imports economically unviable for many importers. This threatens the organic coffee segment and undermines years of investment in sustainable farming practices.",
    },
    {
      factor: "Regulatory compliance cost escalation",
      category: "Regulatory Risk",
      explanation:
        "New tariff documentation, customs procedures, and compliance requirements create a hidden administrative burden estimated at $500M annually across the import sector. Small importers are disproportionately affected, accelerating market consolidation.",
    },
    {
      factor: "Longshoreman and port worker hour reductions",
      category: "Labor Market Shift",
      explanation:
        "Reduced coffee container throughput at major US ports leads to fewer shifts for longshoremen and warehouse workers. These labor market effects are concentrated in port communities already facing automation-driven job displacement.",
    },
    {
      factor: "Craft coffee sector job losses",
      category: "Labor Market Shift",
      explanation:
        "Independent and specialty coffee roasters operating on thin margins face potential closure, putting an estimated 8,000-12,000 jobs at risk. These are often community-anchoring small businesses whose loss has outsized local economic impact.",
    },
  ],

  narrative_summary:
    "The US imposition of a 25% tariff on imported coffee triggers a far-reaching cascade of economic consequences that extends well beyond the immediate price increase at grocery stores. While the direct impact — a 15-30% rise in retail coffee prices — is visible and widely reported, the hidden factors tell a more complex story.\n\nAgriculture bears the heaviest burden, with coffee futures surging 12% and Latin American farming communities facing income declines that threaten rural livelihoods across three continents. The financial sector responds with ETF repricing, stock downgrades for coffee-dependent companies, and tightening trade finance conditions.\n\nPerhaps most concerning are the environmental consequences that may take years to fully materialize: deforestation pressure as farmers seek alternative crops, biodiversity loss in critical shade-grown coffee ecosystems, and increased carbon emissions from rerouted shipping lanes. These environmental debts compound over time and are rarely factored into trade policy decisions.\n\nThe labor market effects — from port worker hour reductions to craft roaster closures — represent a hidden social cost concentrated in communities least equipped to absorb economic shocks. Meanwhile, regulatory compliance costs and supply chain restructuring create friction that reduces overall economic efficiency.\n\nThis analysis reveals that a single trade policy action creates interconnected consequences across at least 8 economic sectors, with hidden factors in every major transparency category. The total economic impact extends far beyond the $12B in direct tariff revenue, touching global supply chains, environmental systems, and human communities in ways that mainstream coverage consistently overlooks.",
};
