import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ vertexai: { project: 'nords-spatial-1776012153', location: 'us-central1' } });
async function run() {
  try {
    const r = await ai.models.generateContent({ model: 'gemini-1.5-flash', contents: 'Hello' });
    console.log(r.text);
  } catch(e) {
    console.error(e);
  }
}
run();
