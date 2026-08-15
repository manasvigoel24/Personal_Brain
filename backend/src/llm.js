import dotenv from "dotenv";
dotenv.config();

function isOAuthToken(key) {
  return key.startsWith("ya29.");
}

export async function callLLM(systemPrompt, userPrompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (GEMINI_API_KEY) {
    return await callGeminiLLM(systemPrompt, userPrompt, GEMINI_API_KEY);
  }

  if (OPENAI_API_KEY) {
    return await callOpenAILLM(systemPrompt, userPrompt, OPENAI_API_KEY);
  }

  throw new Error(
    "Missing LLM API key. Please add GEMINI_API_KEY or OPENAI_API_KEY to backend/.env"
  );
}

async function callGeminiLLM(systemPrompt, userPrompt, apiKey) {
  const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const headers = {
    "Content-Type": "application/json",
  };

  if (isOAuthToken(apiKey)) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else {
    headers["x-goog-api-key"] = apiKey;
  }

  const body = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}\n\n${userPrompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    console.error("Gemini network error:", networkErr);
    throw new Error(`Gemini network error: ${networkErr.message}`);
  }

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini API error:", JSON.stringify(data, null, 2));
    if (response.status === 401) {
      throw new Error(
        `Gemini auth error (401): The GEMINI_API_KEY is invalid or expired. ` +
          `Get a fresh key from https://aistudio.google.com/app/apikey`
      );
    }
    throw new Error(
      `Gemini API error ${response.status}: ${JSON.stringify(data)}`
    );
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error(
      "Gemini returned no text. Full response:",
      JSON.stringify(data, null, 2)
    );
    return "";
  }

  return text.trim();
}

async function callOpenAILLM(systemPrompt, userPrompt, OPENAI_API_KEY) {
  const OPENAI_API_URL =
    process.env.OPENAI_API_URL ||
    "https://api.openai.com/v1/chat/completions";

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenAI Error:", JSON.stringify(data, null, 2));
    throw new Error(`OpenAI Error ${response.status}: ${JSON.stringify(data)}`);
  }

  return data?.choices?.[0]?.message?.content?.trim() || "";
}