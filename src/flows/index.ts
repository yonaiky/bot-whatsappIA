import { createFlow } from "@builderbot/bot";
import infoFlow from "./info";
import openAI from "./openAI";
import _EVENTS from "./EVENTS";
import geminiAI from "./geminiAI";
import contactFlow from "./contact";

export default createFlow([
  openAI,
  infoFlow,
  geminiAI,
  contactFlow,
  ..._EVENTS,
]);
