import { addKeyword, EVENTS } from "@builderbot/bot";
import { ChatCompletionMessageParam } from "openai/resources";
import { openAI } from "../services/openai";
import { MemoryDB as Database } from "@builderbot/bot";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import ContactFlow from "./contact";
import infoFlow from "./info";

export default addKeyword<Provider, Database>(EVENTS.WELCOME).addAction(
  async (message, { flowDynamic, state, gotoFlow, provider }) => {
    if (state.get("model") === undefined) {
      await state.update({ model: "openai" });
    }

    const openAIHistory = (state.get("openAIHistory") ??
      []) as ChatCompletionMessageParam[];

    openAIHistory.push({
      role: "user",
      content: message.body,
    });

    const id: string = message.key.remoteJid;
    const determine_context = await openAI.getServiceDetermine(openAIHistory);
    provider.sendPresenceUpdate(id, "composing");

    const username = message.pushName ?? "";
    if (determine_context == "INFO") {
      return gotoFlow(infoFlow);
    }

    if (determine_context == "CONTACTO") {
      await provider.vendor.sendMessage(id, {
        react: {
          text: "❤️",
          key: message.key,
        },
      });
      
      const resp = await openAI.run(username, openAIHistory);
      await flowDynamic(resp);
      return gotoFlow(ContactFlow);
    }

    const ai = await openAI.run(username, openAIHistory);
    const responses = ai.split(/(?<!\d)\.\s+/g);
    for (const resp of responses) {
      await flowDynamic(resp);
    }

    openAIHistory.push({
      role: "assistant",
      content: ai,
    });

    await state.update({
      openAIHistory: openAIHistory,
    });
  }
);
