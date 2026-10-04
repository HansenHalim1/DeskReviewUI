export type Paragraph = { id: string; text: string; heading?: boolean };
export type Finding = {
  id: number;
  severity: "high" | "medium" | "low";
  category: string;
  title: string;
  detail: string;
  suggestion: string;
  paragraph: string;
  quote: string;
};
export type Manuscript = {
  id: string;
  name: string;
  title: string;
  authors: string;
  paragraphs: Paragraph[];
  sample: boolean;
  savedAt?: string;
};

export const sampleManuscript: Manuscript = {
  id: "sample-green-spaces",
  name: "Urban_Green_Spaces_Manuscript.docx",
  title: "The role of urban green spaces in community well-being",
  authors: "Alex Morgan¹, Jamie Chen², and Taylor Williams¹",
  sample: true,
  paragraphs: [
    { id: "abstract-title", text: "Abstract", heading: true },
    {
      id: "abstract",
      text: "Urban green spaces are increasingly recognized as essential components of sustainable cities. This study examines the relationship between access to urban green spaces and community well-being across three metropolitan areas. Using a mixed-methods approach, we surveyed 450 residents and conducted 24 semi-structured interviews. Our findings suggest that proximity to green spaces significantly improves overall well-being. The study contributes to an emerging understanding of how urban environments shape everyday quality of life.",
    },
    {
      id: "keywords",
      text: "Keywords: urban green spaces; community well-being; urban planning; public health",
    },
    { id: "introduction-title", text: "1. Introduction", heading: true },
    {
      id: "introduction",
      text: "As cities continue to grow, the quality of urban life has become a central concern for researchers and policymakers alike. More than half of the global population now lives in urban areas, a proportion projected to increase in the coming decades (United Nations, 2022). Within this context, green spaces offer a valuable opportunity to support healthier, more connected communities.",
    },
    {
      id: "gap",
      text: "Previous research has established links between green space exposure and physical health outcomes (Kuo, 2015; Hartig et al., 2014). However, few studies have explored these relationships in a comprehensive way. The social and psychological dimensions of green space access remain less clearly understood, particularly across neighborhoods with different socioeconomic characteristics.",
    },
    {
      id: "aim",
      text: "This study addresses this gap by investigating how access to urban green spaces relates to self-reported well-being. Specifically, we examine the roles of proximity, frequency of use, and perceived quality, while considering the influence of neighborhood context.",
    },
    { id: "methods-title", text: "2. Materials and methods", heading: true },
    {
      id: "design-title",
      text: "2.1. Study design and participants",
      heading: true,
    },
    {
      id: "methods",
      text: "We employed a convergent mixed-methods design, combining a cross-sectional survey with qualitative interviews. Participants were recruited through community organizations and online platforms in three metropolitan areas. A total of 450 adults aged 18–75 completed the survey between March and June 2025. Participants were selected using convenience sampling to ensure a diverse sample.",
    },
    {
      id: "measures",
      text: "Well-being was measured using the WHO-5 Well-Being Index. Green space access was assessed using self-reported walking distance to the nearest public park. Survey responses were analyzed using multiple linear regression, controlling for age, income, and educational attainment.",
    },
    { id: "results-title", text: "3. Results", heading: true },
    {
      id: "results",
      text: "Participants who reported living within a ten-minute walk of a green space had higher average well-being scores. The association remained statistically significant after adjusting for demographic characteristics (β = 0.24, p < 0.01). Frequent use of green spaces was also associated with stronger perceived social connection.",
    },
    { id: "discussion-title", text: "4. Discussion", heading: true },
    {
      id: "discussion",
      text: "These results demonstrate that green spaces cause improvements in mental health and social connection. They support the integration of accessible green infrastructure into urban planning. Future work should explore these relationships over time and in a wider range of urban contexts.",
    },
    { id: "references-title", text: "References", heading: true },
    {
      id: "references",
      text: "Hartig, T., Mitchell, R., de Vries, S., & Frumkin, H. (2014). Nature and health. Annual Review of Public Health, 35, 207–228.\nKuo, M. (2015). How might contact with nature promote human health? Frontiers in Psychology, 6, 1093.\nUnited Nations. (2022). World Urbanization Prospects.",
    },
  ],
};

export const findings: Finding[] = [
  {
    id: 1,
    severity: "high",
    category: "Methodology",
    title: "Clarify the sampling approach",
    detail:
      "Convenience sampling does not ensure a representative or diverse sample. The current wording overstates what the recruitment method can establish.",
    suggestion:
      "Describe recruitment channels and inclusion criteria, report the sample demographics, and acknowledge potential selection bias.",
    paragraph: "methods",
    quote:
      "Participants were selected using convenience sampling to ensure a diverse sample.",
  },
  {
    id: 2,
    severity: "high",
    category: "Interpretation",
    title: "Distinguish association from causation",
    detail:
      "A cross-sectional design cannot establish that green spaces cause changes in mental health. This conclusion goes beyond the evidence presented.",
    suggestion:
      "Replace causal language with association language and discuss alternative explanations and the need for longitudinal research.",
    paragraph: "discussion",
    quote:
      "These results demonstrate that green spaces cause improvements in mental health and social connection.",
  },
  {
    id: 3,
    severity: "medium",
    category: "Clarity",
    title: "Make the abstract more specific",
    detail:
      "The abstract describes a significant improvement without reporting the size of the observed association or its uncertainty.",
    suggestion:
      "Include the main effect estimate, a confidence interval, and a brief statement of the study’s cross-sectional limitation.",
    paragraph: "abstract",
    quote:
      "Our findings suggest that proximity to green spaces significantly improves overall well-being.",
  },
  {
    id: 4,
    severity: "medium",
    category: "Literature",
    title: "Define the research gap",
    detail:
      "The phrase ‘in a comprehensive way’ leaves the specific gap in existing research unclear.",
    suggestion:
      "Explain which social or psychological outcomes prior studies did not address, with supporting references.",
    paragraph: "gap",
    quote:
      "However, few studies have explored these relationships in a comprehensive way.",
  },
  {
    id: 5,
    severity: "medium",
    category: "Reporting",
    title: "Report confidence intervals",
    detail:
      "The regression result includes a coefficient and p-value, but no confidence interval.",
    suggestion:
      "Report the 95% confidence interval and clarify whether the coefficient is standardized.",
    paragraph: "results",
    quote: "β = 0.24, p < 0.01",
  },
  {
    id: 6,
    severity: "medium",
    category: "Methodology",
    title: "Explain the qualitative analysis",
    detail:
      "The mixed-methods design is introduced, but the interview analysis and integration strategy need more detail.",
    suggestion:
      "Describe coding, researcher involvement, and how qualitative themes were combined with the survey results.",
    paragraph: "methods",
    quote: "We employed a convergent mixed-methods design",
  },
  {
    id: 7,
    severity: "low",
    category: "References",
    title: "Check the population reference",
    detail:
      "Verify that the cited United Nations publication supports the population projection used in the introduction.",
    suggestion:
      "Check the publication year and add the relevant report edition or table.",
    paragraph: "introduction",
    quote: "United Nations, 2022",
  },
  {
    id: 8,
    severity: "low",
    category: "Style",
    title: "Tighten the opening sentence",
    detail:
      "The introductory sentence can be more direct without changing its meaning.",
    suggestion:
      "Consider: ‘Rapid urban growth has made quality of life a priority for researchers and policymakers.’",
    paragraph: "introduction",
    quote:
      "As cities continue to grow, the quality of urban life has become a central concern for researchers and policymakers alike.",
  },
];

export const reviewSummary =
  "This manuscript addresses a timely and relevant question, with a clear structure and a promising mixed-methods approach. The main opportunities are to strengthen methodological transparency and bring the conclusions into closer alignment with the evidence. A focused revision would make the contribution considerably clearer.";
