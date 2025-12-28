import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { job, applicants } = req.body;

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing");
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const prompt = `
Evaluate the job against multiple candidates.

JOB DETAILS:
Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.requiredSkills?.join(", ")}

APPLICANT RESUMES:
${applicants
  .map(
    (a, i) => `
APPLICANT ${i + 1}
userId: ${a.userId}
resume:
${a.resumeParsedText}
`
  )
  .join("\n")}

TASK:
You MUST return ONLY valid JSON.
NO explanations.
NO markdown.
NO extra text.

Response format must be EXACTLY:

[
  {
    "userId": "...",
    "score": number,
    "selected": boolean
  }
]

Rules:
- score between 0 and 100
- selected true if score >= 70
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You are a strict JSON generator. Output JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    const text = response.choices[0].message.content;

    // ✅ SAFE JSON EXTRACTION
    const match = text.match(/\[[\s\S]*\]/);

    let parsed = [];
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (err) {
        console.error("JSON parse failed after extraction:", match[0]);
      }
    }

    // ✅ FALLBACK (never return garbage)
    if (!parsed.length) {
      parsed = applicants.map(a => ({
        userId: a.userId,
        score: 0,
        selected: false,
      }));
    }

    return res.status(200).json({
      success: true,
      results: parsed,
    });

  } catch (error) {
    console.error("Error in batch analyseApplicant (Groq):", error);

    return res.status(500).json({
      success: false,
      message: "AI error",
    });
  }
}
