import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const { prompt, roles } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const roleContext = roles?.length
      ? `\nThe user works as: ${roles.join(", ")}. Tailor the suggested projects and tasks to their profession.`
      : "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Falling back to local mock parser." },
        { status: 500 }
      );
    }

    const systemInstruction = `
You are CleanDesk's intelligent productivity assistant. Your job is to parse unstructured notes, brain dumps, or speech-to-text transcripts into a structured project and task layout.${roleContext}

Output a strict JSON object with this exact structure:
{
  "projects": [
    { "title": "Project Name", "description": "Brief description of the project" }
  ],
  "tasks": [
    { "title": "Task Title", "project_title": "Matching Project Name from the projects array or 'General Desk'", "priority": "High" | "Medium" | "Low", "due_date": "YYYY-MM-DD" }
  ]
}

Guidelines:
1. Identify high-level grouping containers and add them to the "projects" array. Keep projects lightweight (e.g. "Product Launch", "Client Website", "Content Strategy").
2. Extract specific, actionable tasks and link them to their corresponding project via "project_title". If a task doesn't belong to any project, use "General Desk".
3. Evaluate the priority ("High", "Medium", "Low") based on urgency words in the input.
4. Estimate due dates if mentioned (e.g., "by tomorrow", "Friday morning", "June 15"). If no date is mentioned, use today's date (${new Date().toISOString().split("T")[0]}).
5. Return ONLY the JSON object. Do not include markdown wraps (like \`\`\`json) or other text.
`;

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.0-flash and pass systemInstruction
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!responseText) {
      // Return a structured error response instead of throwing to avoid empty output
      return NextResponse.json({ error: "Empty response received from Gemini API" }, { status: 500 });
    }
    
    const parsedData = JSON.parse(responseText.trim());
    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    console.error("AI Brain Dump Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to parse text" }, { status: 500 });
  }
}
