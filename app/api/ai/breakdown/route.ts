import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const { taskTitle } = await request.json();

    if (!taskTitle) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Falling back to local mock breakdown." },
        { status: 500 }
      );
    }

    const systemInstruction = `
You are CleanDesk's intelligent productivity assistant. Your job is to take a large, complex task and break it down into 5 to 6 granular, highly actionable subtasks.

For example:
Input: "Build Product Marketing Portfolio"
Output JSON:
{
  "subtasks": [
    "Define portfolio sections and layout",
    "Create homepage header and intro copy",
    "Write PMM case studies and results",
    "Create portfolio visuals and screenshots",
    "Deploy portfolio website to Vercel"
  ]
}

Return a strict JSON object with this exact structure:
{
  "subtasks": [
    "Subtask 1",
    "Subtask 2",
    "Subtask 3",
    "Subtask 4",
    "Subtask 5"
  ]
}

Return ONLY the JSON. Do not write other text or wrap in markdown blocks.
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemInstruction,
    });

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: taskTitle }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!responseText) {
      // Return a structured error response instead of throwing to avoid empty output
      return NextResponse.json({ error: "Empty response received from Gemini API" }, { status: 500 });
    }
    
    const parsedData = JSON.parse(responseText.trim());
    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    console.error("AI Task Breakdown Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to breakdown task" }, { status: 500 });
  }
}
