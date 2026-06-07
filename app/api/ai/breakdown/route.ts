import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const { taskTitle, taskNotes, roles } = await request.json();

    if (!taskTitle) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const combinedContext = `${taskTitle}\n\n${taskNotes || ""}`.trim();
    const wordCount = combinedContext.split(/\s+/).length;

    if (wordCount < 8) {
      return NextResponse.json({
        error: "thin_context",
        message: "Add more detail in the title or notes for a better AI breakdown."
      });
    }

    const roleContext = roles?.length
      ? `\nThe user works as: ${roles.join(", ")}. Tailor the subtasks to their profession.`
      : "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Falling back to local mock breakdown." },
        { status: 500 }
      );
    }

    const systemInstruction = `
You are CleanDesk's intelligent productivity assistant. Your job is to take a task and its notes, then break it down into 5 to 6 granular, highly actionable subtasks. Use the notes for context and detail.${roleContext}

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
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemInstruction,
    });

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `Task: ${taskTitle}\n\nNotes: ${taskNotes || "No notes provided."}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!responseText) {
      return NextResponse.json({ error: "Empty response received from Gemini API" }, { status: 500 });
    }
    
    const parsedData = JSON.parse(responseText.trim());
    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    const msg = (error as Error).message || "";
    console.error("AI Task Breakdown Error:", msg);
    const friendly = msg.includes("429") || msg.includes("quota")
      ? "AI is rate-limited. Try again in a minute."
      : "Failed to break down this task.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
