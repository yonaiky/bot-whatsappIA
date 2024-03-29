import { addKeyword, EVENTS } from "@builderbot/bot";
import { Content } from "@google/generative-ai/dist/types/content";
import { Gemini } from "../services/gemini";
import { MemoryDB as Database } from "@builderbot/bot";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import path from "path";
import fs from "fs/promises";

const documentsFolder = (dirs: string[] = []) =>
  path.join(process.cwd(), "src", "documents", ...dirs);

export default addKeyword<Provider, Database>(["hey"])
  .addAnswer("Hazme una pregunta acerca del documento.", { capture: true })
  .addAction(
    async (message, { flowDynamic, state, provider, fallBack, endFlow }) => {
     

      const geminiHistory = (state.getMyState()?.geminiHistory ??
        []) as Content[];

      const id: string = message.key.remoteJid;

      provider.sendPresenceUpdate(id, "composing");
      // const username = message.pushName ?? "";
      const data = await fs.readFile(`${documentsFolder([id])}.txt`, "utf-8");
      const documentText = data.replace(/\n+/g, "\n").trim();
      const ai = await Gemini.run(documentText, geminiHistory, message.body);

      if (ai =="CANCELAR"){
          return endFlow("De acuerdo.");
      }
      geminiHistory.push({
        role: "user",
        parts: [{ text: message.body }],
      });

      const responses = ai.split(/(?<!\d)\.\s+/g);

      for (const resp of responses) {
        await flowDynamic(resp);
      }

      geminiHistory.push({
        role: "model",
        parts: [{ text: ai }],
      });

      await state.update({
        geminiHistory: geminiHistory,
      });

      return fallBack();
    }
  );
