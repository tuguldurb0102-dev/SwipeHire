import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CandidateProfile {
  id: string;
  name: string;
  age: number;
  category: string;
  years: number;
  salary: number;
  location: string;
  about: string;
  skills?: string[];
  skillTestScore?: number | null;
  skillTestLevel?: string;
}

interface EmployerNeed {
  companyName?: string;
  role?: string;
  location?: string;
  salaryBudget?: number;
  notes?: string;
}

interface RequestBody {
  candidate: CandidateProfile;
  employerNeed?: EmployerNeed;
}

interface GeminiSummary {
  matchScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
  interviewQuestions: string[];
  employerMessageMN: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment variable not set" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { candidate, employerNeed } = body;

    if (!candidate) {
      return new Response(
        JSON.stringify({ error: "candidate is required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const prompt = buildPrompt(candidate, employerNeed);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: "Gemini API error", detail: errText }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let result: GeminiSummary;
    try {
      result = JSON.parse(rawText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response", raw: rawText }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});

function buildPrompt(candidate: CandidateProfile, need?: EmployerNeed): string {
  const emp = need
    ? `Ажил олгогч: ${need.companyName || "тодорхойгүй"}, Хайж буй ажил: ${need.role || candidate.category}, Байршил: ${need.location || "тодорхойгүй"}, Цалингийн хүрээ: ${need.salaryBudget ? need.salaryBudget.toLocaleString() + "₮" : "тодорхойгүй"}. ${need.notes || ""}`
    : `Ажил олгогч тодорхойгүй. Ерөнхий дүгнэлт хий.`;

  return `Та SwipeHire платформын AI ажилтан юм. Монгол ажилчны профайлыг ажил олгогчийн хэрэгцээтэй харьцуулан дүгнэнэ үү.

Нэр дэвшигчийн мэдээлэл:
- Нэр: ${candidate.name}, Нас: ${candidate.age}
- Мэргэжил: ${candidate.category}
- Туршлага: ${candidate.years} жил
- Хүсэж буй цалин: ${candidate.salary.toLocaleString()}₮
- Байршил: ${candidate.location}
- Тухай: ${candidate.about}
- Ур чадварын тестийн оноо: ${candidate.skillTestScore ?? "тестэд ороогүй"}

${emp}

Дараах JSON форматаар хариул (зөвхөн JSON, тайлбар бичихгүй):
{
  "matchScore": <0-100 тоо>,
  "summary": "<2-3 өгүүлбэр Монгол хэлээр нэр дэвшигчийн товч дүгнэлт>",
  "strengths": ["<давуу тал 1>", "<давуу тал 2>", "<давуу тал 3>"],
  "risks": ["<эрсдэл 1>", "<эрсдэл 2>"],
  "interviewQuestions": ["<асуулт 1>", "<асуулт 2>", "<асуулт 3>"],
  "employerMessageMN": "<ажил олгогчид хандсан 1 өгүүлбэр зөвлөмж>"
}`;
}
